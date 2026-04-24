import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { processText } from './services/pinyinService';
import fs from 'fs';
import csvParser from 'csv-parser';
import iconv from 'iconv-lite';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Single processing
app.post('/api/process/single', (req, res) => {
    const { text, targetPolyphones, customConfig } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }
    const result = processText(text, targetPolyphones, customConfig);
    res.json(result);
});

// Batch processing
app.post('/api/process/batch', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
    }

    const results: any[] = [];
    const filePath = req.file.path;
    const targetPolyphones = req.body.targetPolyphones ? JSON.parse(req.body.targetPolyphones) : undefined;
    const customConfig = req.body.customConfig ? JSON.parse(req.body.customConfig) : undefined;
    
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const content = fileBuffer.toString('utf-8');
        const lines = content.split('\n').map(l => l.trim()).filter(l => l);
        
        for (const line of lines) {
            results.push({
                original: line,
                result: processText(line, targetPolyphones, customConfig)
            });
        }
        
        fs.unlinkSync(filePath); // cleanup
        res.json({ results });
    } catch (e) {
        res.status(500).json({ error: 'Failed to process file' });
    }
});

// Instead of backend parsing excel/csv, the best practice in modern web is:
// Frontend uses xlsx/papaparse to parse the file into an array of strings, 
// then sends `{ texts: string[] }` to `/api/process/batch`.
// Let's support both.
app.post('/api/process/batch-texts', (req, res) => {
    const { texts, targetPolyphones, customConfig } = req.body;
    if (!Array.isArray(texts)) {
        return res.status(400).json({ error: 'texts array is required' });
    }
    
    const results = texts.map(text => ({
        original: text,
        result: processText(text, targetPolyphones, customConfig)
    }));
    
    res.json({ results });
});

const server = app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});

// Graceful shutdown
const gracefulShutdown = () => {
    console.log('\nReceived kill signal, shutting down gracefully...');
    server.close(() => {
        console.log('Closed out remaining connections.');
        process.exit(0);
    });

    // Force close after 5s
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 5000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
