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

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

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

// API Routes
// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create new user
    const user = new User({
      email,
      password,
      displayName,
      verificationToken,
      // Auto-verify email in development
      isEmailVerified: process.env.NODE_ENV === "development",
    });

    await user.save();

    // Only send verification email in production
    if (process.env.NODE_ENV === "production") {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify your email",
        html: `Please click <a href="${verificationUrl}">here</a> to verify your email.`,
      });
    }

    res.status(201).json({
      message:
        process.env.NODE_ENV === "development"
          ? "Registration successful. You can now login."
          : "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if user is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({ error: "Please verify your email first" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

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
    res.status(500).json({ error: "Login failed" });
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
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    if (!req.user) {
      console.error("User not found after Google login.");
      return res.redirect("http://localhost:3000/login?error=auth_failed");
    }

    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.redirect(`http://localhost:3000/auth/callback#token=${token}`);
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

app.post("/api/process-request", authenticateJWT, async (req, res) => {
  const { query, sessionId } = req.body;
  const userId = req.userId;

  if (!sessionId || !query) {
    return res.status(400).json({
      botResponse: "Both session ID and query are required",
      products: [],
      isComplete: false,
    });
  }

  try {
    const user = await User.findOne({ googleId: userId });
    if (!user) {
      return res.status(404).json({
        botResponse: "User not found",
        products: [],
        isComplete: false,
      });
    }

    let session = user.sessions.find(
      (s) => s.sessionId === sessionId && s.isActive
    );

    if (!session) {
      user.sessions.push({
        sessionId,
        messages: [],
        preferences: { category: null, budget: null, features: [] },
        isActive: true,
      });
      session = user.sessions[user.sessions.length - 1];
    }

    session.messages.push({
      role: "user",
      content: query,
      timestamp: new Date(),
    });
    session.lastActivity = new Date();

    const conversationHistory = session.messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const prompt = `As a shopping assistant, collect these details:
1. Product category (required)
2. Budget range (required)
3. Desired features (optional)

Current conversation:
${conversationHistory}

Current preferences:
${formatPreferences(session.preferences)}

Your task:
- If all required info (category and budget) is present, respond with "READY|SUMMARY"
- If missing info, ask ONE follow-up question
- Never answer the question directly, just guide the conversation`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const botResponse = response.text();

    session.messages.push({
      role: "assistant",
      content: botResponse,
      timestamp: new Date(),
    });

    if (botResponse.startsWith("READY|")) {
      const summary = botResponse.split("|")[1];
      session.preferences = extractPreferences(summary);
      session.isActive = false;

      const mockProducts = generateMockProducts(session.preferences);

      await user.save();
      return res.json({
        botResponse: `Great! Here are suggestions based on: ${summary}`,
        products: mockProducts,
        isComplete: true,
      });
    }

    await user.save();

    res.json({
      botResponse,
      products: [],
      isComplete: false,
    });
  } catch (error) {
    console.error("Process error:", error);
    res.status(500).json({
      botResponse: "Sorry, I'm having trouble. Please try again.",
      products: [],
      isComplete: false,
    });
  }
});

app.get("/api/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ error: "Invalid verification token" });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ error: "Email verification failed" });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset your password",
      html: `Please click <a href="${resetUrl}">here</a> to reset your password.`,
    });

    res.json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
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
