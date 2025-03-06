import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import VoiceInput from "./VoiceInput";
import ChatBox from "./ChatBox";
import ProductList from "./ProductList";
import "./Dashboard.css";

const Dashboard = ({ user }) => {
  //  const location = useLocation();

  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [sessionId, setSessionId] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (!storedToken) {
      console.log("Token missing! Redirecting to Auth...");
      window.location.href = "/"; // Force reload login page
    } else {
      console.log("Dashboard Loaded with Token:", storedToken);
      // Generate a new session ID if one doesn't exist
      if (!sessionId) {
        setSessionId(generateSessionId());
      }
    }
  }, []);

  // Function to generate a unique session ID
  const generateSessionId = () => {
    return "session_" + Math.random().toString(36).substr(2, 9);
  };

  // Function to handle text-to-speech
  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleUserInput = async (inputText) => {
    if (!sessionId) {
      console.error("No session ID available");
      return;
    }

    setIsLoading(true);
    setMessages((prev) => [...prev, { text: inputText, isBot: false }]);

    try {
      const response = await fetch(
        "http://localhost:5000/api/process-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            query: inputText,
            sessionId: sessionId,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        const botMessage = { text: data.botResponse, isBot: true };
        setMessages((prev) => [...prev, botMessage]);

        // Speak the bot's response if in voice mode
        if (activeTab === "voice") {
          speakText(data.botResponse);
        }

        if (data.isComplete && data.products.length > 0) {
          setProducts(data.products);
          // Generate new session ID for next conversation
          setSessionId(generateSessionId());
        }
      } else {
        throw new Error(data.error || "Failed to process request");
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = "Sorry, I encountered an error. Please try again.";
      setMessages((prev) => [...prev, { text: errorMessage, isBot: true }]);
      if (activeTab === "voice") {
        speakText(errorMessage);
      }
    }
    setIsLoading(false);
  };

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
                await fetch("http://localhost:5000/auth/logout", {
                  method: "GET",
                  credentials: "include",
                });
                // Clear local storage
                localStorage.removeItem("token");
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

      <div className="tabs">
        <button
          className={`tab ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("chat");
            window.speechSynthesis.cancel(); // Stop any ongoing speech
          }}
        >
          Chat
        </button>
        <button
          className={`tab ${activeTab === "voice" ? "active" : ""}`}
          onClick={() => setActiveTab("voice")}
        >
          Speak
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "chat" && <ChatBox onTextSubmit={handleUserInput} />}
        {activeTab === "voice" && <VoiceInput onVoiceInput={handleUserInput} />}
      </div>

      <div className="chat-container">
        <div className="messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.isBot ? "bot" : "user"}`}
            >
              {msg.text}
              {msg.isBot && activeTab === "voice" && (
                <button
                  className="speak-button"
                  onClick={() => speakText(msg.text)}
                  disabled={isSpeaking}
                >
                  {isSpeaking ? "Speaking..." : "🔊"}
                </button>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="message bot">Searching for products...</div>
          )}
        </div>
      </div>

      <ProductList products={products} isLoading={isLoading} />
    </div>
  );
};

export default Dashboard;
