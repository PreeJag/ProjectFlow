import express from "express";
import Task from "../models/Task.js";
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

// @desc    Get all tasks (with optional filters)
// @route   GET /api/tasks
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { project_id, assignee_id, status } = req.query;
    const filter = {};

    if (project_id) filter.project_id = project_id;
    if (assignee_id) filter.assignee_id = assignee_id;
    if (status) filter.status = status;

    // Non-admin users see only tasks they're assigned to or on projects they own/join
    if (req.user.role !== "admin") {
      const userProjects = await Project.find({
        $or: [{ owner_id: req.user.id }, { "members.user_id": req.user.id }],
      }).select("_id");
      const projectIds = userProjects.map((p) => p._id);
      filter.$or = [{ assignee_id: req.user.id }, { project_id: { $in: projectIds } }];
      delete filter.assignee_id; // avoid conflict with $or
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private (admin, project_manager)
router.post("/", protect, authorize("admin", "project_manager"), async (req, res) => {
  try {
    const { project_id, title, description, status, due_date, assignee_id } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({
        success: false,
        error: "Project and title are required",
      });
    }

    const project = await Project.findById(project_id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    const task = await Task.create({
      project_id,
      title,
      description: description || null,
      status: status || "todo",
      due_date: due_date || null,
      assignee_id: assignee_id || undefined,
      assigneeModel: assignee_id ? req.user.role : undefined,
    });

    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
router.put("/:id", protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    const { title, description, status, due_date, assignee_id } = req.body;

    // Team member drag-and-drop restrictions
    if (req.user.role === "team_member" && status !== undefined && status !== task.status) {
      const currentStatus = task.status;
      const isAssignee = task.assignee_id && task.assignee_id.toString() === req.user.id;

      // Team members can only move TO DO -> DRAFTING (become assignee) or DRAFTING -> IN REVIEW
      if (currentStatus === "todo" && status === "drafting") {
        // Taking the task: assign to self
        task.assignee_id = req.user.id;
        task.assigneeModel = "team_member";
      } else if (currentStatus === "drafting" && status === "review") {
        // Moving to review: must be current assignee
        if (!isAssignee) {
          return res.status(403).json({
            success: false,
            error: "Only the assigned team member can move this task to In Review",
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: "Team members can only move tasks from To Do to Drafting, or Drafting to In Review",
        });
      }
    }

    // Only assignee, project owner, or admin can update
    const isAssignee = task.assignee_id && task.assignee_id.toString() === req.user.id;
    if (req.user.role !== "admin" && !isAssignee && req.user.role !== "project_manager") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this task",
      });
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (due_date !== undefined) task.due_date = due_date;
    if (assignee_id !== undefined) task.assignee_id = assignee_id;

    await task.save();
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private (admin or task owner)
router.delete("/:id", protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    const isAssignee = task.assignee_id.toString() === req.user.id;
    if (req.user.role !== "admin" && !isAssignee) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this task",
      });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
