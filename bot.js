const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const axios = require("axios");
require("dotenv").config();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
});

const userSelections = {};
const processedMessageIds = new Set();
const messageQueues = {};
const promptTimeouts = {};
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || "2348033496917";
const PRICING = {
    A4: { bw: 100, color: 200 },
    A3: { bw: 200, color: 400 },
};

client.on("ready", () => {
    console.log(`[${new Date().toISOString()}] ✅ WhatsApp Bot is Ready!`);
});

client.on("auth_failure", (msg) => {
    console.error(`[${new Date().toISOString()}] WhatsApp auth failure:`, msg);
});

client.on("disconnected", (reason) => {
    console.log(`[${new Date().toISOString()}] WhatsApp disconnected:`, reason);
});

async function processQueue(chatId) {
    if (!messageQueues[chatId] || messageQueues[chatId].length === 0 || messageQueues[chatId].isProcessing) {
        console.log(`[${new Date().toISOString()}] Skipping processQueue for chatId: ${chatId}, queue empty or processing`);
        return;
    }

    console.log(`[${new Date().toISOString()}] Starting processQueue for chatId: ${chatId}, queue length: ${messageQueues[chatId].length}`);
    messageQueues[chatId].isProcessing = true;
    let lastMessage;
    while (messageQueues[chatId].length > 0) {
        const { message, resolve } = messageQueues[chatId].shift();
        lastMessage = message;
        await processMessage(message);
        resolve();
        console.log(`[${new Date().toISOString()}] Processed message, remaining queue length: ${messageQueues[chatId].length}, chatId: ${chatId}`);
    }
    messageQueues[chatId].isProcessing = false;
    console.log(`[${new Date().toISOString()}] Finished processQueue for chatId: ${chatId}`);

    if (userSelections[chatId] && (
        userSelections[chatId].promptLock ||
        ["awaiting_action", "awaiting_pages", "awaiting_copies", "awaiting_color", "awaiting_size", "awaiting_payment_method", "awaiting_payment", "pending_cash", "editing"].includes(userSelections[chatId].step) ||
        userSelections[chatId].files.length === 0
    )) {
        console.log(`[${new Date().toISOString()}] Skipping file selection prompt for chatId: ${chatId}, step: ${userSelections[chatId]?.step}, files: ${userSelections[chatId]?.files.length}, promptLock: ${userSelections[chatId]?.promptLock}`);
        return;
    }

    if (promptTimeouts[chatId]) {
        clearTimeout(promptTimeouts[chatId]);
        console.log(`[${new Date().toISOString()}] Cleared existing prompt timeout for chatId: ${chatId}`);
    }
    promptTimeouts[chatId] = setTimeout(async () => {
        try {
            if (userSelections[chatId] && userSelections[chatId].files.length > 0 && userSelections[chatId].step !== "awaiting_file_selection" && !userSelections[chatId].promptLock) {
                userSelections[chatId].step = "awaiting_file_selection";
                const fileOptions = userSelections[chatId].files
                    .map((file, index) => `${index + 1}. ${file.filename}`)
                    .join("\n");
                console.log(`[${new Date().toISOString()}] Sending file selection prompt for chatId: ${chatId}: ${fileOptions}`);
                await safeReply(lastMessage, `Please select a file to print:\n${fileOptions}\nReply with the number (e.g., 1) or 'cancel' to reset.`);
            } else {
                console.log(`[${new Date().toISOString()}] No prompt sent for chatId: ${chatId}, step: ${userSelections[chatId]?.step}, files: ${userSelections[chatId]?.files.length}, promptLock: ${userSelections[chatId]?.promptLock}`);
            }
        } catch (err) {
            console.error(`[${new Date().toISOString()}] Prompt error for chatId: ${chatId}:`, err.message, err.stack);
        } finally {
            delete promptTimeouts[chatId];
        }
    }, 1000);
    console.log(`[${new Date().toISOString()}] Scheduled prompt with 1000ms debounce for chatId: ${chatId}`);
}

