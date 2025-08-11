// doc_backend/index.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());

// MySQL Connection (Local)
const db = mysql.createConnection({
  host: "localhost",
  user: "root",          // your MySQL username
  password: "imshaurya", // your MySQL password
  database: "docexpiry1" // your database name
});

db.connect(err => {
  if (err) {
    console.error("❌ MySQL connection error:", err);
    return;
  }
  console.log("✅ Connected to MySQL (Local)");
});

// ======================== REGISTER API ========================
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  // Check if email already exists
  const checkQuery = "SELECT * FROM users WHERE email = ?";
  db.query(checkQuery, [email], async (err, results) => {
    if (err) {
      console.error("❌ Query error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    try {
      // Hash password before saving
      const hashedPassword = await bcrypt.hash(password, 10);

      const insertQuery = "INSERT INTO users (email, password) VALUES (?, ?)";
      db.query(insertQuery, [email, hashedPassword], (err) => {
        if (err) {
          console.error("❌ Insert error:", err);
          return res.status(500).json({ message: "Database error" });
        }
        res.status(201).json({ message: "Registration successful" });
      });
    } catch (hashError) {
      console.error("❌ Hashing error:", hashError);
      res.status(500).json({ message: "Error processing password" });
    }
  });
});

// ======================== LOGIN API ========================
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error("❌ Query error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    try {
      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        res.json({ success: true, message: "Login successful" });
      } else {
        res.status(401).json({ success: false, message: "Invalid email or password" });
      }
    } catch (compareError) {
      console.error("❌ Compare error:", compareError);
      res.status(500).json({ message: "Error processing login" });
    }
  });
});

// ======================== START SERVER ========================
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
