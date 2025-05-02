// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const mongoose = require("mongoose");
// const session = require("express-session");
// const passport = require("passport");
// const GoogleStrategy = require("passport-google-oauth20").Strategy;
// const jwt = require("jsonwebtoken");
// const cookieParser = require("cookie-parser");
// const User = require("./models/User");
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const MongoStore = require("connect-mongo");
// const crypto = require("crypto");
// const nodemailer = require("nodemailer");
// const path = require("path");
// const bcrypt = require("bcryptjs");
// const { OAuth2Client } = require("google-auth-library");
// const Conversation = require("./models/Conversation");

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Initialize Gemini API
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// // MongoDB Connection with better error handling
// mongoose
//   .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/choicemate", {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log("MongoDB connected successfully"))
//   .catch((err) => {
//     console.error("MongoDB connection error:", err);
//     process.exit(1);
//   });

// // Email configuration
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD,
//   },
// });

// // Middleware
// app.use(express.json());
// app.use(cookieParser());
// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     credentials: true,
//   })
// );

// // Session configuration
// const sessionStore = MongoStore.create({
//   mongoUrl: process.env.MONGODB_URI,
//   collectionName: "sessions",
// });

// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     store: sessionStore,
//     cookie: {
//       secure: false,
//       httpOnly: true,
//       sameSite: "lax",
//       maxAge: 1000 * 60 * 60 * 24,
//     },
//   })
// );

// // Passport middleware
// app.use(passport.initialize());
// app.use(passport.session());

// // JWT Authentication Middleware
// const authenticateJWT = (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

//   const token = authHeader.split(" ")[1];
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.userId = decoded.userId;
//     next();
//   } catch (err) {
//     return res.status(403).json({ error: "Invalid token" });
//   }
// };

// // Passport Config
// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: "http://localhost:5000/auth/google/callback",
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         let user = await User.findOne({ googleId: profile.id });
//         if (!user) {
//           user = await User.create({
//             googleId: profile.id,
//             email: profile.emails[0].value,
//             displayName: profile.displayName,
//           });
//         }
//         return done(null, user);
//       } catch (error) {
//         return done(error, null);
//       }
//     }
//   )
// );

// passport.serializeUser((user, done) => done(null, user._id));
// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id);
//     done(null, user);
//   } catch (err) {
//     done(err, null);
//   }
// });

// // Helper functions
// function formatPreferences(prefs) {
//   return `- Category: ${prefs.category || "Not specified"}
// - Budget: ${prefs.budget || "Not specified"}
// - Features: ${prefs.features.join(", ") || "None"}`;
// }

// function extractPreferences(summary) {
//   return {
//     category: summary.match(/Category: (.*?)(\n|$)/)?.[1] || null,
//     budget: summary.match(/Budget: (.*?)(\n|$)/)?.[1] || null,
//     features: summary.match(/Features: (.*)/)?.[1].split(", ") || [],
//   };
// }

// function generateMockProducts(prefs) {
//   return [
//     {
//       name: `Example ${prefs.category}`,
//       price: 99.99,
//       features: prefs.features,
//       link: "#",
//     },
//   ];
// }

// // Helper function to get conversation context
// const getConversationContext = (messages) => {
//   return messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n");
// };

// // API Routes
// // Auth Routes
// app.post("/api/auth/register", async (req, res) => {
//   try {
//     const { email, password, displayName } = req.body;

//     if (!email || !password || !displayName) {
//       return res.status(400).json({
//         error:
//           "Please provide all required fields: email, password, and display name",
//       });
//     }

//     // Check if user already exists
//     const existingUser = await User.findOne({ email: email.toLowerCase() });
//     if (existingUser) {
//       return res.status(400).json({ error: "Email already registered" });
//     }

//     // Create new user - password will be hashed by the model's pre-save middleware
//     const user = new User({
//       email: email.toLowerCase(),
//       password,
//       displayName,
//     });

