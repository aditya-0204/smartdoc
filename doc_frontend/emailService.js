const sendDocumentEmail = async (userEmail, documentName, documentNo, documentExpiry) => {
  if (!process.env.BREVO_API_KEY) return;

  let daysLeft = "N/A";
  if (documentExpiry && documentExpiry !== "N/A") {
    daysLeft = Math.ceil((new Date(documentExpiry) - new Date()) / (1000 * 60 * 60 * 24));
  }
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { email: "smartdocoffical@gmail.com", name: "SmartDoc Official" },
        to: [{ email: userEmail }],
        subject: `Document Added: ${documentName}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc; color: #334155;">
            <h2 style="color: #2563eb; margin-top: 0;">SmartDoc Notification</h2>
            <p>You have added a document successfully.</p>
            <p style="background: #e2e8f0; padding: 10px; border-radius: 6px;">
              <strong>Document (${documentName}, #${documentNo})</strong><br/>
              It will expire on <strong>${documentExpiry}</strong> (${daysLeft} days left).
            </p>
            <p style="color: #64748b; font-size: 12px; margin-top: 20px;">- SmartDoc</p>
          </div>
        `
      })
    });
    
    const data = await response.json();
    if (data.messageId) {
      console.log(`Email sent successfully to ${userEmail}`);
    }
  } catch (error) {
    console.error("Failed to send email: ", error);
  }
};

module.exports = { sendDocumentEmail };