// src/components/DocumentTable.js
import React from 'react';
import { getDocumentStatus } from '../utils/dateUtils';

const StatusBadge = ({ status }) => {
  const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
  const colorClasses = {
    Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'Expiring Soon': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    Expired: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };
  return <span className={`${baseClasses} ${colorClasses[status.text]}`}>{status.text}</span>;
};

export const DocumentTable = ({ docs, onDelete }) => {
  if (docs.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-8">You haven't added any documents yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Document Name</th>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Document #</th>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Expiry Date</th>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Status</th>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Actions</th>
          </tr>
        </thead>
        <tbody className="text-gray-700 dark:text-gray-300">
          {docs.map(doc => {
            const status = getDocumentStatus(doc.expiry);
            return (
              <tr key={doc.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="py-3 px-4">{doc.name}</td>
                <td className="py-3 px-4 font-mono text-sm">{doc.docNumber}</td>
                <td className="py-3 px-4">{doc.expiry}</td>
                <td className="py-3 px-4"><StatusBadge status={status} /></td>
                <td className="py-3 px-4">
                  <button onClick={() => onDelete(doc.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 font-medium text-sm">
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