//     const savedUser = await user.save();
//     console.log("User saved successfully:", {
//       id: savedUser._id,
//       email: savedUser.email,
//       displayName: savedUser.displayName,
//       hasPassword: !!savedUser.password,
//     });

//     // Generate JWT token
//     const token = jwt.sign(
//       { userId: savedUser._id },
//       process.env.JWT_SECRET || "default-secret-key",
//       {
//         expiresIn: "24h",
//       }
//     );

//     // Send response without password
//     res.status(201).json({
//       message: "Registration successful",
//       token,
//       user: {
//         id: savedUser._id,
//         email: savedUser.email,
//         displayName: savedUser.displayName,
//       },
//     });
//   } catch (error) {
//     console.error("Registration error details:", error);
//     res.status(500).json({
//       error: "Registration failed",
//       details:
//         process.env.NODE_ENV === "development" ? error.message : undefined,
//     });
//   }
// });

// app.post("/api/auth/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     console.log("Login attempt for email:", email);

//     // Find user
//     const user = await User.findOne({ email: email.toLowerCase() });
//     if (!user) {
//       console.log("Login failed: User not found for email:", email);
//       return res.status(401).json({ error: "Invalid credentials" });
//     }

//     console.log("User found:", {
//       id: user._id,
//       email: user.email,
//       hasPassword: !!user.password,
//       isGoogleUser: !!user.googleId,
//     });

//     // Check if user has password (Google OAuth users might not)
//     if (!user.password) {
//       console.log("Login failed: No password set for user:", email);
//       return res
//         .status(401)
//         .json({ error: "Please use Google login for this account" });
//     }

//     // Check password
//     const isMatch = await user.comparePassword(password);
//     console.log("Password match result:", isMatch);

//     if (!isMatch) {
//       console.log("Login failed: Invalid password for user:", email);
//       return res.status(401).json({ error: "Invalid credentials" });
//     }

//     // Generate JWT
//     const token = jwt.sign(
//       { userId: user._id },
//       process.env.JWT_SECRET || "default-secret-key",
//       {
//         expiresIn: "24h",
//       }
//     );

//     console.log("Login successful for user:", email);

//     res.json({
//       token,
//       user: {
//         id: user._id,
//         email: user.email,
//         displayName: user.displayName,
//       },
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ error: "Login failed", details: error.message });
//   }
// });

// // Google Auth Routes
// app.get(
//   "/auth/google",
//   passport.authenticate("google", {
//     scope: ["profile", "email"],
//   })
// );

// app.get(
//   "/auth/google/callback",
//   passport.authenticate("google", {
//     failureRedirect: "/login",
//     session: false,
//   }),
//   async (req, res) => {
//     try {
//       if (!req.user) {
//         console.error("User not found after Google login.");
//         return res.redirect(
//           `${
//             process.env.FRONTEND_URL || "http://localhost:3000"
//           }/login?error=auth_failed`
//         );
//       }

//       // Generate JWT token
//       const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, {
//         expiresIn: "24h",
//       });

//       // Redirect to frontend with token and user data
//       const userData = {
//         id: req.user._id,
//         email: req.user.email,
//         displayName: req.user.displayName,
//       };

//       // Encode the data to pass in URL
//       const data = encodeURIComponent(
//         JSON.stringify({ token, user: userData })
//       );
//       res.redirect(
//         `${
//           process.env.FRONTEND_URL || "http://localhost:3000"
//         }/auth/callback?data=${data}`
//       );
//     } catch (error) {
//       console.error("Google callback error:", error);
//       res.redirect(
//         `${
//           process.env.FRONTEND_URL || "http://localhost:3000"
//         }/login?error=auth_failed`
//       );
//     }
//   }
// );

// app.get("/auth/logout", (req, res) => {
//   req.logout(() => {
//     res.json({ message: "Logged out successfully" });
//   });
// });

