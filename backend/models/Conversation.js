const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant", "system"],
    required: true,
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const preferencesSchema = new mongoose.Schema({
  category: {
    type: String,
    default: null,
  },
  budget: {
    type: String,
    default: null,
  },
  features: [
    {
      type: String,
    },
  ],
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sessionId: {
    type: String,
    required: true,
  },
  messages: [messageSchema],
  summary: {
    type: String,
    default: "",
  },
  
  preferences: {
    type: preferencesSchema,
    default: () => ({}),
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // timestamps: true 
});

// Create compound index for userId and sessionId
conversationSchema.index({ userId: 1, sessionId: 1 }, { unique: true });

// Update the updatedAt timestamp before saving
conversationSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Conversation", conversationSchema);
