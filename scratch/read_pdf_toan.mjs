import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse-fork');
console.log("pdf-parse type:", typeof pdf);
const fs = require('fs');

async function extractPdfText() {
    const dataBuffer = fs.readFileSync('E:/antigravity_projects/ptchau1708/Open-lms-Pre/scratch/SGK-Toan-4-KNTT-Tap-1_b885e.pdf');
    try {
        const data = await pdf(dataBuffer);
        // Let's sample pages or get overall info
        console.log("Pages:", data.numpages);
        console.log("Info:", data.info);
        console.log("Metadata:", data.metadata);
        console.log("Version:", data.version);
        console.log("Full text object length:", data.text.trim().length);
        console.log("Sample text:", JSON.stringify(data.text));
    } catch (e) {
        console.error("PDF Read Error:", e);
    }
}

extractPdfText();
