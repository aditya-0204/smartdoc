import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Features } from "./components/Features";
import { AuthModal } from "./components/AuthModal";

import { DocumentDemo } from "./components/DocumentDemo";
import { Dashboard } from "./components/Dashboard";
import { sampleDocs } from "./data/documents";


export default function App() {
  // Initialize user state from localStorage for session persistence
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Store all documents in localStorage, filter by user
  const [docs, setDocs] = useState(() => {
    const allDocs = JSON.parse(localStorage.getItem('smartdoc_docs') || '[]');
    if (!user) return [];
    return allDocs.filter(doc => doc.userEmail === user.email);
  });
  const [isModalOpen, setModalOpen] = useState(false);

  // Initialize theme from localStorage or OS preference
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Effect for theme persistence
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Effect for user session persistence
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);


  // --- MODIFIED: The Main Authentication Handler ---
  const handleAuth = (isLogin, formData) => {
    // Get our "user database" from localStorage, or start with an empty array
    const users = JSON.parse(localStorage.getItem('smartdoc_users')) || [];

    // Google login/signup flow
    if (formData.google) {
      let foundUser = users.find(u => u.email === formData.email);
      if (!foundUser) {
        // Auto-register Google user
        foundUser = {
          name: formData.name || "Google User",
          email: formData.email,
          password: '',
          google: true
        };
        const updatedUsers = [...users, foundUser];
        localStorage.setItem('smartdoc_users', JSON.stringify(updatedUsers));
      }
      setUser({ name: formData.name, email: formData.email });
      setModalOpen(false);
      return;
    }

    if (isLogin) {
      // --- LOGIN LOGIC ---
      // 1. Find the user by email
      const foundUser = users.find(u => u.email === formData.email);

      // 2. Check if user exists and password matches
      if (foundUser && foundUser.password === formData.password) {
        // Success! Log them in.
        setUser({ name: foundUser.name, email: foundUser.email });
        setModalOpen(false);
      } else {
        // Failed login
        alert("Invalid email or password.");
      }
    } else {
      // --- SIGN UP LOGIC ---
      // 1. Check if the email is already registered
      const userExists = users.some(u => u.email === formData.email);

      if (userExists) {
        alert("An account with this email already exists.");
      } else {
        // 2. Create the new user object (omitting password from what we set in state)
        const newUser = {
          name: formData.name || "New User",
          email: formData.email,
          password: formData.password, // This is stored but not set in active state
        };

        // 3. Add the new user to our list and save it
        const updatedUsers = [...users, newUser];
        localStorage.setItem('smartdoc_users', JSON.stringify(updatedUsers));

        // 4. Automatically log the new user in
        setUser({ name: newUser.name, email: newUser.email });
        setModalOpen(false);
      }
    }
  };


  const handleLogout = () => {
    setUser(null);
  };
  const [demoDocs, setDemoDocs] = useState(sampleDocs);


  const handleAddDocument = (newDoc, isLoggedInUser) => {
    if (isLoggedInUser) {
      // attach user email for persistence
      const docWithUser = { ...newDoc, userEmail: user.email };
      const allDocs = JSON.parse(localStorage.getItem('smartdoc_docs') || '[]');
      const updatedDocs = [docWithUser, ...allDocs];
      localStorage.setItem('smartdoc_docs', JSON.stringify(updatedDocs));
      setDocs(updatedDocs.filter((doc) => doc.userEmail === user.email));
    } else {
      // demo mode (not logged in) → just show temporarily
      setDocs((prevDocs) => [newDoc, ...prevDocs]);
    }
  };



  const handleDeleteDocument = (docId) => {
    const allDocs = JSON.parse(localStorage.getItem('smartdoc_docs') || '[]');
    const updatedDocs = allDocs.filter(doc => doc.id !== docId);
    localStorage.setItem('smartdoc_docs', JSON.stringify(updatedDocs));
    setDocs(updatedDocs.filter(doc => doc.userEmail === user.email));
  };


  // When user changes (login/logout), update docs for that user
  useEffect(() => {
    if (user) {
      const allDocs = JSON.parse(localStorage.getItem('smartdoc_docs') || '[]');
      setDocs(allDocs.filter(doc => doc.userEmail === user.email));
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
        toggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
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
          // ... Landing page content
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
              <DocumentDemo
                docs={user ? docs : demoDocs}
                onAddDocument={(newDoc) => {
                  if (user) {
                    handleAddDocument(newDoc, true);
                  } else {
                    setDemoDocs(prev => [newDoc, ...prev]);
                  }
                }}
              />
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