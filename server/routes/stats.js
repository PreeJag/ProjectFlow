import express from "express";
import Admin from "../models/Admin.js";
import ProjectManager from "../models/ProjectManager.js";
import TeamMember from "../models/TeamMember.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// @desc    Get dashboard statistics
// @route   GET /api/stats
// @access  Private (admin)
router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const [
      adminCount,
      projectManagerCount,
      teamMemberCount,
      projectCount,
      taskCount,
      overdueTaskCount,
    ] = await Promise.all([
      Admin.countDocuments(),
      ProjectManager.countDocuments(),
      TeamMember.countDocuments(),
      Project.countDocuments(),
      Task.countDocuments(),
      Task.countDocuments({
        status: { $ne: "done" },
        due_date: { $lt: new Date(), $exists: true },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        users: adminCount + projectManagerCount + teamMemberCount,
        admins: adminCount,
        projectManagers: projectManagerCount,
        teamMembers: teamMemberCount,
        projects: projectCount,
        tasks: taskCount,
        overdueTasks: overdueTaskCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
