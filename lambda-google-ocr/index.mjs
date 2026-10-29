import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import vision from '@google-cloud/vision';

// --- NEW: Function to get Google credentials from Secrets Manager ---
async function getGoogleCredentials() {
    const secretName = "docexpiry/google-credentials";
    const client = new SecretsManagerClient({ region: "eu-north-1" });
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const data = await client.send(command);
    return JSON.parse(data.SecretString);
}

// --- Your Parsing Logic (No changes here) ---
const monthMap = { jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03', apr: '04', april: '04', may: '05', jun: '06', june: '06', jul: '07', july: '07', aug: '08', august: '08', sep: '09', september: '09', oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12' };
const parseDocumentName = (text) => { const lowerText = text.toLowerCase(); if (lowerText.includes('covid-19 vaccination')) return 'COVID-19 Vaccine Certificate'; if (lowerText.includes('vellore institute')) return 'VIT ID Card'; if (lowerText.includes('apar id')) return 'Apar ID'; if (lowerText.includes('passport')) return 'Passport'; if (lowerText.includes('driving license') || lowerText.includes('driver license')) return "Driver's License"; if (lowerText.includes('aadhaar')) return 'Aadhaar Card'; if (lowerText.includes('insurance')) return 'Insurance Policy'; if (lowerText.includes('id card')) return 'ID Card'; return 'Scanned Document'; };
const parseExpiryDate = (text) => { const match = text.match(/(?:Valid upto|Validity|Valid through|Expiry)[\s—:-]*?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov|december|dec)[\s-]*(\d{4})/i); if (match) { const month = monthMap[match[1].toLowerCase()]; const year = match[2]; return `${year}-${month}-01`; } const fallbackMatch = text.match(/(?:Expiry)[\s—:-]+(\d{2})-(\d{2})-(\d{2})/i); if (fallbackMatch) { const day = fallbackMatch[1]; const month = fallbackMatch[2]; const year = `20${fallbackMatch[3]}`; return `${year}-${month}-${day}`; } const finalFallback = text.match(/(\d{4}-\d{2}-\d{2})/); return finalFallback ? finalFallback[0] : null; };
const parseDocumentId = (text) => { let match = text.match(/\b(\d{2}[A-Z]{3,4}\d{4})\b/i); if (match) return match[0]; match = text.match(/(?:Certificate ID)\s*(\d+)/i); if (match) return match[1]; match = text.match(/(?:Apar id|Id)[\s—:-]+([a-zA-Z0-9@]+)/i); if (match) return match[1]; match = text.match(/(?:Aadhaar #|Aadhaar Number)[\s:]*X{4,8}(\d{4})/i); if (match) return `XXXX-XXXX-${match[1]}`; match = text.match(/(?:Reg id|Regid|ID No)[\s—:-]+([A-Z0-9]+)/i); if (match) return match[1]; match = text.match(/[A-Z]\d{7,9}/); if (match) return match[0]; return null; };
// --- End of Parsing Logic ---

export const handler = async (event) => {
    console.log("--- Google Vision OCR function triggered! ---");
    
    try {
        // Step 1: Initialize clients
        const googleCredentials = await getGoogleCredentials();
        const s3Client = new S3Client({ region: "eu-north-1" });
        const visionClient = new vision.ImageAnnotatorClient({ credentials: googleCredentials });

        // Step 2: Get file info from the S3 event
        const record = event.Records[0];
        const bucketName = record.s3.bucket.name;
        const objectKey = record.s3.object.key;
        const decodedKey = decodeURIComponent(objectKey.replace(/\+/g, ' '));
        console.log(`Analyzing file: s3://${bucketName}/${decodedKey}`);

        // Step 3: Get the file from S3
        const getObjectParams = { Bucket: bucketName, Key: decodedKey };
        const s3Object = await s3Client.send(new GetObjectCommand(getObjectParams));
        const imageBytes = await s3Object.Body.transformToByteArray();
        const imageBuffer = Buffer.from(imageBytes);

        // Step 4: Call Google Vision API
        const [result] = await visionClient.textDetection(imageBuffer);
        const detections = result.textAnnotations;
        const extractedText = detections.length > 0 ? detections[0].description : '';
        console.log("--- Google Vision Extracted Text ---");
        console.log(extractedText);
        console.log("------------------------------------");

        // Step 5: Parse the results
        const docName = parseDocumentName(extractedText);
        const expiryDate = parseExpiryDate(extractedText);
        const docId = parseDocumentId(extractedText);

        const parsedResult = {
            documentName: docName,
            expiryDate: expiryDate,
            documentId: docId,
            originalFile: decodedKey
        };
        console.log("--- PARSED RESULT ---");
        console.log(JSON.stringify(parsedResult, null, 2));
        console.log("---------------------");

        return { statusCode: 200, body: JSON.stringify('Document processed successfully.') };
    } catch (error) {
        console.error("Error processing document:", error);
        throw new Error(error);
    }
};