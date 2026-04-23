import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App.jsx";
import "./index.css";

// Variables fallback pour exécuter l'app localement hors Canvas Firebase.
if (typeof window.__app_id === "undefined") window.__app_id = "fag-2026-prod";
if (typeof window.__firebase_config === "undefined") {
  window.__firebase_config = JSON.stringify({
    apiKey: "demo-api-key",
    authDomain: "demo.firebaseapp.com",
    projectId: "demo",
    storageBucket: "demo.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:demo"
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
