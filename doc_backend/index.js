require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Document = require("./models/Document");
const { connectQueue, sendToQueue } = require("./rabbitmq.js");

const app = express();
app.use(cors());
app.use(express.json());

// Server start hote hi RabbitMQ connect karein
connectQueue();

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    maxPoolSize: 100,
    minPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("Connected to MongoDB Successfully"))
  .catch((err) => console.error("MongoDB Connection Error:", err.message));

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

// ADD DOCUMENT & NOTIFY 
app.post("/api/documents", async (req, res) => {
  try {
    const { userEmail, name, title, docNumber, expiry, expiryDate } = req.body;
    const isTestMode = req.headers['x-test-mode'] === 'true';

    if (!userEmail) {
      return res.status(400).json({ error: "userEmail is required" });
    }

    const documentName = name || title || "Untitled Document";
    const documentExpiry = expiry || expiryDate || "N/A";
    const documentNo = docNumber || "N/A";

    await sendToQueue({
        type: 'SAVE_DOCUMENT',
        payload: {
            userEmail,
            documentName,
            documentNo,
            documentExpiry,
            isTestMode
        },
        timestamp: Date.now()
    });

    return res.status(202).json({
        success: true,
        message: "Document received and is processing in the background."
    });

  } catch (err) {
    console.error("Save Doc Error:", err);
    return res.status(500).json({ error: "Failed to process document request" });
  }
});

// DELETE DOCUMENT
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));