const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  name: { type: String, required: true },
  docNumber: { type: String, default: "N/A" },
  expiry: { type: String, default: "N/A" },
  createdAt: { type: Date, default: Date.now },
  notifiedStages: { type: [String], default: ["created"] },
});

module.exports = mongoose.model("Document", documentSchema);