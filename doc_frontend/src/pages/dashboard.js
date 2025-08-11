import React, { useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { SunIcon, MoonIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from "@heroicons/react/24/outline";

const Dashboard = () => {
  const [darkMode, setDarkMode] = useState(false);
  const userName = "Shaurya"; // Replace with actual user name from backend/token

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/"; // Redirect to login
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 shadow bg-white dark:bg-gray-800">
        <h1 className="text-xl font-semibold">Hello, {userName}!</h1>

        {/* Profile Dropdown */}
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
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={toggleDarkMode}
                      className={`${
                        active ? "bg-gray-100 dark:bg-gray-600" : ""
                      } flex items-center w-full px-4 py-2 text-sm`}
                    >
                      {darkMode ? (
                        <>
                          <SunIcon className="w-5 h-5 mr-2" />
                          Light Mode
                        </>
                      ) : (
                        <>
                          <MoonIcon className="w-5 h-5 mr-2" />
                          Dark Mode
                        </>
                      )}
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={`${
                        active ? "bg-gray-100 dark:bg-gray-600" : ""
                      } flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400`}
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
                      Logout
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      {/* Main content */}
      <div className="p-6">
        <h2 className="text-2xl font-bold">Welcome to your dashboard 👋</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Start uploading and managing your documents.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;