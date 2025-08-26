// src/components/DocumentDemo.js
import React, { useState } from "react";
import { daysUntil } from "../utils/dateUtils";

const DocumentItem = ({ doc }) => {
  const days = daysUntil(doc.expiry);
  const daysLeftText = `${days} day${days !== 1 ? "s" : ""} left`;
  const isExpiringSoon = days <= 30;
  const isExpired = days < 0;

  let statusColor = "text-gray-700 dark:text-gray-300"; // <-- MODIFIED: Added dark default
  if (isExpiringSoon) statusColor = "text-orange-600 dark:text-orange-400";
  if (isExpired) statusColor = "text-red-600 dark:text-red-400";

  return (
    // <-- MODIFIED: Added dark mode styles to list items
    <div className="flex items-center justify-between border dark:border-gray-700 rounded-lg p-3 transition-shadow hover:shadow-md dark:hover:bg-gray-700/50">
      <div>
        <div className="font-medium">{doc.name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{doc.docNumber}</div>
      </div>
      <div className="text-right">
        <div className={`font-semibold ${statusColor}`}>
          {isExpired ? "Expired" : doc.expiry}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {isExpired ? `on ${doc.expiry}` : daysLeftText}
        </div>
      </div>
    </div>
  );
};

export const DocumentDemo = ({ docs, onAddDocument }) => {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !expiry) return;
    onAddDocument({
      id: Date.now(),
      name,
      docNumber: number || "N/A",
      expiry,
    });
    setName("");
    setNumber("");
    setExpiry("");
  };

  return (
    // <-- MODIFIED: Added dark mode styles to container
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="font-bold text-lg mb-4">Quick Demo — My Documents</h3>
      
      {/* <-- MODIFIED: Added dark mode styles to form inputs */}
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <input
          className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Document name (e.g., Passport)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Document number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
          <input
            type="date"
            className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-semibold hover:bg-blue-700">
          Add Document
        </button>
      </form>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
        {docs.map(doc => <DocumentItem key={doc.id} doc={doc} />)}
      </div>
    </div>
  );
};