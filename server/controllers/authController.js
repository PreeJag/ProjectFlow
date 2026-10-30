import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import Admin from "../models/Admin.js";
import ProjectManager from "../models/ProjectManager.js";
import TeamMember from "../models/TeamMember.js";

// Map role -> Mongoose model (separate collection per role)
const MODEL_BY_ROLE = {
  admin: Admin,
  project_manager: ProjectManager,
  team_member: TeamMember,
};

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Find a user by email across all role collections
const findUserByEmail = async (email) => {
  const [admin, projectManager, teamMember] = await Promise.all([
    Admin.findOne({ email }).select("+password"),
    ProjectManager.findOne({ email }).select("+password"),
    TeamMember.findOne({ email }).select("+password"),
  ]);

  if (admin) return { user: admin, role: "admin" };
  if (projectManager) return { user: projectManager, role: "project_manager" };
  if (teamMember) return { user: teamMember, role: "team_member" };
  return { user: null, role: null };
};

// Find a user by id within its role collection
const findUserByIdAndRole = async (id, role) => {
  const Model = MODEL_BY_ROLE[role];
  if (!Model) return null;
  return Model.findById(id).select("+password");
};

// @desc    Register new user (public, defaults to team_member)
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { email, password, fullName, role } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: "Please provide email, password, and full name",
      });
    }

    const targetRole = role || "team_member";

    if (!["admin", "project_manager", "team_member"].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        error: "Invalid role. Must be admin, project_manager, or team_member",
      });
    }

    // Admin accounts can only be created via the seed script (only one admin allowed)
    if (targetRole === "admin") {
      return res.status(403).json({
        success: false,
        error: "Admin accounts cannot be created via public registration",
      });
    }

    // Check if user already exists in any collection
    const existingUser = await findUserByEmail(email);
    if (existingUser.user) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    // Create user in the corresponding collection
    const Model = MODEL_BY_ROLE[targetRole];
    const user = await Model.create({
      email,
      password,
      fullName,
    });

    // Generate token
    const token = generateToken(user._id, targetRole);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: targetRole,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
    }

    // Check for user across all collections and include password for comparison
    const { user, role } = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id, role);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a Project Manager (admin only)
