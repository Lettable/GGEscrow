import express from "express";
import { bot } from "./services/telegramBot.js";
import { connectDB } from "./config/database.js";
import dotenv from "dotenv";
import router from "./routes/main.js";

// Load Environment Variables
dotenv.config();
const ipnAddress = process.env.IPN_ADDRESS;

// Initialize Express
const app = express();
app.use(express.json());

// Initialize Telegram Bot
bot.launch();

// Initialize Database Connection
connectDB();

// Deafault Route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Escrowly!",
    description: "Escrowly is a fully decentralized Telegram escrow bot. It ensures secure transactions without storing any data on a centralized database.",
    details: {
      IPNAddress: ipnAddress,
      features: [
        "Decentralized system with no hidden fees",
        "Only 0.05% fee for gas, decentralized system, and payment gateway",
        "Secure and transparent transactions",
        "No data storage on centralized databases",
        "Instant payment notifications",
,      ],
      techStack: [
        "Node.js",
        "Express.js",
        "MongoDB",
        "Mongoose",
        "Telegraf.js"
      ],
      
      author: "Mirza"
    },
    success: true
  });
});

// API Routes
app.use("/api/v1/", router);

// PORT Configuration
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
