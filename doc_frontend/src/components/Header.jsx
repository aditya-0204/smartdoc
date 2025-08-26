// src/components/Header.js
import React from 'react';

// Simple SVG icons for the theme toggle
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;

export const Header = ({ user, onLoginClick, onLogout, theme, toggleTheme }) => {
  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white rounded-md px-3 py-2 font-bold text-lg">SD</div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">SmartDoc</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">AI-Powered Document Management</p>
          </div>
        </div>

        <nav className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm">Hi, <strong>{user.name}</strong></span>
              <button onClick={onLogout} className="text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1.5 rounded-md transition-colors">
                Logout
              </button>
            </div>
          ) : (
            <button onClick={onLoginClick} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
              Login / Sign up
            </button>
          )}
          
          <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
        </nav>
      </div>
    </header>
  );
};