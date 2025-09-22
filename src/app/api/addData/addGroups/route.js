// app/api/groups/route.js
import { connectToDatabase } from "@/lib/db";
import ChatGroup from "@/models/ChatGroup";
import User from "@/models/User";
import GroupMember from "@/models/GroupMember";

export const POST = async (req) => {
  try {
    const body = await req.json();

    await connectToDatabase();

    // If it's an array => bulk creation
    if (Array.isArray(body)) {
      const createdGroups = [];

      for (const groupData of body) {
        const { name, description, cityId, isPrivate, adminId } = groupData;

        // validate
        if (!name || !cityId || !adminId) continue;

        const adminUser = await User.findById(adminId).select("username");
        if (!adminUser) continue;

        const newGroup = new ChatGroup({
          name,
          description,
          cityId,
          isPrivate: !!isPrivate,
          adminId,
          memberCount: 1,
        });
        await newGroup.save();

        const adminMember = new GroupMember({
          groupId: newGroup._id,
          userId: adminId,
          username: adminUser.username,
          role: "admin",
        });
        await adminMember.save();

        createdGroups.push(newGroup);
      }

      return new Response(
        JSON.stringify({
          success: true,
          count: createdGroups.length,
          groups: createdGroups,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }

    // Otherwise, single group creation
    const { name, description, cityId, isPrivate, adminId } = body;

    if (!name || !cityId || !adminId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const adminUser = await User.findById(adminId).select("username");
    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: "Admin user not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const newGroup = new ChatGroup({
      name,
      description,
      cityId,
      isPrivate: !!isPrivate,
      adminId,
      memberCount: 1,
    });
    await newGroup.save();

    const adminMember = new GroupMember({
      groupId: newGroup._id,
      userId: adminId,
      username: adminUser.username,
      role: "admin",
    });
    await adminMember.save();

    return new Response(
      JSON.stringify({
        success: true,
        group: newGroup,
        message: "Group created successfully",
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error creating group:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
