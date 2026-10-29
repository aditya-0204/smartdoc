import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

const dynamo = new DynamoDBClient({ region: "eu-north-1" });

// Load Gmail credentials from Lambda environment variables
const gmailEmail = process.env.GMAIL_EMAIL;
const gmailPassword = process.env.GMAIL_PASSWORD;

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword, // App Password, NOT your Gmail password
  },
});

export const handler = async (event) => {
  const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  const { userEmail, name, docNumber, expiry } = body;

  const id = uuidv4();
  const createdAt = new Date().toISOString();

  // Save document to DynamoDB
  await dynamo.send(new PutItemCommand({
    TableName: "Documents",
    Item: {
      id: { S: id },
      userEmail: { S: userEmail },
      name: { S: name },
      docNumber: { S: docNumber },
      expiry: { S: expiry },
      createdAt: { S: createdAt },
      notifiedStages: { SS: ["created"] },
    },
  }));

  // Send email notification
  const mailOptions = {
    from: gmailEmail,
    to: userEmail,
    subject: `Document Added: ${name}`,
    text: `Hello! You added document (${name}, #${docNumber}) which expires on ${expiry}.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully!");
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, id }),
  };
};
