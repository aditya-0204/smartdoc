import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Features } from "./components/Features";
import { AuthModal } from "./components/AuthModal";

import { DocumentDemo } from "./components/DocumentDemo";
import { Dashboard } from "./components/Dashboard";
import { sampleDocs } from "./data/documents";

const API_BASE_URL = "http://localhost:5000";

export default function App() {
  // Initialize user state from localStorage for session persistence
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Store all documents in localStorage, filter by user
  const [docs, setDocs] = useState(() => {
    const allDocs = JSON.parse(localStorage.getItem("smartdoc_docs") || "[]");
    if (!user) return [];
    return allDocs.filter((doc) => doc.userEmail === user.email);
  });
  const [isModalOpen, setModalOpen] = useState(false);

  // Initialize theme from localStorage or OS preference
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // Effect for theme persistence
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === "light" ? "dark" : "light");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Effect for user session persistence
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // --- Main Authentication Handler ---
  const handleAuth = (isLogin, formData) => {
    const users = JSON.parse(localStorage.getItem("smartdoc_users")) || [];

    if (formData.google) {
      let foundUser = users.find((u) => u.email === formData.email);
      if (!foundUser) {
        foundUser = {
          name: formData.name || "Google User",
          email: formData.email,
          password: "",
          google: true,
        };
        const updatedUsers = [...users, foundUser];
        localStorage.setItem("smartdoc_users", JSON.stringify(updatedUsers));
      }
      setUser({ name: formData.name, email: formData.email });
      setModalOpen(false);
      return;
    }

    if (isLogin) {
      const foundUser = users.find((u) => u.email === formData.email);
      if (foundUser && foundUser.password === formData.password) {
        setUser({ name: foundUser.name, email: foundUser.email });
        setModalOpen(false);
      } else {
        alert("Invalid email or password.");
      }
    } else {
      const userExists = users.some((u) => u.email === formData.email);
      if (userExists) {
        alert("An account with this email already exists.");
      } else {
        const newUser = {
          name: formData.name || "New User",
          email: formData.email,
          password: formData.password,
        };
        const updatedUsers = [...users, newUser];
        localStorage.setItem("smartdoc_users", JSON.stringify(updatedUsers));
        setUser({ name: newUser.name, email: newUser.email });
        setModalOpen(false);
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleAddDocument = (newDoc) => {
    const docWithUser = { ...newDoc, userEmail: user.email };
    const allDocs = JSON.parse(localStorage.getItem("smartdoc_docs") || "[]");
    const updatedDocs = [docWithUser, ...allDocs];
    localStorage.setItem("smartdoc_docs", JSON.stringify(updatedDocs));
    setDocs(updatedDocs.filter((doc) => doc.userEmail === user.email));
  };

  // --- UPDATED: Delete document with Backend API call ---
  const handleDeleteDocument = async (docId) => {
    try {
      // 1. Send DELETE request to Express backend
      const response = await fetch(`${API_BASE_URL}/api/documents/${docId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete document on server. Status: ${response.status}`);
      }

      // 2. Synchronize localStorage
      const allDocs = JSON.parse(localStorage.getItem("smartdoc_docs") || "[]");
      const updatedDocs = allDocs.filter(
        (doc) => (doc.id || doc._id) !== docId
      );
      localStorage.setItem("smartdoc_docs", JSON.stringify(updatedDocs));

      // 3. Update React UI state
      setDocs(updatedDocs.filter((doc) => doc.userEmail === user.email));
      console.log(`Successfully deleted document: ${docId}`);
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete document from the server. Please check if the backend is running.");
    }
  };

  // When user changes (login/logout), update docs for that user
  useEffect(() => {
    if (user) {
      const allDocs = JSON.parse(localStorage.getItem("smartdoc_docs") || "[]");
      setDocs(allDocs.filter((doc) => doc.userEmail === user.email));
    } else {
      setDocs([]);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-200 font-sans transition-colors duration-300">
      <Header
        user={user}
        onLoginClick={() => setModalOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        toggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
      />

      <main>
        {user ? (
          <Dashboard
            user={user}
            docs={docs}
            onDeleteDocument={handleDeleteDocument}
            onAddDocument={handleAddDocument}
          />
        ) : (
          <>
            <section className="container mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl lg:text-5xl font-extrabold mb-4 leading-tight">
                  SmartDoc — Secure, Smart Document Management
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                  Upload, scan, and securely manage your documents with reminders.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Get Started For Free
                </button>
              </div>
              <DocumentDemo docs={sampleDocs} onAddDocument={handleAddDocument} />
            </section>
            <Features />
          </>
        )}
      </main>

      <Footer />

      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onAuthSubmit={handleAuth}
      />
    </div>
  );
}