// // Protected Routes
// app.get("/api/user", authenticateJWT, async (req, res) => {
//   try {
//     const user = await User.findById(req.userId);
//     if (!user) return res.status(404).json({ error: "User not found" });
//     res.json(user);
//   } catch (error) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// app.get("/api/conversations", authenticateJWT, async (req, res) => {
//   try {
//     const user = await User.findOne({ googleId: req.userId });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     const sessions = user.sessions
//       .sort((a, b) => b.lastActivity - a.lastActivity)
//       .map((session) => ({
//         sessionId: session.sessionId,
//         startTime: session.startTime,
//         lastActivity: session.lastActivity,
//         isActive: session.isActive,
//         messageCount: session.messages.length,
//         preferences: session.preferences,
//         messages: session.messages,
//       }));

//     res.json({ sessions });
//   } catch (error) {
//     console.error("Error fetching conversations:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// // Process user request endpoint
// app.post("/api/process-request", authenticateJWT, async (req, res) => {
//   try {
//     const { query, sessionId } = req.body;
//     const user = await User.findById(req.userId);

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     let session = user.sessions.find((s) => s.sessionId === sessionId);
//     if (!session) {
//       session = {
//         sessionId,
//         messages: [],
//         preferences: { category: null, budget: null, features: [] },
//         isActive: true,
//         startTime: new Date(),
//         lastActivity: new Date(),
//       };
//       user.sessions.push(session);
//     }

//     // Add user message to session
//     session.messages.push({
//       role: "user",
//       content: query,
//       timestamp: new Date(),
//     });

//     // Get conversation history
//     const conversationHistory = getConversationContext(session.messages);
//     // console.log("Conversation Context:\n", conversationHistory);
//     // Summarize conversation to extract user's intent/preferences
//     const summaryPrompt = `Summarize the following conversation between a user and a shopping assistant. 
//     Focus on identifying what the user wants: product category, budget, preferred features, and any special needs. 
//     Be concise and clear.

//     Conversation:
//     ${conversationHistory}

//     Summary:
//     `;

//     const summaryResult = await model.generateContent(summaryPrompt);
//     const summaryResponse = await summaryResult.response;
//     const conversationSummary = summaryResponse.text();

//     // ✅ Log the summary for debugging or display
//     console.log("📝 Conversation Summary:\n", conversationSummary);

//     // Create a more conversational prompt
//     const prompt = `You are a friendly and helpful shopping assistant. Your goal is to help users find the perfect products by understanding their needs through natural conversation.

// Previous conversation:
// ${conversationHistory}

// Your task:
// 1. Be conversational and friendly
// 2. If you don't have enough information, ask follow-up questions about:
//    - Product category/type
//    - Budget range
//    - Specific features or preferences
//    - Use cases or requirements
// 3. Once you have enough information, suggest relevant products
// 4. Always maintain a helpful and engaging tone

// Current preferences:
// ${
//   session.preferences
//     ? `
// - Category: ${session.preferences.category || "Not specified"}
// - Budget: ${session.preferences.budget || "Not specified"}
// - Features: ${session.preferences.features?.join(", ") || "None"}`
//     : "No preferences set yet"
// }

// Please respond naturally to the user's last message.`;

//     // Generate response using Gemini
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     const botResponse = response.text();

//     // Add assistant's response to session
//     session.messages.push({
//       role: "assistant",
//       content: botResponse,
//       timestamp: new Date(),
//     });

//     // Update session's last activity
//     session.lastActivity = new Date();
//     session.summary = conversationSummary;
//     // Save updated user document
//     await user.save();

//     // Send response
//     res.json({
//       botResponse,
//       sessionId,
//       preferences: session.preferences,
//       products: [], // We'll implement product recommendations later
//     });
//   } catch (error) {
//     console.error("Process request error:", error);
//     res.status(500).json({ error: "Failed to process request" });
//   }
// });

// // Serve static files in production
// if (process.env.NODE_ENV === "production") {
//   app.use(express.static(path.join(__dirname, "../frontend/build")));
//   app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
//   });
// }

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ error: "Something went wrong!" });
// });

