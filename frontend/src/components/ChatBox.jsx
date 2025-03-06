import React, { useState } from "react";
import "./ChatBox.css";

const ChatBox = ({ onTextSubmit }) => {
  const [inputText, setInputText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      onTextSubmit(inputText);
      setInputText("");
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
      </div>
    </form>
  );
};

export default ChatBox;
