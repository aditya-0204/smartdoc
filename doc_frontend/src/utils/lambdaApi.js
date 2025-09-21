export const sendDocumentToLambda = async (document, userEmail) => {
  try {
    const response = await fetch(
      "https://msr8m57sq1.execute-api.eu-north-1.amazonaws.com/prod/add-document",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail,        // the logged-in user’s email
          name: document.name,
          docNumber: document.docNumber,
          expiry: document.expiry
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lambda returned an error:", response.status, errorText);
    } else {
      const data = await response.json();
      console.log("Lambda response:", data);
    }
  } catch (err) {
    console.error("Error sending document to Lambda:", err);
  }
};
