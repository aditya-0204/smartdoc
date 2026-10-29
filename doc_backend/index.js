require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { Resend } = require("resend");

const User = require("./models/User");
const Document = require("./models/Document");

const app = express();
app.use(cors());
app.use(express.json());

// Resend Initialization
const resend = new Resend(process.env.RESEND_API_KEY);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    maxPoolSize: 100,
    minPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("✅ Connected to MongoDB Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err.message));

// Test / Health Route
app.get("/api/test", (req, res) => {
  res.status(200).json({ status: "ok", message: "SmartDoc backend is active" });
});

// ======================== GET DOCUMENTS ========================
app.get("/api/documents", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Email query parameter is required" });
    }

    const documents = await Document.find({
      userEmail: { $regex: new RegExp(`^${email.trim()}$`, "i") },
    }).sort({ createdAt: -1 });

    return res.status(200).json(documents);
  } catch (err) {
    console.error("Fetch Docs Error:", err);
    return res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// ======================== ADD DOCUMENT & NOTIFY ========================
// ======================== ADD DOCUMENT & NOTIFY ========================
app.post("/api/documents", async (req, res) => {
  try {
    const { userEmail, name, title, docNumber, expiry, expiryDate } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: "userEmail is required" });
    }

    const documentName = name || title || "Untitled Document";
    const documentExpiry = expiry || expiryDate || "N/A";
    const documentNo = docNumber || "N/A";

    // 🔒 BACKEND DUPLICATE LOCK (Prevents double saving)
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const recentDuplicate = await Document.findOne({
      userEmail,
      name: documentName,
      createdAt: { $gte: fiveSecondsAgo }
    });

    if (recentDuplicate) {
      console.log("⚠️ Prevented duplicate document creation.");
      return res.status(200).json(recentDuplicate); 
    }

    // 1. Save to MongoDB Atlas
    const newDoc = await Document.create({
      userEmail,
      name: documentName,
      docNumber: documentNo,
      expiry: documentExpiry,
    });

    console.log("Document saved:", newDoc._id);

    // 2. Email trigger via Brevo API (No timeout issues on Render)
    if (process.env.BREVO_API_KEY) {
      fetch("https://api.brevo.com/v3/smtp/email", {
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
          htmlContent: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px;">
              <h2 style="color: #2563eb;">SmartDoc Notification</h2>
              <p>Hello,</p>
              <p>Your document has been recorded successfully:</p>
              <ul style="background: #f3f4f6; padding: 15px; border-radius: 5px; list-style-type: none;">
                <li><strong>Document Name:</strong> ${documentName}</li>
                <li><strong>Document Number:</strong> ${documentNo}</li>
                <li><strong>Expiry Date:</strong> ${documentExpiry}</li>
              </ul>
              <br/>
              <p>Best regards,<br/><strong>SmartDoc Team</strong></p>
            </div>
          `
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.messageId) {
          console.log(`✅ Email sent successfully via Brevo to ${userEmail} (ID: ${data.messageId})`);
        } else {
          console.error("❌ Brevo API Error:", data);
        }
      })
      .catch(err => console.error("❌ Brevo Fetch Error:", err));
    } else {
      console.warn("⚠️ BREVO_API_KEY is missing in Environment Variables.");
    }

    return res.status(201).json(newDoc);
  } catch (err) {
    console.error("Save Doc Error:", err);
    return res.status(500).json({ error: "Failed to save document" });
  }
});

// ======================== DELETE DOCUMENT ========================
app.delete("/api/documents/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let deletedDoc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      deletedDoc = await Document.findByIdAndDelete(id);
    } else {
      deletedDoc = await Document.findOneAndDelete({
        $or: [{ id }, { docNumber: id }],
      });
    }

    if (!deletedDoc) {
      return res.status(404).json({ error: "Document not found in database" });
    }

    return res.status(200).json({ message: "Document deleted successfully", id });
  } catch (err) {
    console.error("Delete Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======================== AUTH ROUTES ========================
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email & password required" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashedPassword });
    return res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    return res.status(200).json({ success: true, message: "Login successful" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

const PORT = process.env.PORT || 5173;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));