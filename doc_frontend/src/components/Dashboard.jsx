// src/components/Dashboard.jsx
import React, { useMemo, useState } from "react";
import { DocumentTable } from "./DocumentTable";
import { OcrUploader } from "./OcrUploader";
import { getDocumentStatus } from "../utils/dateUtils";
import { sendDocumentToLambda } from "../utils/lambdaApi";

export const Dashboard = ({ user, docs, onDeleteDocument, onAddDocument }) => {
  const [scannedPreview, setScannedPreview] = useState(null);
  // State for delete confirmation modal
  const [docToDelete, setDocToDelete] = useState(null);

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
      console.log("Sending document to Lambda:", newDoc, "user email:", user?.email);

      await sendDocumentToLambda(newDoc, user?.email);

      // Add document to frontend state
      onAddDocument(newDoc);
    } catch (error) {
      console.error("Failed to send document to Lambda:", error);
    }
  };

  // 1. User clicks delete in table -> open modal
  const handleRequestDelete = (docId) => {
    const targetDoc = docs?.find((d) => (d.id || d._id) === docId) || { id: docId, name: "this document" };
    setDocToDelete(targetDoc);
  };

  // 2. User confirms in modal -> execute deletion
  const handleConfirmDelete = () => {
    if (docToDelete) {
      const idToDelete = docToDelete.id || docToDelete._id;
      onDeleteDocument(idToDelete);
      setDocToDelete(null);
    }
  };

  // 3. User cancels -> close modal
  const handleCancelDelete = () => {
    setDocToDelete(null);
  };

  // Stats calculation for Total / Expiring Soon / Expired
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
    <div className="container mx-auto px-6 py-8 relative">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
        Welcome back, {user?.name || "Guest"}!
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Manage your documents and track expiry dates.
      </p>

      {/* Stats cards */}
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

      {/* Extracted Text Preview */}
      {scannedPreview?.text && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold mb-2">Extracted Text:</h4>
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {scannedPreview.text}
          </p>
        </div>
      )}

      {/* My Documents Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">My Documents</h3>
        <DocumentTable docs={docs} onDelete={handleRequestDelete} />
      </div>

      {/* Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Confirm Delete
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-red-500">
                "{docToDelete.name || "this document"}"
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};