const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
AWS.config.update({ region: 'eu-north-1' });

const ses = new AWS.SES();
const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  const { userEmail, name, docNumber, expiry } = body;
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  // Store in DynamoDB
  await dynamo.put({
    TableName: 'Documents',
    Item: {
      id, userEmail, name, docNumber, expiry, createdAt,
      notifiedStages: ['created']
    }
  }).promise();

  // Calculate days until expiry
  const daysLeft = Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24));

  // Send email
  await ses.sendEmail({
    Source: 'docsmart2025@gmail.com',
    Destination: { ToAddresses: [userEmail] },
    Message: {
      Subject: { Data: `Document Added: ${name}` },
      Body: {
        Text: {
          Data: `You have added a document (${name}, #${docNumber}).\nIt will expire on ${expiry} (${daysLeft} days left).\n\n- SmartDoc`
        }
      }
    }
  }).promise();

  return { statusCode: 200, body: JSON.stringify({ success: true, id }) };
};