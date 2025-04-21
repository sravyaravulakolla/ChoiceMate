const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const messageSchema = new mongoose.Schema({
  role: { type: String, required: true, enum: ["user", "assistant"] },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  startTime: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  messages: [messageSchema],
  preferences: {
    category: String,
    budget: String,
    features: [String],
  },
  summary: {
    type: String,
    default: "",
  },
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  googleId: {
    type: String,
    sparse: true,
    index: true,
  },
  sessions: [sessionSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    console.log("Comparing passwords:");
    console.log("Stored hashed password:", this.password);
    console.log("Candidate password length:", candidatePassword.length);
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log("Password match result:", isMatch);
    return isMatch;
  } catch (error) {
    console.error("Password comparison error:", error);
    throw error;
  }
};

const User = mongoose.model("User", userSchema);

// Create indexes
const createIndexes = async () => {
  try {
    // Drop all existing indexes except _id
    await User.collection.dropIndexes().catch(() => {});

    // Create email index
    await User.collection.createIndex({ email: 1 }, { unique: true });

    console.log("Indexes created successfully");
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
};

// Run createIndexes when the model is imported
createIndexes();

module.exports = User;