async function processMessage(message) {
    const chatId = message.from;
    const messageId = message.id._serialized;
    console.log(`[${new Date().toISOString()}] Processing Message: ${message.body}, Has Media: ${message.hasMedia}, Message ID: ${messageId}, chatId: ${chatId}`);

    try {
        if (message.body.toLowerCase() === "cancel") {
            console.log(`[${new Date().toISOString()}] Cancel command received for chatId: ${chatId}`);
            cleanup(chatId);
            await safeReply(message, "🔄 Conversation reset. Please send your document.");
            return;
        }

        if (message.hasMedia) {
            console.log(`[${new Date().toISOString()}] Downloading media for chatId: ${chatId}`);
            const media = await message.downloadMedia();
            if (!media || !media.data) {
                console.log(`[${new Date().toISOString()}] Failed to download media for chatId: ${chatId}`);
                await safeReply(message, "❌ Failed to download media. Please try again.");
                return;
            }

            const mimeType = media.mimetype;
            const mimeToExtension = {
                "application/pdf": "pdf",
                "application/msword": "doc",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/jpg": "jpeg",
            };
            const fileExtension = mimeToExtension[mimeType] || mimeType.split("/")[1].split(";")[0];
            const fileType = mimeType.split("/")[0];
            const allowedExtensions = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];

            if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
                console.log(`[${new Date().toISOString()}] Unsupported file format: ${fileExtension} for chatId: ${chatId}`);
                await safeReply(message, "❌ Unsupported file format. Please send a PDF, Word document, or image.");
                return;
            }

            let originalFilename = message._data.filename || `file_${Date.now()}.${fileExtension}`;
            if (!originalFilename.includes(".")) {
                originalFilename = `${originalFilename}.${fileExtension}`;
            }
            originalFilename = path.basename(originalFilename);
            const uniquePrefix = `${chatId}_${Date.now()}`;
            const filePath = path.join("Uploads", `${uniquePrefix}_${originalFilename}`);

            if (!fs.existsSync("Uploads")) {
                console.log(`[${new Date().toISOString()}] Creating Uploads directory`);
                fs.mkdirSync("Uploads", { recursive: true });
            }
            console.log(`[${new Date().toISOString()}] Saving file: ${filePath}`);
            fs.writeFileSync(filePath, Buffer.from(media.data, "base64"));

            let processedFilePath = filePath;
            if (fileType === "image") {
                const outputPDFPath = filePath.replace(/\.\w+$/, ".pdf");
                console.log(`[${new Date().toISOString()}] Converting image to PDF: ${outputPDFPath}`);
                await new Promise((resolve, reject) => {
                    convertImageToPDF(filePath, outputPDFPath, (err, convertedPDFPath) => {
                        if (err || !fs.existsSync(convertedPDFPath)) {
                            reject(new Error("Image conversion failed: " + err.message));
                        } else {
                            resolve(convertedPDFPath);
                        }
                    });
                });
                processedFilePath = outputPDFPath;
            } else if (fileExtension === "doc" || fileExtension === "docx") {
                const outputPDFPath = filePath.replace(/\.\w+$/, ".pdf");
                console.log(`[${new Date().toISOString()}] Converting Word to PDF: ${outputPDFPath}`);
                try {
                    await new Promise((resolve, reject) => {
                        convertWordToPDF(filePath, outputPDFPath, (err, convertedPDFPath) => {
                            if (err || !fs.existsSync(convertedPDFPath)) {
                                reject(err || new Error("Word document conversion failed"));
                            } else {
                                resolve(convertedPDFPath);
                            }
                        });
                    });
                    processedFilePath = outputPDFPath;
                } catch (err) {
                    console.error(`[${new Date().toISOString()}] Word conversion error for chatId: ${chatId}:`, err.message, err.stack);
                    await safeReply(message, "❌ Failed to convert Word document to PDF. Please ensure the file is valid and try again.");
                    return;
                }
            }

            if (!userSelections[chatId]) {
                userSelections[chatId] = { files: [], step: null, promptLock: false };
                console.log(`[${new Date().toISOString()}] Initialized userSelections for chatId: ${chatId}`);
            }

            const fileExists = userSelections[chatId].files.some((file) => file.filePath === processedFilePath);
            if (!fileExists) {
                userSelections[chatId].files.push({
                    filePath: processedFilePath,
                    originalPath: filePath,
                    filename: originalFilename,
                });
                console.log(`[${new Date().toISOString()}] Added file to userSelections: ${originalFilename}, Total files: ${userSelections[chatId].files.length}, chatId: ${chatId}`);
            } else {
                console.log(`[${new Date().toISOString()}] File already added, skipping: ${originalFilename}, chatId: ${chatId}`);
            }
        } else if (userSelections[chatId]?.step === "awaiting_file_selection") {
            const input = message.body.trim().toLowerCase();
            console.log(`[${new Date().toISOString()}] Awaiting file selection input: ${input}, chatId: ${chatId}`);
            if (input === "cancel") {
                cleanup(chatId);
                await safeReply(message, "🔄 Conversation reset. Please send your document.");
                return;
            }
            const choice = parseInt(input) - 1;
            const files = userSelections[chatId].files;
            if (isNaN(choice) || choice < 0 || choice >= files.length) {
                const fileOptions = files.map((file, index) => `${index + 1}. ${file.filename}`).join("\n");
                console.log(`[${new Date().toISOString()}] Invalid file selection input: ${input}, prompting again, chatId: ${chatId}`);
                await safeReply(message, `❌ Invalid choice. Please select a file to print:\n${fileOptions}\nReply with the number (e.g., 1) or 'cancel' to reset.`);
                return;
            }

            const selectedFile = files[choice];
            userSelections[chatId].filePath = selectedFile.filePath;
            userSelections[chatId].originalPath = selectedFile.originalPath;

            files.forEach((file, index) => {
                if (index !== choice) {
                    if (file.filePath && fs.existsSync(file.filePath)) {
                        console.log(`[${new Date().toISOString()}] Deleting unselected file: ${file.filePath}, chatId: ${chatId}`);
                        fs.unlinkSync(file.filePath);
                    }
                    if (file.originalPath && fs.existsSync(file.originalPath)) {
                        console.log(`[${new Date().toISOString()}] Deleting unselected original file: ${file.originalPath}, chatId: ${chatId}`);
                        fs.unlinkSync(file.originalPath);
                    }
                }
            });

            userSelections[chatId].files = [selectedFile];
            userSelections[chatId].step = "awaiting_action";
            userSelections[chatId].promptLock = true;
            console.log(`[${new Date().toISOString()}] Selected file: ${selectedFile.filename}, chatId: ${chatId}, promptLock set to true`);

            if (promptTimeouts[chatId]) {
                clearTimeout(promptTimeouts[chatId]);
                delete promptTimeouts[chatId];
                console.log(`[${new Date().toISOString()}] Cleared prompt timeout after file selection for chatId: ${chatId}`);
            }

            await safeReply(message, `✅ Selected ${selectedFile.filename}. Do you want to:
1️⃣ Print immediately 🖨
2️⃣ Edit the document ✏️
3️⃣ Cancel ❌
Reply with 1, 2, 3, or 'cancel'.`);
        } else if (userSelections[chatId]?.step === "awaiting_action") {
            const input = message.body.trim().toLowerCase();
            console.log(`[${new Date().toISOString()}] Awaiting action input: ${input}, chatId: ${chatId}`);
            if (input === "1") {
                userSelections[chatId].step = "awaiting_pages";
                await safeReply(message, "Enter the page range (e.g., 1-5 or 'all').");
            } else if (input === "2") {
                userSelections[chatId].step = "editing";
                await safeReply(message, "✏️ Editing option selected. What would you like to modify?");
            } else if (input === "3" || input === "cancel") {
                cleanup(chatId);
                await safeReply(message, "🔄 Conversation reset. Please send your document.");
            } else {
                await safeReply(message, "❌ Invalid choice. Reply with 1, 2, 3, or 'cancel'.");
            }
        } else if (userSelections[chatId]?.step === "editing") {
            console.log(`[${new Date().toISOString()}] Editing step, resetting conversation, chatId: ${chatId}`);
            await safeReply(message, "Please visit our office to make modifications to your document.");
            cleanup(chatId);
            await safeReply(message, "🔄 Conversation reset. Please send your document.");
        } else if (userSelections[chatId]?.step === "awaiting_pages") {
            userSelections[chatId].pages = message.body.trim();
            userSelections[chatId].step = "awaiting_copies";
            await safeReply(message, "Enter the number of copies.");
        } else if (userSelections[chatId]?.step === "awaiting_copies") {
            const copies = parseInt(message.body);
            if (isNaN(copies) || copies < 1) {
                console.log(`[${new Date().toISOString()}] Invalid copies input: ${message.body}, chatId: ${chatId}`);
                await safeReply(message, "❌ Invalid number. Enter a valid number of copies.");
                return;
            }
            userSelections[chatId].copies = copies;
            userSelections[chatId].step = "awaiting_color";
            await safeReply(message, "Choose print type: (1) Black & White (2) Color");
        } else if (userSelections[chatId]?.step === "awaiting_color") {
            userSelections[chatId].color = message.body === "2";
            userSelections[chatId].step = "awaiting_size";
            await safeReply(message, "Choose paper size: (1) A4 (2) A3");
        } else if (userSelections[chatId]?.step === "awaiting_size") {
            userSelections[chatId].size = message.body === "2" ? "A3" : "A4";
            const { pages, copies, color, size, filePath } = userSelections[chatId];
            console.log(`[${new Date().toISOString()}] Calculating cost:`, { pages, copies, color, size, chatId });
            const pageCount = pages.toLowerCase() === "all" ? getPageCount(filePath) : parsePageRange(pages);
            const totalCost = calculateCost(pageCount, copies, color, size);
            userSelections[chatId].totalCost = totalCost;
            userSelections[chatId].step = "awaiting_payment_method";
            await safeReply(message, `Total Cost: ₦${totalCost}.\nHow would you like to pay?\n(1) Card\n(2) Cash`);
        } else if (userSelections[chatId]?.step === "awaiting_payment_method") {
            if (message.body === "1") {
                userSelections[chatId].paymentMethod = "card";
                userSelections[chatId].step = "awaiting_payment";
                await initiatePayment(chatId, userSelections[chatId].totalCost, message);
            } else if (message.body === "2") {
                userSelections[chatId].paymentMethod = "cash";
                userSelections[chatId].step = "pending_cash";
                console.log(`[${new Date().toISOString()}] Cash payment selected, job pending for chatId: ${chatId}`);
                await safeReply(message, `✅ Cash payment selected. Please pay ₦${userSelections[chatId].totalCost} at the print shop. Awaiting confirmation from staff.`);
            } else {
                console.log(`[${new Date().toISOString()}] Invalid payment method input: ${message.body}, chatId: ${chatId}`);
                await safeReply(message, "❌ Invalid choice. Reply with (1) Card or (2) Cash.");
            }
        } else if (userSelections[chatId]?.step === "awaiting_payment") {
            await safeReply(message, "Please complete the payment using the link sent earlier.");
        } else if (userSelections[chatId]?.step === "pending_cash") {
            await safeReply(message, `Your print job is pending cash payment of ₦${userSelections[chatId].totalCost}. Please pay at the print shop. Awaiting staff confirmation.`);
        } else {
            console.log(`[${new Date().toISOString()}] Initial state, prompting welcome message, chatId: ${chatId}`);
            await safeReply(message, "Welcome to Apex Business Hub!\n📄 Please send your document (PDF, Word, or image), or type 'cancel' to reset.");
        }
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Message error for chatId: ${chatId}:`, err.message, err.stack);
        await safeReply(message, "❌ An error occurred. Please try again or contact support.");
    }
}

client.on("message", async (message) => {
    const chatId = message.from;
    const messageId = message.id._serialized;
    console.log(`[${new Date().toISOString()}] Received Message: ${message.body}, Has Media: ${message.hasMedia}, Message ID: ${messageId}, chatId: ${chatId}`);

    if (processedMessageIds.has(messageId)) {
        console.log(`[${new Date().toISOString()}] Ignoring duplicate message ID: ${messageId}, chatId: ${chatId}`);
        return;
    }
    processedMessageIds.add(messageId);
    setTimeout(() => processedMessageIds.delete(messageId), 5 * 60 * 1000);

    if (!messageQueues[chatId]) {
        messageQueues[chatId] = [];
        messageQueues[chatId].isProcessing = false;
        console.log(`[${new Date().toISOString()}] Initialized message queue for chatId: ${chatId}`);
    }

    await new Promise((resolve) => {
        messageQueues[chatId].push({ message, resolve });
        console.log(`[${new Date().toISOString()}] Queued message for chatId: ${chatId}, queue length: ${messageQueues[chatId].length}`);
        processQueue(chatId);
    });
});

async function safeReply(message, text) {
    try {
        await message.reply(text);
        console.log(`[${new Date().toISOString()}] Sent reply: ${text}`);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Reply error:`, err.message, err.stack);
    }
}

