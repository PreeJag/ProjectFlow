import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import ProjectManager from "../models/ProjectManager.js";
import TeamMember from "../models/TeamMember.js";

// Map role -> Mongoose model (separate collection per role)
const MODEL_BY_ROLE = {
  admin: Admin,
  project_manager: ProjectManager,
  team_member: TeamMember,
};

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Not authorized to access this route",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Load user from its role-specific collection
      const Model = MODEL_BY_ROLE[decoded.role];
      if (!Model) {
        return res.status(401).json({
          success: false,
          error: "Invalid token role",
        });
      }

      req.user = await Model.findById(decoded.id);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "User no longer exists",
        });
      }

      // Attach the role from the token so controllers know the collection
      req.user.role = decoded.role;

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: "Token is invalid or expired",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error in authentication",
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};
