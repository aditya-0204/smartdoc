// src/components/OcrUploader.jsx
import React, { useState } from 'react';

// A unique ID generator for file names to prevent overwrites in S3
import { v4 as uuidv4 } from 'uuid';

const API_ENDPOINT = 'https://1hsercvihl.execute-api.eu-north-1.amazonaws.com';

export const OcrUploader = ({ onUploadComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage('Preparing secure upload...');

    try {
      // STEP 1: Get a pre-signed URL from our new Lambda function
      const uniqueFileName = `${uuidv4()}-${file.name}`;

      const getUrlResponse = await fetch(`${API_ENDPOINT}/get-upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: uniqueFileName,
          fileType: file.type,
        }),
      });

      if (!getUrlResponse.ok) {
        throw new Error('Could not get a secure link to upload the file.');
      }

      const { uploadURL, key } = await getUrlResponse.json();
      console.log('Received pre-signed URL:', uploadURL);
      setStatusMessage('Uploading document securely...');

      // STEP 2: Upload the file directly to S3 using the pre-signed URL
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Secure upload to S3 failed.');
      }

      // STEP 3 (Updated): The upload is complete. The backend will process it automatically.
      setStatusMessage('Upload complete! Analysis starting on the server...');
      
      // Notify the parent component (e.g., the dashboard) to refresh its data after a short delay
      if (onUploadComplete) {
        setTimeout(() => {
            onUploadComplete();
        }, 2000); // 2-second delay to allow backend trigger to fire
      }

    } catch (error) {
      console.error('Upload process failed:', error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      // Keep the final status message for a few seconds before clearing
      setTimeout(() => {
        setIsProcessing(false);
        setStatusMessage('');
      }, 5000);
    }
  };

  return (
    <div className="p-4 border-2 border-dashed dark:border-gray-600 rounded-lg text-center">
      <label htmlFor="file-upload" className="font-semibold text-sm mb-2 block">
        Upload a Document (Image or PDF)
      </label>
      
      <input
        id="file-upload"
        type="file"
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/50 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100"
        disabled={isProcessing}
      />
      
      {isProcessing && (
        <div className="mt-4">
          <p className="text-sm dark:text-gray-300 animate-pulse">{statusMessage}</p>
        </div>
      )}
    </div>
  );
};