async function initiatePayment(chatId, amount, message) {
    try {
        console.log(`[${new Date().toISOString()}] Initiating payment for chatId: ${chatId}, amount: ${amount}`);
        const response = await axios.post(`http://localhost:3000/initialize-payment`, {
            chatId,
            amount,
        });
        const { paymentUrl, paymentReference } = response.data;
        userSelections[chatId].paymentReference = paymentReference;
        console.log(`[${new Date().toISOString()}] Payment URL: ${paymentUrl}, chatId: ${chatId}`);
        await safeReply(message, `Please complete your payment here: ${paymentUrl}`);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Payment initiation error for chatId: ${chatId}:`, err.message, err.stack);
        await safeReply(message, "❌ Failed to initiate payment. Please try again.");
    }
}

function calculateCost(pageCount, copies, isColor, size) {
    const costPerPage = PRICING[size][isColor ? "color" : "bw"];
    return pageCount * copies * costPerPage;
}

function getPageCount(filePath) {
    console.log(`[${new Date().toISOString()}] Getting page count for: ${filePath}`);
    return 1; // Placeholder
}

function parsePageRange(pages) {
    console.log(`[${new Date().toISOString()}] Parsing page range: ${pages}`);
    if (pages.includes("-")) {
        const [start, end] = pages.split("-").map(Number);
        return end - start + 1;
    }
    return 1;
}

function executePrintCommand(filePath, copies, isColor, pages, size, message, chatId) {
    const printerName = "SHARP MX-4141N PCL6";
    const outputPDF = filePath.replace(/\.[^/.]+$/, ".print.pdf");

    console.log(`[${new Date().toISOString()}] Executing print command for chatId: ${chatId}:`, { filePath, copies, isColor, pages, size });
    if (!fs.existsSync(filePath)) {
        console.error(`[${new Date().toISOString()}] File does not exist: ${filePath}, chatId: ${chatId}`);
        safeReply(message, "❌ Error: Print file not found. Please resend your document.");
        cleanup(chatId);
        return;
    }

    if (pages.toLowerCase() === "all") {
        convertToBWIfNeeded(filePath, copies, isColor, size, message, chatId);
        return;
    }

    const qpdfPath = `"C:\\Program Files\\qpdf\\bin\\qpdf.exe"`;
    const extractCommand = `${qpdfPath} "${filePath.replace(/"/g, '\\"')}" --pages . ${pages} -- "${outputPDF.replace(/"/g, '\\"')}"`;

    console.log(`[${new Date().toISOString()}] Running qpdf command: ${extractCommand}, chatId: ${chatId}`);
    exec(extractCommand, (error, stdout, stderr) => {
        if (error || stderr) {
            console.error(`[${new Date().toISOString()}] QPDF Extraction Failed for chatId: ${chatId}:`, { error: error?.message, stderr });
            safeReply(message, `❌ Failed to extract pages: ${stderr || error?.message || 'Unknown error'}`);
            cleanup(chatId);
            return;
        }
        if (!fs.existsSync(outputPDF)) {
            console.error(`[${new Date().toISOString()}] QPDF output file not created: ${outputPDF}, chatId: ${chatId}`);
            safeReply(message, "❌ Failed to extract pages: Output file not created.");
            cleanup(chatId);
            return;
        }
        console.log(`[${new Date().toISOString()}] QPDF Extraction Success: ${outputPDF}, chatId: ${chatId}`);
        convertToBWIfNeeded(outputPDF, copies, isColor, size, message, chatId);
    });
}

function convertToBWIfNeeded(pdfPath, copies, isColor, size, message, chatId) {
    if (!fs.existsSync(pdfPath)) {
        console.error(`[${new Date().toISOString()}] PDF file not found: ${pdfPath}, chatId: ${chatId}`);
        safeReply(message, "❌ Error: PDF file not found for printing.");
        cleanup(chatId);
        return;
    }

    if (isColor) {
        printPDF(pdfPath, copies, isColor, size, message, chatId);
    } else {
        const bwPDF = pdfPath.replace(".print.pdf", ".bw.pdf");
        const gsPath = `"C:\\Program Files\\gs\\gs10.04.0\\bin\\gswin64c.exe"`;
        const gsCommand = `${gsPath} -sDEVICE=pdfwrite -sColorConversionStrategy=Gray -dProcessColorModel=/DeviceGray -o "${bwPDF.replace(/"/g, '\\"')}" "${pdfPath.replace(/"/g, '\\"')}"`;

        console.log(`[${new Date().toISOString()}] Running Ghostscript command: ${gsCommand}, chatId: ${chatId}`);
        exec(gsCommand, (error, stdout, stderr) => {
            if (error || stderr) {
                console.error(`[${new Date().toISOString()}] Ghostscript Conversion Failed for chatId: ${chatId}:`, { error: error?.message, stderr });
                safeReply(message, `❌ Failed to convert to black & white: ${stderr || error?.message || 'Unknown error'}`);
                cleanup(chatId);
                return;
            }
            if (!fs.existsSync(bwPDF)) {
                console.error(`[${new Date().toISOString()}] Ghostscript output file not created: ${bwPDF}, chatId: ${chatId}`);
                safeReply(message, "❌ Failed to convert to black & white: Output file not created.");
                cleanup(chatId);
                return;
            }
            console.log(`[${new Date().toISOString()}] Converted to Black & White: ${bwPDF}, chatId: ${chatId}`);
            printPDF(bwPDF, copies, isColor, size, message, chatId);
        });
    }
}

function printPDF(pdfPath, copies, isColor, size, message, chatId) {
    const printerName = "SHARP MX-4141N PCL6";
    const sumatraPath = `"C:\\Program Files\\SumatraPDF\\SumatraPDF.exe"`;
    const paperSizeOption = size === "A3" ? '-print-settings "paper=A3"' : '-print-settings "paper=A4"';
    const printCommand = `${sumatraPath} -print-to "${printerName}" ${paperSizeOption} "${pdfPath.replace(/"/g, '\\"')}"`;

    if (!fs.existsSync(pdfPath)) {
        console.error(`[${new Date().toISOString()}] Print file not found: ${pdfPath}, chatId: ${chatId}`);
        safeReply(message, "❌ Error: Print file not found.");
        cleanup(chatId);
        return;
    }

    console.log(`[${new Date().toISOString()}] Running print command: ${printCommand}, chatId: ${chatId}`);
    let remainingCopies = copies;
    const printNextCopy = () => {
        exec(printCommand, (error, stdout, stderr) => {
            if (error || stderr) {
                console.error(`[${new Date().toISOString()}] Printing failed for chatId: ${chatId}:`, { error: error?.message, stderr });
                safeReply(message, `❌ Printing failed: ${error?.message || 'Unknown error'}`);
                cleanup(chatId);
                return;
            }
            remainingCopies--;
            console.log(`[${new Date().toISOString()}] Printed copy ${copies - remainingCopies}/${copies}, chatId: ${chatId}`);
            if (remainingCopies > 0) {
                printNextCopy();
            } else {
                console.log(`[${new Date().toISOString()}] Printing Success for chatId: ${chatId}`);
                safeReply(message, "✅ Successfully printed document!");
                cleanup(chatId);
            }
        });
    };
    printNextCopy();
}

function convertImageToPDF(imagePath, outputPDFPath, callback) {
    try {
        const magickPath = `"C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe"`;
        const convertCommand = `${magickPath} "${imagePath.replace(/"/g, '\\"')}" "${outputPDFPath.replace(/"/g, '\\"')}"`;
        console.log(`[${new Date().toISOString()}] Running ImageMagick command: ${convertCommand}`);
        exec(convertCommand, (error, stdout, stderr) => {
            if (error || stderr) {
                console.error(`[${new Date().toISOString()}] Image to PDF conversion failed for ${imagePath}:`, { error: error?.message, stderr });
                callback(error || new Error(stderr || "Conversion failed"), null);
                return;
            }
            if (!fs.existsSync(outputPDFPath)) {
                console.error(`[${new Date().toISOString()}] ImageMagick output file not created: ${outputPDFPath}`);
                callback(new Error("Output file not created"), null);
                return;
            }
            console.log(`[${new Date().toISOString()}] Image converted to PDF: ${outputPDFPath}`);
            callback(null, outputPDFPath);
        });
    } catch (err) {
        console.error(`[${new Date().toISOString()}] ConvertImageToPDF error:`, err.message, err.stack);
        callback(err, null);
    }
}

function convertWordToPDF(inputPath, outputPath, callback) {
    try {
        const outputDir = path.dirname(outputPath);
        const outputFilename = path.basename(inputPath, path.extname(inputPath)) + ".pdf";
        const expectedOutputPath = path.join(outputDir, outputFilename);
        const libreOfficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
        const command = `${libreOfficePath} --headless --convert-to pdf "${inputPath.replace(/"/g, '\\"')}" --outdir "${outputDir.replace(/"/g, '\\"')}"`;

        console.log(`[${new Date().toISOString()}] Running LibreOffice command: ${command}`);
        exec(command, (error, stdout, stderr) => {
            if (error || stderr) {
                const errorMsg = stderr || error?.message || "Unknown LibreOffice error";
                console.error(`[${new Date().toISOString()}] Word to PDF conversion failed for ${inputPath}:`, {
                    error: errorMsg,
                    command,
                    inputPath,
                    outputDir
                });
                callback(new Error(`Word conversion failed: ${errorMsg}`), null);
                return;
            }
            if (!fs.existsSync(expectedOutputPath)) {
                console.error(`[${new Date().toISOString()}] LibreOffice output file not created: ${expectedOutputPath}`, {
                    inputPath,
                    outputDir,
                    stdout
                });
                callback(new Error(`Output file not created: ${expectedOutputPath}`), null);
                return;
            }
            try {
                if (expectedOutputPath !== outputPath) {
                    fs.renameSync(expectedOutputPath, outputPath);
                    console.log(`[${new Date().toISOString()}] Renamed output file to: ${outputPath}`);
                }
                console.log(`[${new Date().toISOString()}] Successfully converted to PDF: ${outputPath}`);
                callback(null, outputPath);
            } catch (renameErr) {
                console.error(`[${new Date().toISOString()}] Failed to rename output file from ${expectedOutputPath} to ${outputPath}:`, renameErr);
                callback(new Error(`Failed to rename output file: ${renameErr.message}`), null);
            }
        });
    } catch (err) {
        console.error(`[${new Date().toISOString()}] ConvertWordToPDF error:`, err.message, err.stack);
        callback(err, null);
    }
}

function cleanup(chatId, filePath = null) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            console.log(`[${new Date().toISOString()}] Deleting file: ${filePath}, chatId: ${chatId}`);
            fs.unlinkSync(filePath);
        }
        if (chatId && userSelections[chatId]) {
            console.log(`[${new Date().toISOString()}] Clearing selection for chatId: ${chatId}`);
            for (const file of userSelections[chatId].files) {
                if (file.filePath && fs.existsSync(file.filePath)) {
                    console.log(`[${new Date().toISOString()}] Deleting file: ${file.filePath}, chatId: ${chatId}`);
                    fs.unlinkSync(file.filePath);
                }
                if (file.originalPath && fs.existsSync(file.originalPath)) {
                    console.log(`[${new Date().toISOString()}] Deleting original file: ${file.originalPath}, chatId: ${chatId}`);
                    fs.unlinkSync(file.originalPath);
                }
            }
            delete userSelections[chatId];
        }
        if (messageQueues[chatId]) {
            messageQueues[chatId] = [];
            messageQueues[chatId].isProcessing = false;
            console.log(`[${new Date().toISOString()}] Cleared message queue for chatId: ${chatId}`);
        }
        if (promptTimeouts[chatId]) {
            clearTimeout(promptTimeouts[chatId]);
            delete promptTimeouts[chatId];
            console.log(`[${new Date().toISOString()}] Cleared prompt timeout for chatId: ${chatId}`);
        }
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Cleanup error for chatId: ${chatId}:`, err.message);
    }
}

module.exports = {
    client,
    userSelections,
    initiatePayment,
    executePrintCommand,
    cleanup,
};