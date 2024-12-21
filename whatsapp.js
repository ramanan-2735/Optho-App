import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const { Client, LocalAuth } = pkg;

// Create a new WhatsApp client with local authentication (stores session for reuse)
const client = new Client({
    authStrategy: new LocalAuth(),
});

// Event when the QR code is generated
client.on('qr', (qr) => {
    // Generate and print QR code in the terminal
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above to log in.');
});

// Event when the client is ready
client.on('ready', () => {
    console.log('Client is ready!');
    // Optional: Test message or dynamic message functionality
    // sendMessage('918693858222', 'This message is dynamically generated. Hello from whatsapp-web.js!');
});

// Function to send a message
export const sendMessage = async (phoneNumber, message) => {
    try {
        const chat = await client.getChatById(`${phoneNumber}@c.us`);  // WhatsApp contact ID format
        await chat.sendMessage(message);
        console.log(`Message sent to ${phoneNumber}: ${message}`);
    } catch (error) {
        console.error(`Error sending message to ${phoneNumber}:`, error);
    }
};

// Initialize the WhatsApp client
export const initializeClient = () => client.initialize();
