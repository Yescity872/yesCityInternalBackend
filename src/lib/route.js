import mongoose from "mongoose";
import User from "../models/User.js"; // adjust path to your User model

async function fixReferredBy() {
  await mongoose.connect("mongodb+srv://yescitycompany:oXXCaD1Whc3mLUca@cluster0.k2m5o.mongodb.net/YesCity3");

  // Find all users where referredBy looks like an ObjectId (length > 10 etc.)
  const users = await User.find({
    referredBy: { $type: "string", $ne: "" },
    $expr: { $gt: [{ $strLenCP: "$referredBy" }, 10] }
  });

  for (const user of users) {
    try {
      const refUser = await User.findById(user.referredBy);
      if (refUser && refUser.phone) {
        user.referredBy = refUser.phone;
        await user.save();
        console.log(`✅ Updated ${user._id}: referredBy = ${refUser.phone}`);
      } else {
        console.log(`⚠️ Could not resolve referredBy for user ${user._id}`);
      }
    } catch (err) {
      console.error(`❌ Error updating user ${user._id}`, err);
    }
  }
console.log(`Found ${users.length} users to update.`);


  await mongoose.disconnect();
}

fixReferredBy();
