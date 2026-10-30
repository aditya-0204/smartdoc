const amqp = require('amqplib');
require('dotenv').config();

let channel;
const QUEUE_NAME = 'smartdoc_tasks';

async function connectQueue() {
    try {
        // connection with CloudAMQP 
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        
        // creating queue if not available
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log("RabbitMQ Connected successfully!");
    } catch (error) {
        console.error("RabbitMQ Connection Error:", error);
    }
}
// push function
async function sendToQueue(data) {
    if (!channel) await connectQueue();
    //converting data 
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(data)), {
        persistent: true 
    });
}

module.exports = { connectQueue, sendToQueue, QUEUE_NAME };