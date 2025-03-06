import React, { useState, useEffect } from "react";
import "./VoiceInput.css"; // Create this CSS file

const VoiceInput = ({ onVoiceInput, onListeningChange = () => {} }) => {
  const [isListening, setIsListening] = useState(false);
  const recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();

  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onVoiceInput(transcript);
    setIsListening(false);
    onListeningChange(false);
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    setIsListening(false);
    onListeningChange(false);
  };

  const startListening = () => {
    try {
      setIsListening(true);
      onListeningChange(true);
      recognition.start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setIsListening(false);
      onListeningChange(false);
    }
  };

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      recognition.abort();
    };
  }, []);

  return (
    <div className={`voice-input-container ${isListening ? "listening" : ""}`}>
      <button
        onClick={startListening}
        disabled={isListening}
        className={`voice-button ${isListening ? "shake" : ""}`}
      >
        {isListening ? "Listening..." : "🎤 Start Voice Input"}
      </button>
    </div>
  );
};

export default VoiceInput;
