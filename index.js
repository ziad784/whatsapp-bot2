const express = require("express");
const axios = require("axios");
const qrcode = require("qrcode");
const path = require("path");
const fs = require("fs");
const bot = require("./bot.js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
let botStatus = "stopped";
let clientInitialized = false;
let currentQR = null;

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "sk_test_123";
const CALLBACK_URL = process.env.CALLBACK_URL || "http://localhost:3000/callback";
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || "2348033496917";
const UploadsDir = path.join(__dirname, "Uploads");

// Ensure directories
const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
    console.log(`[${new Date().toISOString()}] Creating public directory`);
    fs.mkdirSync(publicDir);
}
if (!fs.existsSync(UploadsDir)) {
    console.log(`[${new Date().toISOString()}] Creating Uploads directory`);
    fs.mkdirSync(UploadsDir);
}

// Middleware
app.use(express.json());
app.use(express.static(publicDir));

// Log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
app.get("/status", (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /status, botStatus: ${botStatus}`);
    res.json({ status: botStatus });
});

app.post("/start", async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /start`);
    try {
        if (botStatus === "running") {
            console.log("Bot already running, skipping initialization");
            return res.json({ message: "Bot is already running" });
        }
        console.log("Checking bot client...");
        if (!bot.client) {
            throw new Error("WhatsApp client not initialized in bot.js");
        }
        // Clear userSelections to start with a clean state
        console.log("Clearing user selections...");
        Object.keys(bot.userSelections).forEach(chatId => bot.cleanup(chatId));
        console.log("User selections cleared.");

        console.log("Initializing WhatsApp client...");
        if (!clientInitialized) {
            bot.client.on("qr", async (qr) => {
                try {
                    console.log("Generating QR code...");
                    currentQR = await qrcode.toDataURL(qr);
                    console.log("QR code generated successfully");
                } catch (err) {
                    console.error(`[${new Date().toISOString()}] QR generation error:`, err.message, err.stack);
                }
            });
            bot.client.on("ready", () => {
                console.log(`[${new Date().toISOString()}] WhatsApp client ready`);
            });
            bot.client.on("auth_failure", (msg) => {
                console.error(`[${new Date().toISOString()}] WhatsApp auth failure:`, msg);
            });
            bot.client.on("disconnected", (reason) => {
                console.log(`[${new Date().toISOString()}] WhatsApp disconnected:`, reason);
                botStatus = "stopped";
                clientInitialized = false;
            });
            console.log("Calling client.initialize...");
            try {
                await bot.client.initialize();
            } catch (initErr) {
                throw new Error(`Failed to initialize WhatsApp client: ${initErr.message}`);
            }
            console.log("Client initialized successfully");
            clientInitialized = true;
        } else {
            console.log("Client already initialized");
        }
        botStatus = "running";
        console.log("Bot status set to running");
        res.json({ message: "Bot started successfully" });
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Start error:`, err.message, err.stack);
        botStatus = "stopped";
        clientInitialized = false;
        res.status(500).json({ message: "Failed to start bot: " + err.message });
    }
});

app.post("/stop", async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /stop`);
    try {
        if (botStatus === "stopped") {
            console.log("Bot already stopped");
            return res.json({ message: "Bot is already stopped" });
        }
        if (clientInitialized) {
            console.log("Destroying client...");
            await bot.client.destroy();
            console.log("Client destroyed");
            clientInitialized = false;
            currentQR = null;
        }
        botStatus = "stopped";
        console.log("Bot status set to stopped");
        res.json({ message: "Bot stopped successfully" });
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Stop error:`, err.message, err.stack);
        res.status(500).json({ message: "Failed to stop bot: " + err.message });
    }
});

app.post("/reset", async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /reset`);
    try {
        if (clientInitialized) {
            console.log("Destroying client for reset...");
            await bot.client.destroy();
            clientInitialized = false;
            currentQR = null;
        }
        botStatus = "stopped";
        console.log("Clearing user selections...");
        Object.keys(bot.userSelections).forEach(chatId => bot.cleanup(chatId));
        console.log("User selections cleared.");

        // Delete .wwebjs_auth and .wwebjs_cache folders
        const authDir = path.join(__dirname, ".wwebjs_auth");
        const cacheDir = path.join(__dirname, ".wwebjs_cache");
        try {
            if (fs.existsSync(authDir)) {
                fs.rmSync(authDir, { recursive: true, force: true });
                console.log(`[${new Date().toISOString()}] Deleted .wwebjs_auth folder`);
            }
            if (fs.existsSync(cacheDir)) {
                fs.rmSync(cacheDir, { recursive: true, force: true });
                console.log(`[${new Date().toISOString()}] Deleted .wwebjs_cache folder`);
            }
        } catch (err) {
            console.error(`[${new Date().toISOString()}] Error deleting WhatsApp session folders:`, err.message);
        }

        console.log("Bot reset, preparing to shut down server...");
        // Send response before shutting down
        res.json({ message: "Bot reset successfully. Server will shut down. You may need to scan a new QR code on restart." });
        // Delay shutdown to ensure response is sent
        setTimeout(() => {
            console.log("Shutting down server...");
            process.exit(0);
        }, 500);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Reset error:`, err.message, err.stack);
        res.status(500).json({ message: "Failed to reset bot: " + err.message });
    }
});

app.get("/qr", (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /qr`);
    if (botStatus !== "running" || !currentQR) {
        console.log("QR unavailable: botStatus =", botStatus, "currentQR =", !!currentQR);
        return res.status(400).json({ error: "Bot not running or QR not available" });
    }
    res.json({ qrImage: currentQR });
});

