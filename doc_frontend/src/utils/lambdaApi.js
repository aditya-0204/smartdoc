export const sendDocumentToLambda = async (document, userEmail) => {
  try {
    // 1️⃣ Call the add-document Lambda
    const response = await fetch(
      "https://msr8m57sq1.execute-api.eu-north-1.amazonaws.com/prod/add-document",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          name: document.name,
          docNumber: document.docNumber,
          expiry: document.expiry
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lambda returned an error:", response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log("Add-document Lambda response:", data);

    // 2️⃣ Call the daily reminder Lambda immediately
    try {
      const reminderResponse = await fetch(
        "https://msr8m57sq1.execute-api.eu-north-1.amazonaws.com/prod/daily-reminder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}) // empty body, as your daily reminder Lambda does not need input
        }
      );

      if (!reminderResponse.ok) {
        const reminderText = await reminderResponse.text();
        console.error("Daily reminder Lambda returned an error:", reminderResponse.status, reminderText);
      } else {
        console.log("Daily reminder Lambda triggered successfully!");
      }
    } catch (reminderErr) {
      console.error("Error calling daily reminder Lambda:", reminderErr);
    }

  } catch (err) {
    console.error("Error sending document to Lambda:", err);
  }
};
