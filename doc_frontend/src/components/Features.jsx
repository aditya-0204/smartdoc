// src/components/Features.js
import React from "react";

const FeatureCard = ({ title, children }) => (
  // <-- MODIFIED: Added dark mode styles to feature cards
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
    <h4 className="font-semibold text-lg mb-2">{title}</h4>
    <p className="text-sm text-gray-600 dark:text-gray-400">{children}</p>
  </div>
);

export const Features = () => (
  <>
    {/* HOW IT WORKS */}
    <section id="howitworks" className="bg-gray-100 dark:bg-black/20 py-16">
      <div className="container mx-auto px-6">
        <h3 className="text-3xl font-bold text-center mb-10">How It Works</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard title="1. Upload or Scan">
            Users upload a PDF/image or capture a document via camera. Supported formats: JPG, PNG, PDF.
          </FeatureCard>
          <FeatureCard title="2. AI Extraction">
            The backend sends the file to AWS Textract. The service returns structured fields like name, document number, and expiry date.
          </FeatureCard>
          <FeatureCard title="3. Store & Remind">
            Metadata is stored in a secure database, and a scheduled job sends email/SMS alerts before expiry.
          </FeatureCard>
        </div>
      </div>
    </section>

    {/* SECURITY */}
    <section className="container mx-auto px-6 py-16">
      <h3 className="text-3xl font-bold text-center mb-10">Security & Privacy First</h3>
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm">
        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-3">
          <li><strong>End-to-End Encryption:</strong> HTTPS/TLS for all traffic and server-side encryption for files at rest in S3.</li>
          <li><strong>Secure Authentication:</strong> Industry-standard authentication to protect your account.</li>
          <li><strong>Principle of Least Privilege:</strong> Backend services use strict IAM roles, ensuring they only access necessary resources.</li>
          <li><strong>Private by Design:</strong> Files are stored in private S3 buckets, accessible only via secure, time-limited signed URLs.</li>
        </ul>
      </div>
    </section>
  </>
);