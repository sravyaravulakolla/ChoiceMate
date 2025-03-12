import React, { useState, useEffect } from "react";
import "./Dashboard.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Dashboard = () => {
  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [user, setUser] = useState(null);
  const [input, setInput] = useState("");
  const messagesEndRef = React.useRef(null);

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

      if (data.products && data.products.length > 0) {
        setProducts(data.products);
        // Generate new session ID for next conversation
        setSessionId(generateSessionId());
      }
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

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="user-info">
            <h1>Welcome back, {user.displayName}! 🛒</h1>
            <p className="user-email">{user.email}</p>
          </div>
          <button
            className="logout-button"
            onClick={async () => {
              try {
                // Call backend logout endpoint
                await fetch(`${API_URL}/auth/logout`, {
                  method: "GET",
                  credentials: "include",
                });
                // Clear local storage
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                // Redirect to home/login page
                window.location.href = "/";
              } catch (error) {
                console.error("Logout failed:", error);
              }
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="chat-container">
        <div className="messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.role === "user" ? "user-message" : "assistant-message"
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

        {products.length > 0 && (
          <div className="products-container">
            <h3>Recommended Products</h3>
            <div className="products-grid">
              {products.map((product, index) => (
                <div key={index} className="product-card">
                  <h4>{product.name}</h4>
                  <p className="price">${product.price}</p>
                  <ul className="features-list">
                    {product.features.map((feature, i) => (
                      <li key={i}>{feature}</li>
                    ))}
                  </ul>
                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-product-button"
                  >
                    View Product
                  </a>
                </div>
              ))}
            </div>
          </div>
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
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
