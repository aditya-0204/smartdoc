// src/utils/api.js

// ✅ Exported properly so Dashboard.jsx can import it
export async function sendDataToBackend(documentData) {
  const apiUrl =
    "https://smartdoc-nj3x.onrender.com/api/documents";

  console.log("📡 Sending data to backend:", JSON.stringify(documentData));

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(documentData),
    });

    const result = await response.json();

    if (response.ok) {
      alert("Document saved and notifications have been scheduled!");
    } else {
      console.error("Error from backend:", result);
      alert(`There was an error: ${result.message}`);
    }
  } catch (error) {
    console.error("🚨 Failed to send data:", error);
    alert("Failed to connect to the backend. Please check the console.");
  }
}
