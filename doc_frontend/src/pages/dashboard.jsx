// src/pages/dashboard.jsx

import React, { useState, Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import {
  SunIcon,
  MoonIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

import { Dashboard as DashboardContent } from "../components/Dashboard.jsx";

const DashboardPage = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [user] = useState({
    name: "Shaurya",
    email: "shaurya@example.com",
  });
  const [docs, setDocs] = useState([]);

  const handleAddDocument = (newDoc) => {
    setDocs((prevDocs) => [...prevDocs, newDoc]);
  };

  const handleDeleteDocument = (docId) => {
    setDocs((prevDocs) => prevDocs.filter((doc) => doc.id !== docId)); // ✅ matches id
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 shadow bg-white dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Hello, {user.name}!
        </h1>
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button className="flex items-center space-x-2 rounded-full focus:outline-none">
            <UserCircleIcon className="w-8 h-8 text-gray-600 dark:text-white" />
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {/* Menu items go here */}
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      {/* Dashboard content */}
      <DashboardContent
        user={user}
        docs={docs}
        onAddDocument={handleAddDocument}
        onDeleteDocument={handleDeleteDocument}
      />
    </div>
  );
};

export default DashboardPage;
