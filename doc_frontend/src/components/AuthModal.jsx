// src/components/AuthModal.js
import React, { useState, useEffect, useRef } from "react";
import { loadGoogleScript, initializeGoogleSignIn } from '../utils/googleAuth';


export const AuthModal = ({ isOpen, onClose, onAuthSubmit }) => {
  const [isLoginMode, setLoginMode] = useState(true);
  const googleBtnRef = useRef(null);
  const GOOGLE_CLIENT_ID = '414111073790-ba32ksomu68mifsptq4vm6jn1m6c4c14.apps.googleusercontent.com';

  useEffect(() => {
    if (!isOpen) return;
    // Remove any previous Google button to avoid duplicates
    const btn = document.getElementById('google-signin-btn');
    if (btn) btn.innerHTML = '';

    // Always (re)initialize the Google button
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      loadGoogleScript(GOOGLE_CLIENT_ID, () => {
        initializeGoogleSignIn({
          clientId: GOOGLE_CLIENT_ID,
          onSuccess: handleGoogleSuccess,
          onError: handleGoogleError,
          elementId: 'google-signin-btn',
        });
      });
    } else {
      initializeGoogleSignIn({
        clientId: GOOGLE_CLIENT_ID,
        onSuccess: handleGoogleSuccess,
        onError: handleGoogleError,
        elementId: 'google-signin-btn',
      });
    }
    // eslint-disable-next-line
  }, [isOpen]);

  function handleGoogleSuccess(response) {
    // Parse JWT for user info
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const profile = JSON.parse(jsonPayload);
    // Call onAuthSubmit with Google user info (no password)
    onAuthSubmit(true, {
      name: profile.name,
      email: profile.email,
      password: '',
      google: true
    });
    onClose();
  }

  function handleGoogleError() {
    alert('Google sign-in failed. Please try again.');
  }

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = {
      name: e.target.name?.value,
      email: e.target.email.value,
      password: e.target.password.value,
    };
    onAuthSubmit(isLoginMode, formData);
  };

  return (
    // <-- MODIFIED: Added dark mode styles to the modal container and contents
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-lg shadow-xl p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white">
          ✕
        </button>

        <h3 className="text-2xl font-bold mb-2 dark:text-white">{isLoginMode ? "Login" : "Create Account"}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {isLoginMode ? "Welcome back! Manage your documents securely." : "Get started with SmartDoc and never miss a renewal."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <input name="name" className="w-full border rounded-md px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Full name" required />
          )}
          <input name="email" className="w-full border rounded-md px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Email address" type="email" required />
          <input name="password" className="w-full border rounded-md px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Password" type="password" required />
          <div className="flex flex-col gap-3 pt-2">
            <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-md font-semibold hover:bg-blue-700">
              {isLoginMode ? "Login" : "Create Account"}
            </button>
            <button type="button" onClick={() => setLoginMode(!isLoginMode)} className="w-full border dark:border-gray-600 rounded-md px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
              {isLoginMode ? "Need an account? Sign Up" : "Already have an account? Login"}
            </button>
          </div>
        </form>
        <div className="my-4 flex items-center justify-center">
          <div className="border-t border-gray-300 dark:border-gray-600 w-1/4"></div>
          <span className="mx-2 text-gray-500 dark:text-gray-400 text-xs">or</span>
          <div className="border-t border-gray-300 dark:border-gray-600 w-1/4"></div>
        </div>
        <div id="google-signin-btn" ref={googleBtnRef} className="flex justify-center"></div>
      </div>
    </div>
  );
};