require("dotenv").config();
const mongoose = require("mongoose");
const amqp = require("amqplib");
const cron = require("node-cron");
const Document = require("./models/Document"); 
const { sendDocumentEmail } = require("./emailService");

const QUEUE_NAME = 'smartdoc_tasks';
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Worker is running and healthy!');
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Worker health check server running on port ${PORT}`);
});

mongoose
  .connect(process.env.MONGO_URI, {
    maxPoolSize: 100,
    minPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("Worker Connected to MongoDB Successfully"))
  .catch((err) => {
      console.error("Worker MongoDB Connection Error:", err.message);
      process.exit(1);
  });

async function startWorker() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        
        // Fair dispatch
        channel.prefetch(1); 
        
        console.log("👷 Background Worker is running and waiting for tasks...");

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                try {
                    const task = JSON.parse(msg.content.toString());

                    if (task.type === 'SAVE_DOCUMENT') {
                        const { userEmail, documentName, documentNo, documentExpiry, isTestMode } = task.payload;
                        
                        // 1. DUPLICATE CHECK 
                        const fiveSecondsAgo = new Date(Date.now() - 5000);
                        const recentDuplicate = await Document.findOne({
                          userEmail,
                          name: documentName,
                          createdAt: { $gte: fiveSecondsAgo }
                        });

                        if (recentDuplicate) {
                          if (!isTestMode) console.log("⚠️ Prevented duplicate document creation in background.");
                          channel.ack(msg);
                          return;
                        }

                        // 2. MONGODB MEIN DATA SAVE KAREIN
                        const newDoc = await Document.create({
                          userEmail,
                          name: documentName,
                          docNumber: documentNo,
                          expiry: documentExpiry,
                        });
                        
                        if (!isTestMode) {
                          console.log("Document saved in DB by worker:", newDoc._id);
                          // 3. Trigger email service (with Days Left info) cleanly!
                          await sendDocumentEmail(userEmail, documentName, documentNo, documentExpiry);
                        }
                    }
                    channel.ack(msg);
                    
                } catch (err) {
                    console.error("Task failed in worker:", err);
                    channel.nack(msg); 
                }
            }
        });
    } catch (error) {
        console.error("Worker Critical Error:", error);
    }
}

// Har roz subah 9:00 baje run hoga ('0 9 * * *')
cron.schedule("0 9 * * *", async () => {
  console.log("⏰ Running daily document expiry check...");

  try {
    const documents = await Document.find({});
    const today = new Date();

    for (const doc of documents) {
      if (!doc.expiry || doc.expiry === "N/A") continue;

      const expiryDate = new Date(doc.expiry);
      const diffTime = expiryDate - today;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const targetIntervals = [30, 15, 7, 3, 1];

      if (targetIntervals.includes(daysLeft)) {
        if (!doc.notifiedStages) {
          doc.notifiedStages = [];
        }

        if (!doc.notifiedStages.includes(daysLeft)) {
          console.log(`Sending ${daysLeft}-day expiry reminder for document: ${doc.name} to ${doc.userEmail}`);
          await sendDocumentEmail(
            doc.userEmail,
            doc.name,
            doc.docNumber || doc.id,
            doc.expiry,
            null,
            true,  
            daysLeft 
          );
          doc.notifiedStages.push(daysLeft);
          await doc.save();
        }
      }
    }
  } catch (error) {
    console.error("Error in daily document expiry cron job:", error);
  }
});

startWorker();