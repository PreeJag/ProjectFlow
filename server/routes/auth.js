import express from "express";
import {
  register,
  login,
  getMe,
  logout,
  createProjectManager,
  createTeamMember,
  changePassword,
  getProjectManagers,
  getTeamMembers,
  deleteProjectManager,
  deleteTeamMember,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Admin-only: create and list project managers / team members
router.post("/project-managers", protect, authorize("admin"), createProjectManager);
router.get("/project-managers", protect, authorize("admin"), getProjectManagers);
router.delete("/project-managers/:id", protect, authorize("admin"), deleteProjectManager);
// Project Managers (and admins) can create and list Team Members
router.post("/team-members", protect, authorize("admin", "project_manager"), createTeamMember);
router.get("/team-members", protect, authorize("admin", "project_manager"), getTeamMembers);
router.delete("/team-members/:id", protect, authorize("admin"), deleteTeamMember);

// Protected routes
router.get("/me", protect, getMe);
router.post("/change-password", protect, changePassword);
router.post("/logout", protect, logout);

export default router;
