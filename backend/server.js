require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const User = require("./models/User");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const MongoStore = require("connect-mongo");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const Conversation = require("./models/Conversation");

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// MongoDB Connection with better error handling
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/choicemate", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Session configuration
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  collectionName: "sessions",
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Passport Config
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            displayName: profile.displayName,
          });
        }
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Helper functions
function formatPreferences(prefs) {
  return `- Category: ${prefs.category || "Not specified"}
- Budget: ${prefs.budget || "Not specified"}
- Features: ${prefs.features.join(", ") || "None"}`;
}

function extractPreferences(summary) {
  return {
    category: summary.match(/Category: (.*?)(\n|$)/)?.[1] || null,
    budget: summary.match(/Budget: (.*?)(\n|$)/)?.[1] || null,
    features: summary.match(/Features: (.*)/)?.[1].split(", ") || [],
  };
}

function generateMockProducts(prefs) {
  return [
    {
      name: `Example ${prefs.category}`,
      price: 99.99,
      features: prefs.features,
      link: "#",
    },
  ];
}

// Helper function to get conversation context
const getConversationContext = (messages) => {
  return messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n");
};

// API Routes
// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({
        error:
          "Please provide all required fields: email, password, and display name",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Create new user - password will be hashed by the model's pre-save middleware
    const user = new User({
      email: email.toLowerCase(),
      password,
      displayName,
    });

    const savedUser = await user.save();
    console.log("User saved successfully:", {
      id: savedUser._id,
      email: savedUser.email,
      displayName: savedUser.displayName,
      hasPassword: !!savedUser.password,
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: savedUser._id },
      process.env.JWT_SECRET || "default-secret-key",
      {
        expiresIn: "24h",
      }
    );

    // Send response without password
    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: savedUser._id,
        email: savedUser.email,
        displayName: savedUser.displayName,
      },
    });
  } catch (error) {
    console.error("Registration error details:", error);
    res.status(500).json({
      error: "Registration failed",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt for email:", email);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log("Login failed: User not found for email:", email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("User found:", {
      id: user._id,
      email: user.email,
      hasPassword: !!user.password,
      isGoogleUser: !!user.googleId,
    });

    // Check if user has password (Google OAuth users might not)
    if (!user.password) {
      console.log("Login failed: No password set for user:", email);
      return res
        .status(401)
        .json({ error: "Please use Google login for this account" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    console.log("Password match result:", isMatch);

    if (!isMatch) {
      console.log("Login failed: Invalid password for user:", email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "default-secret-key",
      {
        expiresIn: "24h",
      }
    );

    console.log("Login successful for user:", email);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed", details: error.message });
  }
});

// Google Auth Routes
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  async (req, res) => {
    try {
      if (!req.user) {
        console.error("User not found after Google login.");
        return res.redirect(
          `${
            process.env.FRONTEND_URL || "http://localhost:3000"
          }/login?error=auth_failed`
        );
      }

      // Generate JWT token
      const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });

      // Redirect to frontend with token and user data
      const userData = {
        id: req.user._id,
        email: req.user.email,
        displayName: req.user.displayName,
      };

      // Encode the data to pass in URL
      const data = encodeURIComponent(
        JSON.stringify({ token, user: userData })
      );
      res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/auth/callback?data=${data}`
      );
    } catch (error) {
      console.error("Google callback error:", error);
      res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/login?error=auth_failed`
      );
    }
  }
);

app.get("/auth/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out successfully" });
  });
});

// Protected Routes
app.get("/api/user", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/conversations", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findOne({ googleId: req.userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const sessions = user.sessions
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .map((session) => ({
        sessionId: session.sessionId,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        isActive: session.isActive,
        messageCount: session.messages.length,
        preferences: session.preferences,
        messages: session.messages,
      }));

    res.json({ sessions });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Process user request endpoint
app.post("/api/process-request", authenticateJWT, async (req, res) => {
  try {
    const { query, sessionId } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let session = user.sessions.find((s) => s.sessionId === sessionId);
    if (!session) {
      session = {
        sessionId,
        messages: [],
        preferences: { category: null, budget: null, features: [] },
        isActive: true,
        startTime: new Date(),
        lastActivity: new Date(),
      };
      user.sessions.push(session);
    }

    // Add user message to session
    session.messages.push({
      role: "user",
      content: query,
      timestamp: new Date(),
    });

    // Get conversation history
    const conversationHistory = getConversationContext(session.messages);

    // Create a more conversational prompt
    const prompt = `You are a friendly and helpful shopping assistant. Your goal is to help users find the perfect products by understanding their needs through natural conversation.

Previous conversation:
${conversationHistory}

Your task:
1. Be conversational and friendly
2. If you don't have enough information, ask follow-up questions about:
   - Product category/type
   - Budget range
   - Specific features or preferences
   - Use cases or requirements
3. Once you have enough information, suggest relevant products
4. Always maintain a helpful and engaging tone

Current preferences:
${
  session.preferences
    ? `
- Category: ${session.preferences.category || "Not specified"}
- Budget: ${session.preferences.budget || "Not specified"}
- Features: ${session.preferences.features?.join(", ") || "None"}`
    : "No preferences set yet"
}

Please respond naturally to the user's last message.`;

    // Generate response using Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const botResponse = response.text();

    // Add assistant's response to session
    session.messages.push({
      role: "assistant",
      content: botResponse,
      timestamp: new Date(),
    });

    // Update session's last activity
    session.lastActivity = new Date();

    // Save updated user document
    await user.save();

    // Send response
    res.json({
      botResponse,
      sessionId,
      preferences: session.preferences,
      products: [], // We'll implement product recommendations later
    });
  } catch (error) {
    console.error("Process request error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
