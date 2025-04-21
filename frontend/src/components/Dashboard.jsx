import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import RecommendationsModal from "./RecommendationsModal"; // Add this import

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Dashboard = () => {
  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [user, setUser] = useState(null);
  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const messagesEndRef = React.useRef(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");

    if (!storedToken || !storedUser) {
      console.log("Token or user missing! Redirecting to Auth...");
      window.location.href = "/";
      return;
    }

    console.log("Dashboard Loaded with Token:", storedToken);
    setUser(storedUser);

    // Load conversations
    loadConversations(storedToken);

    // Generate a new session ID if one doesn't exist
    if (!sessionId) {
      setSessionId(generateSessionId());
    }

    // Add initial welcome message
    setMessages([
      {
        role: "assistant",
        content:
          "Hi! I'm your personal shopping assistant. What kind of product are you looking for today?",
      },
    ]);
  }, []);

  // Function to load conversations
  const loadConversations = async (token) => {
    try {
      const response = await fetch(`${API_URL}/api/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load conversations");
      }

      const data = await response.json();
      setConversations(data.sessions);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  // Function to switch conversations
  const switchConversation = (conversation) => {
    setActiveConversation(conversation);
    setMessages(conversation.messages);
    setSessionId(conversation.sessionId);
    setProducts([]); // Clear products when switching conversations
  };

  // Function to generate a unique session ID
  const generateSessionId = () => {
    return "session_" + Math.random().toString(36).substr(2, 9);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/process-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          query: userMessage,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process request");
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.botResponse },
      ]);

      if (data.recommendations && data.recommendations.length > 0) {
        setProducts(data.recommendations);
      }

      // Reload conversations to get updated history
      loadConversations(localStorage.getItem("token"));
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleRecommend = async () => {
    if (!sessionId) {
      console.warn("Session ID is missing");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      console.log(data);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.message ||
            "Here are some recommendations based on your previous queries.",
        },
      ]);

      if (data.recommendations) {
        setProducts(data.recommendations);
        setShowRecommendations(true);
      }
    } catch (error) {
      console.error("Recommend Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't fetch recommendations.",
        },
      ]);
    }
  };


  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="app-title">
            <h1>ChoiceMate</h1>
          </div>
          <div className="user-info">
            <h2>Welcome, {user.displayName}!</h2>
            <p className="user-email">{user.email}</p>
          </div>
          <button
            className="logout-button"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              window.location.href = "/";
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="chat-container">
        {/* Conversations Sidebar */}
        <div className="conversations-sidebar">
          <h3>Conversations</h3>
          <button
            className="new-chat-button"
            onClick={() => {
              setSessionId(generateSessionId());
              setMessages([
                {
                  role: "assistant",
                  content:
                    "Hi! I'm your personal shopping assistant. What kind of product are you looking for today?",
                },
              ]);
              setActiveConversation(null);
              setProducts([]);
            }}
          >
            New Chat
          </button>
          <div className="conversations-list">
            {conversations.map((conv) => (
              <div
                key={conv.sessionId}
                className={`conversation-item ${activeConversation?.sessionId === conv.sessionId
                  ? "active"
                  : ""
                  }`}
                onClick={() => switchConversation(conv)}
              >
                <div className="conversation-preview">
                  {conv.messages[0]?.content.substring(0, 50)}...
                </div>
                <div className="conversation-meta">
                  {new Date(conv.lastActivity).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          <div className="messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.role === "user" ? "user-message" : "assistant-message"
                  }`}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="message assistant-message">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {showRecommendations && (
            <RecommendationsModal
              products={products}
              onClose={() => setShowRecommendations(false)}
            />
          )}

          <form onSubmit={handleSubmit} className="input-container">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              Send
            </button>
            <button
              type="button"
              className="recommend-button"
              onClick={handleRecommend}
            >
              Recommend
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
