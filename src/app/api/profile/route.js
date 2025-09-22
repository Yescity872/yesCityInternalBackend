// scripts/createGroup.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectToDatabase } from "@/lib/db.js"; // adjust if path differs
import ChatGroup from "@/models/ChatGroup.js";
import GroupMember from "@/models/GroupMember.js";
import User from "@/models/User.js";

dotenv.config();

async function createGroup({ name, description, cityId, isPrivate, adminId }) {
  try {
    // connect to DB
    await connectToDatabase();
    console.log("✅ Connected to MongoDB");

    // check admin user exists
    const adminUser = await User.findById(adminId).select("username");
    if (!adminUser) {
      console.error("❌ Admin user not found");
      return;
    }

    // create group
    const newGroup = new ChatGroup({
      name,
      description,
      cityId,
      isPrivate: !!isPrivate,
      adminId,
      memberCount: 1, // admin counts as first member
    });
    await newGroup.save();

    // create membership for admin
    const adminMember = new GroupMember({
      groupId: newGroup._id,
      userId: adminId,
      username: adminUser.username,
      role: "admin",
    });
    await adminMember.save();

    console.log("🎉 Group created successfully:");
    console.log({
      id: newGroup._id.toString(),
      name: newGroup.name,
      cityId: newGroup.cityId,
      admin: adminUser.username,
    });
  } catch (err) {
    console.error("❌ Error creating group:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Example usage
createGroup({
  name: "Tech Founders Hub",
  description: "Meet other startup founders and share ideas",
  cityId: "delhi001", // city id of your choice
  isPrivate: false,
  adminId: "6512abc1234567def8901234", // replace with real user ID
});
