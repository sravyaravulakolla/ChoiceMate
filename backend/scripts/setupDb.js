require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function setupDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/choicemate",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("Connected to MongoDB");

    // Drop existing collections
    await mongoose.connection.dropDatabase();
    console.log("Dropped existing database");

    // Create collections and indexes
    await User.createCollection();
    console.log("Created User collection");

    // Create indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });

    await User.collection.createIndex(
      { googleId: 1 },
      {
        unique: true,
        sparse: true,
        background: true,
      }
    );
    console.log("Created indexes");

    console.log("Database setup completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error setting up database:", error);
    process.exit(1);
  }
}

setupDatabase();
