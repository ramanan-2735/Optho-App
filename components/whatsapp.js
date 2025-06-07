// import pkg from 'whatsapp-web.js';
// import qrcode from 'qrcode-terminal';
// import QRCode from 'qrcode';
// import { EventEmitter } from 'events';
// import fs from 'fs/promises';

// const { Client, LocalAuth, MessageMedia } = pkg;

// // ======================
// // Global Configurations
// // ======================
// export const qrCodeEmitter = new EventEmitter();
// export let qrCodeUrl = '';
// let isClientReady = false;
// let retryCount = 0;
// const MAX_RETRIES = 3;

// // ======================
// // WhatsApp Client Setup
// // ======================
// const client = new Client({
//     authStrategy: new LocalAuth({
//         dataPath: './sessions'  // Store sessions in ./sessions folder
//     }),
//     puppeteer: {
//         headless: true,
//         args: [
//             '--no-sandbox',
//             '--disable-setuid-sandbox',
//             '--disable-dev-shm-usage'
//         ],
//     },
//     takeoverOnConflict: true,  // Take over existing session
// });

// // ======================
// // Event Handlers
// // ======================
// client.on('qr', async (qr) => {
//     qrcode.generate(qr, { small: true });
//     console.log('📲 Scan the QR code above to log in.');

//     qrCodeUrl = await QRCode.toDataURL(qr);
//     qrCodeEmitter.emit('qrCodeGenerated', qrCodeUrl);
// });

// client.on('authenticated', () => {
//     console.log('🔑 Authentication successful!');
//     qrCodeUrl = '';  // Clear QR code after authentication
// });

// client.on('ready', () => {
//     isClientReady = true;
//     retryCount = 0;  // Reset retry counter on successful connection
//     console.log('🚀 Client is ready!'); 
// });

// client.on('auth_failure', (msg) => {
//     console.error('❌ Authentication failed:', msg);
// });

// client.on('disconnected', async (reason) => {
//     console.log('Disconnected:', reason);
//     if (reason === 'NAVIGATION_ERROR') {
//       await client.destroy(); // Cleanup
//       process.exit(1); // Force Render to restart
//     }
//   });

// client.on('puppeteer_error', (error) => {
//     console.error('🛠️ Puppeteer error:', error);
//     client.destroy().then(() => client.initialize());
// });

// // ======================
// // Core Functions
// // ======================
// export const initializeClient = async () => {
//     try {
//         await client.initialize();
//     } catch (error) {
//         console.error('❌ Initialization error:', error);
//         if (retryCount < MAX_RETRIES) {
//             retryCount++;
//             setTimeout(initializeClient, 5000);
//         }
//     }
// };

// // export const sendMessage = async (phoneNumber, message = "Your Report", filePath = null) => {
// //     try {
// //         if (!isClientReady) {
// //             throw new Error("WhatsApp client is not ready yet!");
// //         }

// //         const chatId = `${phoneNumber}@c.us`;
        
// //         if (filePath) {
// //             const fileBuffer = await fs.readFile(filePath);
// //             const fileExtension = filePath.split('.').pop() || 'file';
// //             const media = new MessageMedia(
// //                 `application/${fileExtension}`,
// //                 fileBuffer.toString('base64'),
// //                 filePath.split('/').pop() || `file.${fileExtension}`
// //             );
// //             await client.sendMessage(chatId, media, { caption: message });
// //             console.log(`📁 File sent to ${phoneNumber}`);
// //         } else {
// //             await client.sendMessage(chatId, message);
// //             console.log(`✉️ Message sent to ${phoneNumber}`);
// //         }
// //     } catch (error) {
// //         console.error(`❌ Error sending to ${phoneNumber}:`, error.message);
// //         throw error;  // Re-throw for caller to handle
// //     }
// // };

// export const sendMessage = async (
//     phoneNumber, 
//     message = "Your Report", 
//     fileInput = null,  // Can be filePath (string) OR Buffer
//     fileName = "file.pdf" || null // Required if fileInput is a Buffer
// ) => {
//     try {
//         if (!isClientReady) {
//             throw new Error("WhatsApp client is not ready yet!");
//         }

//         const chatId = `${phoneNumber}@c.us`;
        
//         if (fileInput) {
//             let media;
            
//             // Case 1: fileInput is a Buffer (PDF in memory)
//             if (Buffer.isBuffer(fileInput)) {
//                 media = new MessageMedia(
//                     'application/pdf',
//                     fileInput.toString('base64'),
//                     fileName
//                 );
//             } 
//             // Case 2: fileInput is a file path (legacy support)
//             else if (typeof fileInput === 'string') {
//                 const fileBuffer = await fs.readFile(fileInput);
//                 const fileExtension = fileInput.split('.').pop() || 'pdf';
//                 media = new MessageMedia(
//                     `application/${fileExtension}`,
//                     fileBuffer.toString('base64'),
//                     fileInput.split('/').pop() || fileName
//                 );
//             } else {
//                 throw new Error("Invalid file input: must be Buffer or file path");
//             }

//             await client.sendMessage(chatId, media, { caption: message });
//             console.log(`📁 File sent to ${phoneNumber}`);
//         } else {
//             await client.sendMessage(chatId, message);
//             console.log(`✉️ Message sent to ${phoneNumber}`);
//         }
//     } catch (error) {
//         console.error(`❌ Error sending to ${phoneNumber}:`, error.message);
//         throw error;
//     }
// };

// // ======================
// // Process Management
// // ======================
// process.on('SIGINT', async () => {
//     console.log('🛑 Shutting down gracefully...');
//     await client.destroy();
//     process.exit(0);
// });

// process.on('unhandledRejection', (error) => {
//     console.error('⚠️ Unhandled rejection:', error);
// });

// // Initialize the client when this module is loaded
// initializeClient().catch(console.error);

// // ======================
// // Module Exports
// // ======================
// export default {
//     initializeClient,
//     sendMessage,
//     qrCodeEmitter,
//     getClientStatus: () => ({ isReady: isClientReady, retryCount }),
// };