// // Start Server
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));





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
const axios = require('axios');
const { generateGeminiResponse } = require("./geminiClient");

const app = express();
const PORT = process.env.PORT || 5000;



// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });


const fs = require("fs");
const products = JSON.parse(fs.readFileSync("C:\\Users\\Vaishnavi\\4-2\\MajorProject\\ChoiceMate\\backend\\combined_products.json", "utf-8"));

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
          `${process.env.FRONTEND_URL || "http://localhost:3000"
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
        `${process.env.FRONTEND_URL || "http://localhost:3000"
        }/auth/callback?data=${data}`
      );
    } catch (error) {
      console.error("Google callback error:", error);
      res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"
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
    const conversations = await Conversation.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .select("sessionId messages preferences updatedAt");

    res.json({ sessions: conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/conversation/update-category", authenticateJWT, async (req, res) => {
  try {
    const { sessionId, category } = req.body;

    const conversation = await Conversation.findOne({
      userId: req.userId,
      sessionId,
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    conversation.preferences.category = category;
    conversation.updatedAt = new Date();
    await conversation.save();

    res.json({ message: "Category updated", preferences: conversation.preferences });
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.post("/api/get-products-by-message", async (req, res) => {
  const { sessionId, messageId } = req.body;

  if (!sessionId || !messageId) {
    return res.status(400).json({ error: "sessionId and messageId are required" });
  }

  try {
    // Load conversation (MongoDB example)
    const conversation = await Conversation.findOne({ sessionId });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Find the message with recommendations
    const message = conversation.messages.find(msg => msg._id.toString() === messageId);

    if (!message || !message.recommendedProductIds) {
      return res.status(404).json({ error: "No recommended products found in that message" });
    }

    const productIds = message.recommendedProductIds;

    // Load product data from JSON
    const products = JSON.parse(fs.readFileSync("./data/products.json", "utf-8"));
    const matchedProducts = products.filter(p => productIds.includes(String(p.id)));

    res.json({ products: matchedProducts });

  } catch (err) {
    console.error("Error retrieving recommendations:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/get-products-by-ids", async (req, res) => {
  const { ids: productEntries } = req.body;

  if (!productEntries || !Array.isArray(productEntries) || productEntries.length === 0) {
    return res.status(400).json({ error: "ids must be a non-empty array" });
  }

  try {
    // Extract just the IDs from the objects (support both raw IDs and { id, reason } objects)
    const productIds = productEntries.map(entry => 
      typeof entry === "object" && entry.id ? String(entry.id) : String(entry)
    );

    const matchedProducts = products
      .filter(p => productIds.includes(String(p.id)))
      .map(p => {
        const match = productEntries.find(entry =>
          typeof entry === "object" && entry.id === p.id
        );
        return {
          ...p,
          reason: match?.reason || null,  // attach reason if provided
        };
      });

    if (matchedProducts.length === 0) {
      console.log("No products found for the given IDs");
      return res.status(404).json({ error: "No products found for the given IDs" });
    }

    res.json({ products: matchedProducts });
  } catch (err) {
    console.error("Error retrieving products:", err);
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

    // Find or create current conversation
    let currentConversation = await Conversation.findOne({
      userId: req.userId,
      sessionId: sessionId,
    });

    if (!currentConversation) {
      currentConversation = new Conversation({
        userId: req.userId,
        sessionId: sessionId,
        messages: [],
        preferences: {
          category: null,
          budget: null,
          features: [],
        },
      });
    }

    // Get all user's previous conversations
    const previousConversations = await Conversation.find({
      userId: req.userId,
      sessionId: { $ne: sessionId }, // Exclude current conversation
    }).sort({ updatedAt: -1 });

    // Add user message to current conversation
    currentConversation.messages.push({
      role: "user",
      content: query,
      timestamp: new Date(),
    });

    // Get conversation history from all conversations
    let allConversationHistory = "";

    // Add previous conversations context
    if (previousConversations.length > 0) {
      allConversationHistory = "Previous Conversations:\n";
      previousConversations.forEach((conv, index) => {
        allConversationHistory += `\nConversation ${index + 1}:\n`;
        allConversationHistory += getConversationContext(conv.messages);
        allConversationHistory += "\n";
      });
    }

    // Add current conversation context
    allConversationHistory += "\nCurrent Conversation:\n";
    allConversationHistory += getConversationContext(
      currentConversation.messages
    );

    // Create a more conversational prompt with all history
    const prompt = `You are a friendly and helpful shopping assistant. Your goal is to help users find the perfect products by understanding their needs through natural conversation.

