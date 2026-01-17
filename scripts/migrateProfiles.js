// scripts/migrateProfiles.js
import mongoose from "mongoose";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import dotenv from "dotenv";
dotenv.config();

const migrateProfiles = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("Starting profile migration...");

  const users = await User.find({});
  let created = 0;
  let skipped = 0;

  for (const user of users) {
    // Check if profile already exists
    const existingProfile = await Profile.findOne({ user: user._id });

    if (!existingProfile) {
      await Profile.create({
        user: user._id,
        // You can migrate any existing data here if needed
      });
      created++;
      console.log(`Created profile for user: ${user.email}`);
    } else {
      skipped++;
    }
  }

  console.log(`Migration complete! Created: ${created}, Skipped: ${skipped}`);
  process.exit(0);
};

migrateProfiles().catch(console.error);
