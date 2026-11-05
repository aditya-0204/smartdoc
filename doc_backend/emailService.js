const sendDocumentEmail = async (userEmail, documentName, documentNo, documentExpiry, userName) => {
  if (!process.env.BREVO_API_KEY) return;

  let daysLeft = "N/A";
  if (documentExpiry && documentExpiry !== "N/A") {
    daysLeft = Math.ceil((new Date(documentExpiry) - new Date()) / (1000 * 60 * 60 * 24));
  }

  // Username ya email se numbers hataane ke liye aur clean karne ke liye
  let displayName = userName;
  if (!displayName && userEmail) {
    const rawName = userEmail.split('@')[0].replace(/[0-9]/g, ''); // Yeh numbers (jaise 2003) ko hata dega
    displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  }
  displayName = displayName || "User";

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
        subject: `Official Notice: Document Registered - ${documentName}`,
        htmlContent: `
          <div style="background-color: #f1f5f9; padding: 30px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
              
              <!-- Card Header -->
              <div style="background-color: #1e293b; color: #ffffff; padding: 20px 24px; text-align: left;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">SMARTDOC System Reminder</h3>
              </div>

              <!-- Card Body -->
              <div style="padding: 24px; color: #334155; line-height: 1.6;">
                <p style="margin-top: 0; font-size: 15px;">Dear <strong>${displayName}</strong>,</p>
                <p style="font-size: 15px;">You have successfully added and registered the following document into the SmartDoc system:</p>
                
                <!-- Structured Info Card Box -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; padding: 16px; border-radius: 6px; margin: 20px 0;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; width: 130px;"><strong>document:</strong></td>
                      <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${documentName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;"><strong>document Id:</strong></td>
                      <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${documentNo}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;"><strong>expiry date:</strong></td>
                      <td style="padding: 6px 0; color: #0f172a;">${documentExpiry}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;"><strong>days left:</strong></td>
                      <td style="padding: 6px 0; color: #0f172a;"><span style="background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: 600; display: inline-block;">${daysLeft} days</span></td>
                    </tr>
                  </table>
                </div>

                <p style="font-size: 14px; color: #475569; margin-bottom: 0;">Please keep this record safe for future verification.</p>
              </div>

              <!-- Card Footer / Disclaimer -->
              <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11px; color: #64748b; line-height: 1.5;">
                <strong>Disclaimer:</strong><br/>
                This message was sent from SmartDoc. The contents of this email may contain legally protected confidential or privileged information of “SmartDoc”. If you are not the intended recipient, you should not disseminate, distribute or copy this e-mail. Please notify the sender immediately and destroy all copies of this message and any attachments. If you have received this email in error, please promptly notify the sender by reply email and delete the original email and any backup copies without reading them.
              </div>

            </div>
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