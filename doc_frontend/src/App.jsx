import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Features } from "./components/Features";
import { AuthModal } from "./components/AuthModal";

import { DocumentDemo } from "./components/DocumentDemo";
import { Dashboard } from "./components/Dashboard";
import { sampleDocs } from "./data/documents";

const API_BASE_URL = "https://smartdoc-nj3x.onrender.com";

export default function App() {
  // 1. User state
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // 2. Documents state - Direct local fallback taaki UI instant render ho bina blank hue
  const [docs, setDocs] = useState(() => {
    try {
      const allDocs = JSON.parse(localStorage.getItem("smartdoc_docs") || "[]");
      const savedUser = JSON.parse(localStorage.getItem("user") || "null");
      if (!savedUser) return [];
      return allDocs.filter((doc) => doc.userEmail === savedUser.email);
    } catch {
      return [];
    }
  });

  const [isModalOpen, setModalOpen] = useState(false);

  // 3. Theme persistence
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === "light" ? "dark" : "light");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // 4. Fetch docs directly from MongoDB on login / reload (Normalizes _id to id)
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user || !user.email) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/documents?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const rawData = await res.json();
          const items = Array.isArray(rawData) ? rawData : (rawData.data || []);
          
          // ID normalization taaki Dashboard/UI components break na hon
          const normalized = items.map((doc) => ({
            ...doc,
            id: doc.id || doc._id,
            _id: doc._id || doc.id
          }));

          setDocs(normalized);
          localStorage.setItem("smartdoc_docs", JSON.stringify(normalized));
        }
      } catch (err) {
        console.error("Error fetching docs from MongoDB:", err);
      }
    };

    fetchDocuments();
  }, [user]);

  // Auth Handler
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
      const userData = { name: formData.name, email: formData.email };
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      setModalOpen(false);
      return;
    }

    if (isLogin) {
      const foundUser = users.find((u) => u.email === formData.email);
      if (foundUser && foundUser.password === formData.password) {
        const userData = { name: foundUser.name, email: foundUser.email };
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
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
        localStorage.setItem("user", JSON.stringify({ name: newUser.name, email: newUser.email }));
        setModalOpen(false);
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    setDocs([]);
  };

  // Add Document (POST to Atlas)
const [isSubmitting, setIsSubmitting] = useState(false);
const handleAddDocument = async (newDocData) => {
  if (!user?.email) return;
  if (isSubmitting) return;
  try {
    setIsSubmitting(true);
    const response = await fetch(`${API_BASE_URL}/api/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...newDocData,
        userEmail: user.email,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save document on database");
    }

    const resData = await response.json();
    const rawDoc = resData.data || resData;

    const savedDoc = {
      ...rawDoc,
      id: rawDoc._id || rawDoc.id,
      _id: rawDoc._id || rawDoc.id,
    };

    setDocs((prevDocs) => {
      const exists = prevDocs.some((d) => (d._id || d.id) === savedDoc.id);
      if (exists) return prevDocs;
      const updated = [savedDoc, ...prevDocs];
      localStorage.setItem("smartdoc_docs", JSON.stringify(updated));
      return updated;
    });
  } catch (error) {
    console.error("Add Document Error:", error);
    alert("Server par document save nahi ho paya.");
  } finally {
    setIsSubmitting(false); 
  }
};

  // Delete Document (DELETE on Atlas)
  const handleDeleteDocument = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete document on server. Status: ${response.status}`);
      }

      const allDocs = JSON.parse(localStorage.getItem("smartdoc_docs") || "[]");
      const updatedDocs = allDocs.filter((doc) => (doc.id || doc._id) !== id);
      localStorage.setItem("smartdoc_docs", JSON.stringify(updatedDocs));

      setDocs((prev) => prev.filter((doc) => (doc.id || doc._id) !== id));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Delete failed. Please check network/backend.");
    }
  };

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