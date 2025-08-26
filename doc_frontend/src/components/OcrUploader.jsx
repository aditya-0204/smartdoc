// src/components/OcrUploader.js
import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
// Import the main pdf.js library from your installed packages
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// --- UPGRADED: More intelligent parsing functions ---
const monthMap = {
  jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
  apr: '04', april: '04', may: '05', jun: '06', june: '06', jul: '07', july: '07',
  aug: '08', august: '08', sep: '09', september: '09', oct: '10', october: '10',
  nov: '11', november: '11', dec: '12', december: '12'
};

const parseDocumentName = (text) => {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('covid-19 vaccination')) return 'COVID-19 Vaccine Certificate';
  if (lowerText.includes('vellore institute')) return 'VIT ID Card';
  if (lowerText.includes('apar id')) return 'Apar ID';
  if (lowerText.includes('passport')) return 'Passport';
  if (lowerText.includes('driving license') || lowerText.includes('driver license')) return "Driver's License";
  if (lowerText.includes('aadhaar')) return 'Aadhaar Card';
  if (lowerText.includes('insurance')) return 'Insurance Policy';
  if (lowerText.includes('id card')) return 'ID Card';
  return 'Scanned Document';
};

const parseExpiryDate = (text) => {
  const match = text.match(/(?:Valid upto|Validity|Valid through|Expiry)[\s—:-]*?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov|december|dec)[\s-]*(\d{4})/i);
  if (match) {
    const month = monthMap[match[1].toLowerCase()];
    const year = match[2];
    return `${year}-${month}-01`;
  }
  const fallbackMatch = text.match(/(?:Expiry)[\s—:-]+(\d{2})-(\d{2})-(\d{2})/i);
   if (fallbackMatch) {
      const day = fallbackMatch[1];
      const month = fallbackMatch[2];
      const year = `20${fallbackMatch[3]}`;
      return `${year}-${month}-${day}`;
  }
  const finalFallback = text.match(/(\d{4}-\d{2}-\d{2})/);
  return finalFallback ? finalFallback[0] : null;
};

// UPDATED: Re-ordered and improved the logic to be more specific
const parseDocumentId = (text) => {
  // Priority 1: Look for the very specific VIT ID format
  let match = text.match(/\b(\d{2}[A-Z]{3,4}\d{4})\b/i);
  if (match) return match[0];

  // Priority 2: Look for a specific "Certificate ID"
  match = text.match(/(?:Certificate ID)\s*(\d+)/i);
  if (match) return match[1];
  
  // Priority 3: Look for the specific "Apar ID" format
  match = text.match(/(?:Apar id|Id)[\s—:-]+([a-zA-Z0-9@]+)/i);
  if (match) return match[1];

  // Priority 4: Look for an Aadhaar number
  match = text.match(/(?:Aadhaar #|Aadhaar Number)[\s:]*X{4,8}(\d{4})/i);
  if (match) return `XXXX-XXXX-${match[1]}`;

  // Priority 5: Look for a generic "Reg id" or "ID No"
  match = text.match(/(?:Reg id|Regid|ID No)[\s—:-]+([A-Z0-9]+)/i);
  if (match) return match[1];

  // Fallback for other generic ID formats
  match = text.match(/[A-Z]\d{7,9}/);
  if (match) return match[0];

  return null; // Return null if no match is found
};
// --- End of parsing functions ---


export const OcrUploader = ({ onScanComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setResult(null);
    setStatusMessage('Starting processing...');

    if (file.type.startsWith('image/')) {
      await processImage(file);
    } else if (file.type === 'application/pdf') {
      await processPdf(file);
    } else {
      alert('Unsupported file type. Please upload an image or a PDF.');
      setIsProcessing(false);
    }
  };

  const processImage = async (file) => {
    setStatusMessage('Recognizing text from image...');
    const { data: { text } } = await Tesseract.recognize(file, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          setStatusMessage(`Recognizing... ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    parseAndSetResults(text);
  };

  const processPdf = async (file) => {
    try {
      setStatusMessage('Loading PDF...');
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);
      fileReader.onload = async () => {
        try {
          const typedarray = new Uint8Array(fileReader.result);
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          let fullText = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            setStatusMessage(`Processing PDF page ${i} of ${pdf.numPages}...`);
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            
            const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
            fullText += text + '\n';
          }
          parseAndSetResults(fullText);
        } catch (pdfError) {
            console.error("Error inside PDF processing: ", pdfError);
            alert(`Failed to process PDF: ${pdfError.message}`);
            setIsProcessing(false);
        }
      };
    } catch (error) {
      console.error("Error setting up PDF reader: ", error);
      alert("Failed to read PDF file.");
      setIsProcessing(false);
    }
  };

  const parseAndSetResults = (text) => {
    const expiryDate = parseExpiryDate(text);
    const docNumber = parseDocumentId(text);
    const docName = parseDocumentName(text);

    setResult({ text, expiryDate, docNumber, docName });
    setIsProcessing(false);
    setStatusMessage('');

    if (expiryDate || docNumber || docName !== 'Scanned Document') {
      onScanComplete({
        name: docName,
        expiry: expiryDate || 'N/A',
        docNumber: docNumber || 'N/A',
      });
    }
  };

  return (
    <div className="p-4 border-2 border-dashed dark:border-gray-600 rounded-lg text-center">
      <label htmlFor="file-upload" className="font-semibold text-sm mb-2 block">Upload an Image or PDF</label>
      
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

      {result && !isProcessing && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left">
          <h4 className="font-bold mb-2">Scan Results</h4>
          <p className="text-sm"><strong>Document Type Found:</strong> {result.docName || 'None'}</p>
          <p className="text-sm"><strong>Expiry Date Found:</strong> {result.expiryDate || 'None'}</p>
          <p className="text-sm"><strong>Document ID Found:</strong> {result.docNumber || 'None'}</p>
          <details className="mt-2">
            <summary className="text-xs cursor-pointer text-gray-500">Show Full Extracted Text</summary>
            <pre className="text-xs whitespace-pre-wrap bg-white dark:bg-gray-700 p-2 rounded mt-1">{result.text}</pre>
          </details>
        </div>
      )}
    </div>
  );
};