app.post("/initialize-payment", async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /initialize-payment`, req.body);
    try {
        const { chatId, amount } = req.body;
        if (!CALLBACK_URL) throw new Error("CALLBACK_URL not set in .env");
        const callbackUrl = `${CALLBACK_URL}?chatId=${chatId}`;
        console.log("Initiating payment with callback:", callbackUrl);
        const response = await axios.post(
            "https://api.paystack.co/transaction/initialize",
            {
                email: `${chatId.split("@")[0]}@example.com`,
                amount: amount * 100,
                callback_url: callbackUrl,
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );
        const { authorization_url: paymentUrl, reference: paymentReference } = response.data.data;
        console.log("Payment initialized:", { paymentUrl, paymentReference });
        res.json({ paymentUrl, paymentReference });
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Payment init error:`, err.message, err.stack);
        res.status(500).json({ error: "Failed to initialize payment: " + err.message });
    }
});

app.get("/callback", async (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /callback`, req.query);
    try {
        const { reference, chatId } = req.query;
        if (!reference || !chatId) {
            throw new Error("Missing reference or chatId");
        }
        console.log("Verifying payment with reference:", reference);
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
            }
        );
        const data = response.data.data;
        if (data.status !== "success") {
            throw new Error("Payment verification failed: " + data.status);
        }
        console.log("Payment verified successfully");
        const selection = bot.userSelections[chatId];
        if (!selection || !selection.filePath) {
            throw new Error("Invalid print data for chatId: " + chatId);
        }
        console.log("Fetching chat for printing...");
        const chat = await bot.client.getChatById(chatId);
        await chat.sendMessage("✅ Payment successful! Starting print job...");
        console.log("Executing print command:", {
            filePath: selection.filePath,
            copies: selection.copies,
            color: selection.color,
            pages: selection.pages,
            size: selection.size,
        });
        bot.executePrintCommand(
            selection.filePath,
            selection.copies,
            selection.color,
            selection.pages,
            selection.size,
            chat,
            chatId
        );
        const redirect = `https://wa.me/${WHATSAPP_NUMBER}?text=Payment%20Completed`;
        res.send(`
            <h1>Payment Successful!</h1>
            <p>Redirecting to WhatsApp...</p>
            <script>
                setTimeout(() => { window.location.href = "${redirect}"; }, 3000);
            </script>
        `);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Callback error:`, err.message, err.stack);
        const redirect = `https://wa.me/${WHATSAPP_NUMBER}?text=Payment%20Failed`;
        res.send(`
            <h1>Payment Failed</h1>
            <p>Error: ${err.message}</p>
            <p>Redirecting to WhatsApp...</p>
            <script>
                setTimeout(() => { window.location.href = "${redirect}"; }, 3000);
            </script>
        `);
    }
});

