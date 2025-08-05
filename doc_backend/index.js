const express = require("express");
const cors = require("cors");                      // ✅ Enable CORS
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();

// ✅ Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ MySQL DB connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,      // e.g., "localhost" or AWS RDS endpoint
  user: process.env.DB_USER,      // your DB username
  password: process.env.DB_PASS,  // your DB password
  database: process.env.DB_NAME,  // your DB name
});

db.connect((err) => {
  if (err) console.error("❌ DB error:", err);
  else console.log("✅ Connected to DB");
});

// ✅ Register route
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (email, password) VALUES (?, ?)",
    [email, hash],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "User exists or DB error" });
      }
      res.json({ message: "User registered successfully" });
    }
  );
});

// ✅ Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err || results.length === 0) {
      console.error(err);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, results[0].password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: results[0].id, email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ message: "Login successful", token });
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
