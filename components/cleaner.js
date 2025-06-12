import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Needed to use __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tmpDir = path.join(__dirname,"..",'tmpPDF');

const clearTmpPDF = async () => {
    try {
        const files = await fs.readdir(tmpDir);
        for (const file of files) {
            const filePath = path.join(tmpDir, file);
            try {
                await fs.unlink(filePath);
                console.log(`Deleted: ${file}`);
            } catch (err) {
                console.error(`Failed to delete ${file}:`, err);
            }
        }
    } catch (err) {
        console.error('Error reading tmpPDF directory:', err);
    }
};

// Run on startup
clearTmpPDF();

// Then every 15 minutes
setInterval(clearTmpPDF, 5 * 60 * 1000);
