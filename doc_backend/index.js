require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const User = require("./models/User");
const Document = require("./models/Document");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection Setup with Connection Pooling
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 100, // 50 se badhakar 100 connections karein
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
})
  .then(() => console.log(" Connected to MongoDB Successfully"))
  .catch((err) => console.error(" MongoDB Connection Error:", err.message));

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD,
  },
});

// ======================== REGISTER API ========================
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user
    await User.create({
      email,
      password: hashedPassword,
    });

    return res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ======================== LOGIN API ========================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    return res.status(200).json({ success: true, message: "Login successful" });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
// DELETE route to remove a document by ID
app.delete("/api/documents/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check karein agar MongoDB ObjectID match ho ya custom id string
    let deletedDoc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      deletedDoc = await Document.findByIdAndDelete(id);
    } else {
      // Agar frontend se custom string id (e.g. doc-173000000) aayi ho
      deletedDoc = await Document.findOneAndDelete({ id: id });
    }

    if (!deletedDoc) {
      return res.status(404).json({ error: "Document not found" });
    }

    console.log(`Document deleted successfully: ${id}`);
    res.status(200).json({ message: "Document deleted successfully", id });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: "Internal server error during deletion" });
  }
});

// ======================== ADD DOCUMENT & NOTIFY API ========================
app.post("/api/documents", async (req, res) => {
  try {
    const { userEmail, name, docNumber, expiry } = req.body;

    if (!userEmail || !name) {
      return res.status(400).json({ error: "userEmail and name are required" });
    }

    // Save document to MongoDB
    const newDoc = await Document.create({
      userEmail,
      name,
      docNumber: docNumber || "N/A",
      expiry: expiry || "N/A",
    });

    // Email Notification Handling
    if (process.env.MOCK_EMAIL === "true") {
      console.log(`[Mock Email] Document added alert for: ${userEmail}`);
    } else if (process.env.GMAIL_EMAIL && process.env.GMAIL_PASSWORD) {
      try {
        await transporter.sendMail({
          from: `"SmartDoc" <${process.env.GMAIL_EMAIL}>`,
          to: userEmail,
          subject: `${name} has been successfully Added`,
          text: `Hello!${userEmail}.
           You added document (${name}, Document No:- #${docNumber}) which will expires on ${expiry}.`,
        });
      } catch (mailErr) {
        console.error(" Email Error:", mailErr.message);
      }
    }

    return res.status(200).json({ success: true, id: newDoc._id });
  } catch (error) {
    console.error("Document API Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ======================== START SERVER ========================
const PORT = process.env.PORT || 5173;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});