import "dotenv/config";
import mongoose from "mongoose";
import Admin from "../models/Admin.js";

const seedAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Check if an admin already exists (only one admin is allowed)
    const existingAdmin = await Admin.findOne();

    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.email);
      console.log("Skipping admin creation (only one admin allowed)");
      process.exit(0);
    }

    // Create the single admin user in the admins collection
    const admin = await Admin.create({
      email: "preethikajagadisan@gmail.com",
      password: "Admin@123", // Change this in production
      fullName: "Preethika Jagadisan",
    });

    console.log("Admin user created successfully:");
    console.log("Email:", admin.email);
    console.log("Password: Admin@123 (change this in production)");
    console.log("Collection: admins");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
