// import React, { useState } from "react";
// import VoiceInput from "./components/VoiceInput";
// import ChatBox from "./components/ChatBox";
// import ProductList from "./components/ProductList";
// import "./App.css";

// function App() {
//   const [messages, setMessages] = useState([]);
//   const [products, setProducts] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [activeTab, setActiveTab] = useState("chat");
//   const [sessionId, setSessionId] = useState(generateSessionId()); // Generate session ID

//   // Generate a unique session ID
//   function generateSessionId() {
//     return Math.random().toString(36).substring(2, 15);
//   }

//   // Handle both voice and text input
//   const handleUserInput = async (inputText) => {
//     setIsLoading(true);
//     setMessages((prev) => [...prev, { text: inputText, isBot: false }]);

//     try {
//       const response = await fetch(
//         "http://localhost:5000/api/process-request",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ query: inputText, sessionId }), // Include sessionId
//         }
//       );

//       const data = await response.json();
//       setProducts(data.products);
//       setMessages((prev) => [...prev, { text: data.botResponse, isBot: true }]);

//       // Reset session if conversation is complete
//       if (data.isComplete) {
//         setSessionId(generateSessionId()); // Generate a new session ID
//       }
//     } catch (error) {
//       setMessages((prev) => [
//         ...prev,
//         { text: "Sorry, I couldn't fetch results.", isBot: true },
//       ]);
//     }
//     setIsLoading(false);
//   };

//   return (
//     <div className="app">
//       <h1>ChoiceMate - Your Shopping Assistant 🛒</h1>

//       {/* Tab Navigation */}
//       <div className="tabs">
//         <button
//           className={`tab ${activeTab === "chat" ? "active" : ""}`}
//           onClick={() => setActiveTab("chat")}
//         >
//           Chat Input
//         </button>
//         <button
//           className={`tab ${activeTab === "voice" ? "active" : ""}`}
//           onClick={() => setActiveTab("voice")}
//         >
//           Voice Input
//         </button>
//       </div>

//       {/* Tab Content */}
//       <div className="tab-content">
//         {activeTab === "chat" && <ChatBox onTextSubmit={handleUserInput} />}
//         {activeTab === "voice" && <VoiceInput onVoiceInput={handleUserInput} />}
//       </div>

//       {/* Display Messages */}
//       <div className="chat-container">
//         <div className="messages">
//           {messages.map((msg, index) => (
//             <div
//               key={index}
//               className={`message ${msg.isBot ? "bot" : "user"}`}
//             >
//               {msg.text}
//             </div>
//           ))}
//           {isLoading && (
//             <div className="message bot">...</div>
//           )}
//         </div>
//       </div>

//       <ProductList products={products} />
//     </div>
//   );
// }

// export default App;
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      return;
    }

    fetch("http://localhost:5000/api/user", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`, // Include the token in the request
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            user ? <Navigate to="/dashboard" /> : <Auth setUser={setUser} />
          }
        />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} /> : <Navigate to="/" />}
        />
        <Route path="/auth/callback" element={<Auth setUser={setUser} />} />
      </Routes>
    </Router>
  );
}

export default App;