${allConversationHistory}

Your task:
1. Be conversational and friendly
2. If you don't have enough information, ask follow-up questions about:
   - Product category/type
   - Budget range
   - Specific features or preferences
   - Use cases or requirements
3. Once you have enough information, suggest relevant products
4. Always maintain a helpful and engaging tone
5. Consider the user's preferences and history from previous conversations

Current preferences:
${currentConversation.preferences
        ? `
- Category: ${currentConversation.preferences.category || "Not specified"}
- Budget: ${currentConversation.preferences.budget || "Not specified"}
- Features: ${currentConversation.preferences.features?.join(", ") || "None"}`
        : "No preferences set yet"
      }

Please respond naturally to the user's last message.`;

    // Generate response using Gemini
    // const result = await model.generateContent(prompt);
    // const response = await result.response;
    // const botResponse = response.text();
    const botResponse = await generateGeminiResponse(prompt);
    // Add assistant's response
    currentConversation.messages.push({
      role: "assistant",
      content: botResponse,
      timestamp: new Date(),
    });

    // Optional: Summarize current session
    const summaryPrompt = `
    Analyze the following conversation and extract only the user's product intent, such as preferred categories, budget, required features, and specific product expectations in sentence form. 
    Ignore unrelated messages or general chit-chat. The output should help a recommendation engine understand exactly what the user wants.
    
    Conversation:
    ${getConversationContext(currentConversation.messages)}
    `;
    // const summaryResult = await model.generateContent(summaryPrompt);
    // const summaryResponse = await summaryResult.response;
    // currentConversation.summary = summaryResponse.text();
    const summaryText = await generateGeminiResponse(summaryPrompt);
    currentConversation.summary = summaryText;

    console.log("currentConversation summarry: " + currentConversation.summary);
    // Update conversation's last activity
    currentConversation.updatedAt = new Date();

    // Save conversation
    await currentConversation.save();

    // Send response
    res.json({
      botResponse,
      sessionId,
      preferences: currentConversation.preferences,
      products: [], // We'll implement product recommendations later
    });
  } catch (error) {
    console.error("Process request error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});
app.post("/api/recommend/test", (req, res) => {
  const recommendations = [
    {
      id: "4563",
      title: "Women Silk Blend Kurta Pant Dupatta Set",
      price: 670,
      rating: 5,
      description:
        "Fabric: Silk Blend || Sales Package: 1 Kurta Pant Dupatta set || Style Code: Ethnic Set || Secondary color: Purple || Lining material: N/A || Top fabric: Cotton || Bottom fabric: Cotton || Top type: Kurta || Bottom type: Pant || Pattern: Embroidered || Color: Purple || Occasion: Festive & Party, Casual || Neck: V Neck || Knit type: N/A || Fabric care: Hand Wash || Other Details: Good Quality",
      link: "https://www.flipkart.com/laxmichhaya-women-kurta-pant-dupatta-set/p/itmfa02981ad2ac3?pid=ETHH43DGE5MGRWRT",
      reason: "This is a kurta set, directly matching the user's initial interest. The full set (Kurta, Pant, Dupatta) offers a complete outfit."
    },
    {
      id: "4694",
      title: "Women Cotton Blend Kurti Palazzo Set",
      price: 459,
      rating: 5,
      description:
        "Fabric: Cotton Blend || Sales Package: 1 KURTA, 1 PALAZZO || Style Code: Casual Set || Color: Pink || Pattern: Floral Print || Neck: Round Neck || Occasion: Daily Wear",
      link: "https://www.flipkart.com/zublee-women-kurti-palazzo/p/itm3e30456bf0141",
      reason: "Affordable daily wear option with floral prints and cotton comfort."
    },
    {
      id: "4551",
      title: "Women Viscose Rayon Anarkali Set",
      price: 965,
      rating: 4.8,
      description:
        "Fabric: Viscose Rayon || Sales Package: 1 kurta, 1 pant, 1 dupatta || Style Code: Anarkali Set || Pattern: Printed || Occasion: Party & Festive || Neck: Round Neck || Fabric care: Hand Wash",
      link: "https://www.flipkart.com/nermosa-women-kurta-pant-dupatta-set/p/itmec3365794452a",
      reason: "Great for festive occasions with elegant Anarkali style and premium fabric."
    },
    {
      id: "4562",
      title: "Women Chanderi Kurta Pant Dupatta Set",
      price: 909,
      rating: 4.6,
      description:
        "Fabric: Chanderi || Sales Package: 1 Kurta, 1 Pant, 1 Dupatta || Pattern: Solid || Dupatta Work: Embroidered || Neck: Straight Collar || Fabric care: Machine Wash",
      link: "https://www.flipkart.com/royal-export-women-kurta-pant-dupatta-set/p/itmff482b7d34bfb",
      reason: "Ideal for semi-formal events with rich embroidery and soft chanderi feel."
    },
    {
      id: "4669",
      title: "Women Pure Silk Kurta Pant Dupatta Set",
      price: 1197,
      rating: 4.4,
      description:
        "Fabric: Pure Silk || Sales Package: 1 Kurta, 1 Pant, 1 Dupatta || Pattern: Solid || Neck: V Neck || Fabric care: Dry Clean Only",
      link: "https://www.flipkart.com/klosia-women-kurta-pant-dupatta-set/p/itmf0c39d83f961d",
      reason: "Premium silk outfit suited for weddings and traditional functions."
    }
  ];

  res.json({ recommendations });
});


app.post("/api/recommend", authenticateJWT, async (req, res) => {
  try {
    const { sessionId } = req.body;
    console.log("sessionId: " + sessionId);
    // Step 1: Get session from MongoDB
    const user = await User.findById(req.userId);
    console.log(user);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    let currentConversation = await Conversation.findOne({
      userId: req.userId,
      sessionId: sessionId,
    });
    if (!currentConversation) {
      currentConversation = new Conversation({
        userId: req.userId,
        sessionId: sessionId,
        messages: [],
        summary: "",
        preferences: {
          category: null,
          budget: null,
          features: [],
        },
      });
    }

    const summary = currentConversation.summary;
    const category = currentConversation.preferences.category;
    // Step 2: Send summary to Flask API
    console.log({
      category: category,
      query: summary
    });

    const flaskResponse = await axios.post("http://localhost:8000/recommend", {
      category: category,
      query: summary,
    });
    const recommendedProducts = flaskResponse.data.recommendations || [];

    if (recommendedProducts.length > 0) {
      // const recommendedIds = recommendedProducts.map(p => p.id);
      const recommendedDetails = recommendedProducts.map(p => ({
        id: p.id,
        reason: p.reason
      }));
      // Save message with recommended product IDs
      currentConversation.messages.push({
        role: "system",
        content: recommendedDetails,
        timestamp: new Date(),
      });

      await currentConversation.save();
    }

    // Step 3: Return Flask's response to frontend
    res.json(flaskResponse.data);
  } catch (error) {
    console.error("Error in /recommend:", error.message);
    res.status(500).json({ error: "Failed to get recommendations" });
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
