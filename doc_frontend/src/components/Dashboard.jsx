// src/components/Dashboard.jsx
import React, { useMemo, useState } from "react";
import { DocumentTable } from "./DocumentTable";
import { OcrUploader } from "./OcrUploader";
import { getDocumentStatus } from "../utils/dateUtils";
import { sendDocumentToLambda } from "../utils/lambdaApi";

export const Dashboard = ({ user, docs, onDeleteDocument, onAddDocument }) => {
  const [scannedPreview, setScannedPreview] = useState(null);

  const handleScanComplete = async (scannedData) => {
  setScannedPreview(scannedData);

  const newDoc = {
    id: scannedData.id || `doc-${Date.now()}`,
    userEmail: user?.email, // logged-in user email
    name: scannedData.name || scannedData.type || "Untitled",
    docNumber: scannedData.docNumber || scannedData.number || scannedData.id || "N/A",
    documentType: scannedData.type,
    expiry: scannedData.expiry,
    
  };

  try {
    // ✅ Call Lambda to store document and send email
    console.log("Sending document to Lambda:", newDoc, "user email:", user?.email);

    await sendDocumentToLambda(newDoc, user?.email);

    // ✅ Add document to frontend state
    onAddDocument(newDoc);
  } catch (error) {
    console.error("Failed to send document to Lambda:", error);
  }
};

  // ✅ Stats calculation for Total / Expiring Soon / Expired
  const stats = useMemo(() => {
    if (!Array.isArray(docs)) return { total: 0, expiringSoon: 0, expired: 0 };

    const expiringSoon = docs.filter(
      (doc) => getDocumentStatus(doc.expiry).text === "Expiring Soon"
    ).length;
    const expired = docs.filter(
      (doc) => getDocumentStatus(doc.expiry).text === "Expired"
    ).length;

    return { total: docs.length, expiringSoon, expired };
  }, [docs]);

  return (
    <div className="container mx-auto px-6 py-8">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
        Welcome back, {user?.name || "Guest"}!
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Manage your documents and track expiry dates.
      </p>

      {/* ✅ Stats cards with colors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Total Documents</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats.total}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Expiring Soon</h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {stats.expiringSoon}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Expired Documents</h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {stats.expired}
          </p>
        </div>
      </div>

      {/* OCR Uploader */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h3 className="text-xl font-bold mb-4">Upload Document</h3>
        <OcrUploader onScanComplete={handleScanComplete} />
      </div>

      {/* ✅ Extracted Text Preview */}
      {scannedPreview?.text && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold mb-2">Extracted Text:</h4>
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {scannedPreview.text}
          </p>
        </div>
      )}

      {/* ✅ My Documents */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">My Documents</h3>
        <DocumentTable docs={docs} onDelete={onDeleteDocument} />
      </div>
    </div>
  );
};
