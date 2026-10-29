export const sendDocumentToLambda = async (document, userEmail) => {
  try {
    // Call the local backend API
    const response = await fetch("https://smartdoc-nj3x.onrender.com/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail,
        name: document.name,
        docNumber: document.docNumber,
        expiry: document.expiry,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend returned an error:", response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log("Document saved successfully:", data);
    return data;
  } catch (err) {
    console.error("Error sending document to backend:", err);
  }
};