import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';

const { Client, LocalAuth } = pkg;

export const qrCodeEmitter = new EventEmitter(); // Event emitter for QR codes
export let qrCodeUrl = ''; // Variable to hold the latest QR code URL

// Create a new WhatsApp client with local authentication (stores session for reuse)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Ensure Puppeteer runs safely in all environments
    },
});

// Event when the QR code is generated
client.on('qr', async (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above to log in.');

    qrCodeUrl = await QRCode.toDataURL(qr); // Convert QR code to a data URL
    // console.log(qrCodeUrl);

    qrCodeEmitter.emit('qrCodeGenerated', qrCodeUrl); // Emit QR code URL
});

// Event when the client is ready
client.on('ready', () => {
    console.log('Client is ready!');
});

// Handle authentication failure or session timeout
client.on('auth_failure', (message) => {
    console.error('Authentication failed:', message);
    console.log('Please scan the QR code again to log in.');
});

// Catch disconnection errors
client.on('disconnected', (reason) => {
    console.error('Client disconnected:', reason);
    console.log('Reinitializing the client...');
    client.initialize(); // Reinitialize the client upon disconnection
});

// Function to send a message
export const sendMessage = async (phoneNumber, message) => {
    try {
        const chatId = `${phoneNumber}@c.us`; // WhatsApp contact ID format
        await client.sendMessage(chatId, message); // Send message directly to the chat ID
        console.log(`Message sent to ${phoneNumber}: ${message}`);
    } catch (error) {
        console.error(`Error sending message to ${phoneNumber}:`, error);
    }
};

// Initialize the WhatsApp client
export const initializeClient = () => {
    try {
        client.initialize(); // Initialize the client safely
    } catch (error) {
        console.error('Error initializing the client:', error);
    }
};
