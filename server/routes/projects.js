import express from "express";
import Project from "../models/Project.js";
import Admin from "../models/Admin.js";
import ProjectManager from "../models/ProjectManager.js";
import TeamMember from "../models/TeamMember.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

const MODEL_BY_ROLE = {
  admin: Admin,
  project_manager: ProjectManager,
  team_member: TeamMember,
};

// Auto-generate project key from name (uppercase initials, max 10 chars)
const generateProjectKey = (name) => {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let key = words.map((w) => w.charAt(0).toUpperCase()).join("");
  if (key.length === 0) key = "PROJ";
  if (key.length > 10) key = key.substring(0, 10);
  key = key.replace(/[^A-Z0-9_]/g, "");
  return key;
};

// Ensure unique project key by appending a number if needed
const uniqueProjectKey = async (baseKey) => {
  let key = baseKey;
  let counter = 1;
  while (await Project.findOne({ key })) {
    key = `${baseKey}${counter}`;
    counter += 1;
    if (key.length > 10) key = baseKey.substring(0, 10 - counter.toString().length) + counter;
  }
  return key;
};

// Resolve owner/member display info
const resolveUser = async (userId, userModel) => {
  const Model = MODEL_BY_ROLE[userModel];
  if (!Model) return null;
  const user = await Model.findById(userId).select("-password");
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    role: userModel,
  };
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const query = Project.find().sort({ createdAt: -1 });

    // Non-admin users see only projects they own or are members of
    if (req.user.role !== "admin") {
      query.or([{ owner_id: req.user.id }, { "members.user_id": req.user.id }]);
    }

    const projects = await query;
    const projectsWithId = projects.map((p) => ({
      ...(p.toObject ? p.toObject() : p),
      id: p._id,
    }));
    res.json({ success: true, projects: projectsWithId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Get single project with members
// @route   GET /api/projects/:id
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    // Authorization: admin, owner, or member
    const isMember = project.members.some((m) => m.user_id.toString() === req.user.id);
    if (req.user.role !== "admin" && project.owner_id.toString() !== req.user.id && !isMember) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to view this project",
      });
    }

    // Resolve member details
    const memberDetails = await Promise.all(
      project.members.map(async (m) => {
        const user = await resolveUser(m.user_id, m.userModel);
        return {
          id: m._id,
          user_id: m.user_id,
          userModel: m.userModel,
          role: m.role,
          joined_at: m.joined_at,
          ...(user ? { email: user.email, fullName: user.fullName, role: user.role } : {}),
        };
      }),
    );

    res.json({
      success: true,
      project: {
        ...project.toObject(),
        id: project._id,
        members: memberDetails,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Create a project
// @route   POST /api/projects
// @access  Private (admin, project_manager)
router.post("/", protect, authorize("admin", "project_manager"), async (req, res) => {
  try {
    const { name, description, startDate, endDate, memberEmails } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Project name is required",
      });
    }

    // Build initial members: owner is always first
    const members = [
      {
        user_id: req.user.id,
        userModel: req.user.role,
        role: "owner",
        joined_at: new Date(),
      },
    ];

    // If member emails provided (project managers can only add their own team members)
    if (memberEmails && Array.isArray(memberEmails) && memberEmails.length > 0) {
      if (req.user.role !== "admin" && req.user.role !== "project_manager") {
        return res.status(403).json({
          success: false,
          error: "Only admins or project managers can add project members",
        });
      }

      for (const email of memberEmails) {
        if (!email) continue;
        let foundUser = null;
        for (const [role, Model] of Object.entries(MODEL_BY_ROLE)) {
          const user = await Model.findOne({ email }).select("-password");
          if (user) {
            foundUser = { user, role };
            break;
          }
        }

        if (!foundUser) {
          return res.status(400).json({
            success: false,
            error: `User not found with email: ${email}`,
          });
        }

        // Project managers can only add team members they created themselves
        if (req.user.role === "project_manager") {
          if (foundUser.role !== "team_member") {
            return res.status(403).json({
              success: false,
              error: "Project managers can only add team members to projects",
            });
          }
          if (foundUser.user.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
              success: false,
              error: `You can only add team members you created: ${email}`,
            });
          }
        }

        // Avoid duplicates
        const alreadyMember = members.some(
          (m) => m.user_id.toString() === foundUser.user._id.toString(),
        );
        if (alreadyMember) continue;

        members.push({
          user_id: foundUser.user._id,
          userModel: foundUser.role,
          role: "member",
          joined_at: new Date(),
        });
      }
    }

    // Auto-generate unique project key from name
    const key = await uniqueProjectKey(generateProjectKey(name));

    const project = await Project.create({
      key,
      name,
      description: description || null,
      owner_id: req.user.id,
      ownerModel: req.user.role,
      start_date: startDate || null,
      end_date: endDate || null,
      members,
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "A project with this key already exists",
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private (owner or admin)
router.put("/:id", protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    const isOwner = project.owner_id.toString() === req.user.id;
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this project",
      });
    }

    const { name, description, startDate, endDate } = req.body;
    project.name = name || project.name;
    project.description = description !== undefined ? description : project.description;
    project.start_date = startDate || project.start_date;
    project.end_date = endDate || project.end_date;

    await project.save();
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private (owner or admin)
router.delete("/:id", protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    const isOwner = project.owner_id.toString() === req.user.id;
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this project",
      });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Add a member to a project
// @route   POST /api/projects/:id/members
// @access  Private (owner or admin)
router.post("/:id/members", protect, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    const isOwner = project.owner_id.toString() === req.user.id;
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to add members to this project",
      });
    }

    // Find user across all collections
    let foundUser = null;
    for (const [role, Model] of Object.entries(MODEL_BY_ROLE)) {
      const user = await Model.findOne({ email }).select("-password");
      if (user) {
        foundUser = { user, role };
        break;
      }
    }

    if (!foundUser) {
      return res.status(404).json({ success: false, error: "User not found with this email" });
    }

    // A project manager can only add team members they created themselves
    if (req.user.role === "project_manager") {
      if (foundUser.role !== "team_member") {
        return res.status(403).json({
          success: false,
          error: "Project managers can only add team members to their projects",
        });
      }
      if (foundUser.user.createdBy.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "You can only add team members that you created",
        });
      }
    }

    const alreadyMember = project.members.some(
      (m) => m.user_id.toString() === foundUser.user._id.toString(),
    );
    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        error: "This user is already a member of the project",
      });
    }

    project.members.push({
      user_id: foundUser.user._id,
      userModel: foundUser.role,
      role: "member",
      joined_at: new Date(),
    });
    await project.save();

    res.status(201).json({ success: true, message: "Member added successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Remove a member from a project
// @route   DELETE /api/projects/:id/members/:memberId
// @access  Private (owner or admin)
router.delete("/:id/members/:memberId", protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    const isOwner = project.owner_id.toString() === req.user.id;
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to remove members from this project",
      });
    }

    project.members = project.members.filter((m) => m._id.toString() !== req.params.memberId);
    await project.save();

    res.json({ success: true, message: "Member removed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
