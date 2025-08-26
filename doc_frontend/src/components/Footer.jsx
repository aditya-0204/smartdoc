// src/components/Footer.js
import React from "react";

export const Footer = () => {
  return (
    // <-- MODIFIED: Added dark mode styles
    <footer className="bg-gray-100 dark:bg-gray-950/50 border-t dark:border-gray-800">
      <div className="container mx-auto px-6 py-6 text-sm text-gray-600 dark:text-gray-400 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>© 2025 SmartDoc. All Rights Reserved.</div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Privacy Policy</a>
          <a href="#" className="hover:text-blue-600 dark:hove  r:text-blue-400">Terms of Service</a>
          <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Contact Us</a>
        </div>
      </div>
    </footer>
  );
};