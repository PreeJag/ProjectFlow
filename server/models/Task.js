import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Project is required"],
      ref: "Project",
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxLength: [200, "Task title is too long"],
    },
    description: {
      type: String,
      trim: true,
      maxLength: [2000, "Description is too long"],
      default: null,
    },
    status: {
      type: String,
      enum: ["todo", "drafting", "review", "done"],
      default: "todo",
    },
    due_date: {
      type: Date,
      default: null,
    },
    assignee_id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "assigneeModel",
    },
    assigneeModel: {
      type: String,
      enum: ["admin", "project_manager", "team_member"],
    },
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

taskSchema.index({ project_id: 1 });
taskSchema.index({ assignee_id: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ due_date: 1 });

export default mongoose.model("Task", taskSchema, "tasks");
