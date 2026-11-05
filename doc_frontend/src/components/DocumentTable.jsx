// src/components/DocumentTable.jsx
import React from 'react';
import { getDocumentStatus } from '../utils/dateUtils';

const StatusBadge = ({ status }) => {
  const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
  const colorClasses = {
    Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'Expiring Soon': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    Expired: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };
  return <span className={`${baseClasses} ${colorClasses[status.text] || colorClasses['Expiring Soon']}`}>{status.text}</span>;
};

export const DocumentTable = ({ docs, onDelete }) => {
  if (!docs || docs.length === 0) {
    return <p className="text-center text-gray-400 py-8">You haven't added any documents yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-800 text-gray-300">
          <tr>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Document Name</th>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Document ID</th>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Expiry Date</th>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Status</th>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Actions</th>
          </tr>
        </thead>
        <tbody className="text-gray-100 divide-y divide-gray-700">
          {docs.map((doc, index) => {
            const docId = doc.id || doc._id || `doc-${index}`;
            const docName = doc.name || doc.documentType || doc.type || "Untitled Document";
            const docNum = doc.docNumber || doc.documentNumber || doc.number || "N/A";
            const docExpiry = doc.expiry || doc.expiryDate || "N/A";
            const status = getDocumentStatus(docExpiry);

            return (
              <tr key={docId} className="border-b border-gray-700 hover:bg-gray-800/50 transition">
                <td className="py-3 px-4 font-medium text-white">{docName}</td>
                <td className="py-3 px-4 font-mono text-sm text-gray-200">{docNum}</td>
                <td className="py-3 px-4 text-gray-200">{docExpiry}</td>
                <td className="py-3 px-4"><StatusBadge status={status} /></td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => onDelete(docId)}
                    className="text-red-400 hover:text-red-300 font-medium text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};