// @route   POST /api/auth/project-managers
// @access  Private/Admin
export const createProjectManager = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: "Please provide email, password, and full name",
      });
    }

    // Check if user already exists in any collection
    const existingUser = await findUserByEmail(email);
    if (existingUser.user) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    // Create project manager in the project_managers collection
    const projectManager = await ProjectManager.create({
      email,
      password,
      fullName,
      createdBy: req.user.id,
      createdByModel: req.user.role,
    });

    res.status(201).json({
      success: true,
      message: "Project Manager created. Share the email and password with the project manager.",
      projectManager: {
        id: projectManager._id,
        email: projectManager.email,
        fullName: projectManager.fullName,
        role: "project_manager",
        password, // plaintext only in creation response so the admin can share it
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a Team Member (project manager or admin)
// @route   POST /api/auth/team-members
// @access  Private/ProjectManager, Admin
export const createTeamMember = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: "Please provide email, password, and full name",
      });
    }

    // Check if user already exists in any collection
    const existingUser = await findUserByEmail(email);
    if (existingUser.user) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    // Create team member in the team_members collection
    const teamMember = await TeamMember.create({
      email,
      password,
      fullName,
      createdBy: req.user.id,
      createdByModel: req.user.role,
    });

    res.status(201).json({
      success: true,
      message:
        "Team Member created. Share the email and password with the team member so they can sign in.",
      teamMember: {
        id: teamMember._id,
        email: teamMember.email,
        fullName: teamMember.fullName,
        role: "team_member",
        mustChangePassword: true,
        password, // plaintext only in creation response so it can be shared
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password on first login
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Please provide current password, new password, and confirm password",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "New password and confirm password do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters",
      });
    }

    const user = await findUserByIdAndRole(req.user.id, req.user.role);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User no longer exists",
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    const Model = MODEL_BY_ROLE[req.user.role];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await Model.findByIdAndUpdate(
      req.user.id,
      { password: hashedPassword, mustChangePassword: false },
      { runValidators: true },
    );

    const token = generateToken(user._id, req.user.role);

    res.json({
      success: true,
      message: "Password changed successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: req.user.role,
        mustChangePassword: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password - send OTP to email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const { user, role } = await findUserByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return res.json({
        success: true,
        message: "If an account exists with this email, an OTP has been sent",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetPasswordExpires = Date.now() + 600000; // 10 minutes

    user.resetPasswordToken = otp;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

    // Send email with OTP
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "localhost",
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 1025,
        secure: process.env.SMTP_SECURE === "true",
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@projectflow.local",
        to: user.email,
        subject: "ProjectFlow - Password Reset OTP",
        html: `
          <h2>Password Reset OTP</h2>
          <p>You requested a password reset for your ProjectFlow account.</p>
          <p>Your OTP is: <strong>${otp}</strong></p>
          <p>This OTP expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        `,
      });
    } catch (mailError) {
      console.error("Email send failed:", mailError.message);
      // In development, log the OTP so it can be used directly
      console.log("OTP (dev):", otp, "for", user.email);
    }

    res.json({
      success: true,
      message: "If an account exists with this email, an OTP has been sent",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password with OTP and new password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { otp, password, confirmPassword } = req.body;

    if (!otp || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "OTP, new password, and confirm password are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "New password and confirm password do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    // Find user by valid OTP
    const [admin, projectManager, teamMember] = await Promise.all([
      Admin.findOne({
        resetPasswordToken: otp,
        resetPasswordExpires: { $gt: Date.now() },
      }),
      ProjectManager.findOne({
        resetPasswordToken: otp,
        resetPasswordExpires: { $gt: Date.now() },
      }),
      TeamMember.findOne({
        resetPasswordToken: otp,
        resetPasswordExpires: { $gt: Date.now() },
      }),
    ]);

    const user = admin || projectManager || teamMember;
    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired OTP",
      });
    }

    // Hash new password and clear OTP
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.mustChangePassword = false;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Project Managers (admin only)
// @route   GET /api/auth/project-managers
// @access  Private/Admin
export const getProjectManagers = async (req, res, next) => {
  try {
    const projectManagers = await ProjectManager.find().select("-password").sort({ createdAt: -1 });

    res.json({
      success: true,
      projectManagers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Team Members (admin sees all, project managers see their own)
// @route   GET /api/auth/team-members
// @access  Private/Admin, ProjectManager
export const getTeamMembers = async (req, res, next) => {
  try {
    const filter = req.user.role === "admin" ? {} : { createdBy: req.user.id };
    const teamMembers = await TeamMember.find(filter).select("-password").sort({ createdAt: -1 });

    res.json({
      success: true,
      teamMembers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a Project Manager (admin only)
// @route   DELETE /api/auth/project-managers/:id
// @access  Private/Admin
export const deleteProjectManager = async (req, res, next) => {
  try {
    const projectManager = await ProjectManager.findById(req.params.id);
    if (!projectManager) {
      return res.status(404).json({
        success: false,
        error: "Project Manager not found",
      });
    }

    await ProjectManager.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Project Manager deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a Team Member (admin only)
// @route   DELETE /api/auth/team-members/:id
// @access  Private/Admin
export const deleteTeamMember = async (req, res, next) => {
  try {
    const teamMember = await TeamMember.findById(req.params.id);
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        error: "Team Member not found",
      });
    }

    await TeamMember.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Team Member deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await findUserByIdAndRole(req.user.id, req.user.role);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User no longer exists",
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: req.user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    // In a JWT-based system, logout is handled client-side by removing the token
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
