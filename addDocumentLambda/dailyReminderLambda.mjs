import { DynamoDBClient, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import nodemailer from "nodemailer";

const dynamo = new DynamoDBClient({ region: "eu-north-1" });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD
  }
});

export const handler = async () => {
  const today = new Date();

  // Scan all documents
  const data = await dynamo.send(new ScanCommand({ TableName: process.env.TABLE_NAME }));

  for (const doc of data.Items) {
    const expiryDate = new Date(doc.expiry.S);
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    const notified = doc.notifiedStages ? doc.notifiedStages.SS : [];

    if ([30, 15, 7, 3, 1].includes(daysLeft) && !notified.includes(daysLeft.toString())) {
      // Send reminder email
      await transporter.sendMail({
        from: process.env.GMAIL_EMAIL,
        to: doc.userEmail.S,
        subject: `Reminder: ${doc.name.S} expires in ${daysLeft} day(s)`,
        text: `Hello! Your document ${doc.name.S} (#${doc.docNumber.S}) will expire on ${doc.expiry.S}. ${daysLeft} day(s) left.`
      });

      // Update notifiedStages
      notified.push(daysLeft.toString());
      await dynamo.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: { S: doc.id.S } },
        UpdateExpression: "SET notifiedStages = :ns",
        ExpressionAttributeValues: { ":ns": { SS: notified } }
      }));
    }
  }

  return { statusCode: 200, body: "Daily reminders processed!" };
};