app.get("/pending-cash-jobs", (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /pending-cash-jobs`);
    try {
        const pendingJobs = Object.entries(bot.userSelections)
            .filter(([_, data]) => data.step === "pending_cash")
            .map(([chatId, data]) => ({
                chatId,
                totalCost: data.totalCost,
                pages: data.pages,
                copies: data.copies,
                color: data.color ? "Color" : "B&W",
                size: data.size,
            }));
        console.log("Pending jobs:", pendingJobs);
        res.json({ pendingJobs });
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Pending jobs error:`, err.message, err.stack);
        res.status(500).json({ error: "Failed to get pending jobs: " + err.message });
    }
});

app.post("/confirm-cash-payment", async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /confirm-cash-payment`, req.body);
    try {
        const { chatId } = req.body;
        const selection = bot.userSelections[chatId];
        if (!selection || selection.step !== "pending_cash") {
            throw new Error("No pending cash payment for chatId: " + chatId);
        }
        console.log("Confirming cash payment for chatId:", chatId);
        const chat = await bot.client.getChatById(chatId);
        await chat.sendMessage("✅ Cash payment confirmed! Starting print job...");
        bot.executePrintCommand(
            selection.filePath,
            selection.copies,
            selection.color,
            selection.pages,
            selection.size,
            chat,
            chatId
        );
        res.json({ message: "Cash payment confirmed" });
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Confirm payment error:`, err.message, err.stack);
        res.status(500).json({ error: "Failed to confirm payment: " + err.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Server error:`, err.message, err.stack);
    res.status(500).json({ error: "Internal server error" });
});

// Prevent crashes
process.on("uncaughtException", (err) => {
    console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err.message, err.stack);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error(`[${new Date().toISOString()}] Unhandled Rejection:`, reason);
});

// Start server
app.listen(PORT, (err) => {
    if (err) {
        console.error(`[${new Date().toISOString()}] Server start error:`, err.message, err.stack);
        process.exit(1);
    }
    console.log(`[${new Date().toISOString()}] Server running on http://localhost:${PORT}`);
});

// Add after other routes in server.js
app.get("/", async (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /`);
    try {
        const response = await axios.get(`http://localhost:${PORT}/pending-cash-jobs`);
        const pendingJobs = response.data.results || [];
        const qrHTML = botStatus === "running" && currentQR ? `<img src="${currentQR}" alt="QR Code" />` : "";
        res.send(`
            <h1>Apex Business Hub Dashboard</h1>
            <p>Status: ${botStatus}</p>
            ${qrHTML}
            <h2>Pending Cash Jobs</h2>
            <ul>
                ${pendingJobs.length ? pendingJobs.map(job => `
                    <li>
                        Chat ID: ${job.chatId}<br>
                        Cost: ₦${job.totalCost}<br>
                        Pages: ${job.pages}<br>
                        Copies: ${job.copies}<br>
                        Color: ${job.color}<br>
                        Size: ${job.size}<br>
                        <form action="/confirm-cash-payment" method="POST">
                            <input type="hidden" name="chatId" value="${job.chatId}">
                            <button type="submit">Confirm Payment</button>
                        </form>
                    </li>
                `).join("") : "<li>No pending cash jobs</li>"}
            </ul>
        `);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Dashboard error:`, err.message, err.stack);
        res.send(`
            <h1>Apex Business Hub Dashboard</h1>
            <p>Status: ${botStatus}</p>
            <p>Error loading pending jobs: ${err.message}</p>
        `);
    }
});