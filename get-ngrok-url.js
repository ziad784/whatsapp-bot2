const ngrok = require("ngrok");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

(async () => {
    try {
        console.log(`[${new Date().toISOString()}] Starting ngrok...`);
        const url = await ngrok.connect({
            proto: "http",
            addr: 3000,
            authtoken: process.env.NGROK_AUTH_TOKEN || "your_ngrok_auth_token",
        });
        console.log(`[${new Date().toISOString()}] ngrok URL: ${url}`);
        fs.writeFileSync("ngrok_url.txt", url);
        const envPath = path.join(__dirname, ".env");
        let envContent = "";
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, "utf8");
        }
        envContent = envContent.replace(/CALLBACK_URL=.*/g, `CALLBACK_URL=${url}/callback`) ||
            `CALLBACK_URL=${url}/callback\n`;
        fs.writeFileSync(envPath, envContent);
        console.log(`[${new Date().toISOString()}] Updated .env with CALLBACK_URL: ${url}/callback`);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] ngrok error:`, err.message, err.stack);
        fs.writeFileSync("ngrok_error.txt", err.message);
        process.exit(1);
    }
})();