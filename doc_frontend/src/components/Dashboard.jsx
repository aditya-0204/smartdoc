// src/components/Dashboard.js
import React, { useMemo } from 'react';
import { StatCard } from './StatCard';
import { DocumentTable } from './DocumentTable';
import { getDocumentStatus } from '../utils/dateUtils';
import { OcrUploader } from './OcrUploader'; // <-- Import the new component

export const Dashboard = ({ user, docs, onDeleteDocument, onAddDocument }) => { // <-- Add onAddDocument prop
  const stats = useMemo(() => {
    // ... (stats calculation remains the same)
    const expiringSoon = docs.filter(doc => getDocumentStatus(doc.expiry).text === 'Expiring Soon').length;
    const expired = docs.filter(doc => getDocumentStatus(doc.expiry).text === 'Expired').length;
    return {
      total: docs.length,
      expiringSoon,
      expired,
    };
  }, [docs]);

  // This function will be called by the uploader
  const handleScanComplete = (scannedData) => {
    const newDoc = {
      id: Date.now(),
      ...scannedData
    };
    onAddDocument(newDoc);
    alert('Scanned document has been added to your list!');
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Welcome back, {user.name}!</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Here's a summary of your documents.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Documents" value={stats.total} color="blue" />
        <StatCard title="Expiring Soon" value={stats.expiringSoon} color="orange" />
        <StatCard title="Expired" value={stats.expired} color="red" />
      </div>

      {/* OCR Uploader Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h3 className="text-xl font-bold mb-4">Scan New Document</h3>
        <OcrUploader onScanComplete={handleScanComplete} />
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Your Documents</h3>
        <DocumentTable docs={docs} onDelete={onDeleteDocument} />
      </div>
    </div>
  );
};