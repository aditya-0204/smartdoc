require("dotenv").config();
const mongoose = require("mongoose");
const amqp = require("amqplib");
const Document = require("./models/Document"); 

const QUEUE_NAME = 'smartdoc_tasks';

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
                        
                        if (!isTestMode) console.log("Document saved in DB by worker:", newDoc._id);

                        // 3. sending mail from brevo
                        if (process.env.BREVO_API_KEY && !isTestMode) {
                          const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
                            method: "POST",
                            headers: {
                              "Accept": "application/json",
                              "Content-Type": "application/json",
                              "api-key": process.env.BREVO_API_KEY
                            },
                            body: JSON.stringify({
                              sender: { email: "smartdocoffical@gmail.com", name: "SmartDoc Official" },
                              to: [{ email: userEmail }],
                              subject: `${documentName} has been successfully added`,
                              htmlContent: `<p>Your document ${documentName} has been recorded successfully.</p>`
                            })
                          });
                          
                          const data = await emailResponse.json();
                          if (data.messageId) {
                            console.log(`Email sent to ${userEmail}`);
                          }
                        } else if (isTestMode) {
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

startWorker();