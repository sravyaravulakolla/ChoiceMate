import React, { useState } from "react";
import "./ChatBox.css";

const ChatBox = ({ onTextSubmit, sessionId, onRecommendation }) => {
  const [inputText, setInputText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      onTextSubmit(inputText);
      setInputText("");
    }
  };

  const handleRecommend = () => {
    if (onRecommendation && sessionId) {
      onRecommendation(sessionId);
    } else {
      console.warn("Missing sessionId or onRecommendation handler");
    }
  };

  return (
    <form className="chat-form" onSubmit={handleSubmit}>
      <div className="input-group">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your request..."
          className="chat-input"
        />
        <button type="submit" className="chat-submit">
          Send
        </button>
        <button
          type="button"
          className="chat-recommend"
          onClick={handleRecommend}
        >
          Recommend
        </button>
      </div>
    </form>
  );
};

export default ChatBox;
