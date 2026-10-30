import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Project key is required"],
      uppercase: true,
      trim: true,
      maxLength: [10, "Project key must be 10 characters or less"],
      match: [
        /^[A-Z0-9_]+$/,
        "Project key must be uppercase letters, numbers, and underscores only",
      ],
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxLength: [200, "Project name is too long"],
    },
    description: {
      type: String,
      trim: true,
      maxLength: [2000, "Description is too long"],
      default: null,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "ownerModel",
    },
    ownerModel: {
      type: String,
      required: true,
      enum: ["admin", "project_manager", "team_member"],
    },
    start_date: {
      type: Date,
      default: null,
    },
    end_date: {
      type: Date,
      default: null,
    },
    members: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: "members.$.userModel",
        },
        userModel: {
          type: String,
          required: true,
          enum: ["admin", "project_manager", "team_member"],
        },
        role: {
          type: String,
          enum: ["owner", "member"],
          default: "member",
        },
        joined_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

projectSchema.index({ key: 1 }, { unique: true });
projectSchema.index({ owner_id: 1 });

export default mongoose.model("Project", projectSchema, "projects");
