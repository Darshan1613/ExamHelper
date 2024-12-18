require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const OpenAI = require('openai');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const lockCode = "1234"; // Replace this with your chosen 4-digit code
let chatHistory = []; // Array to store chat history

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY. Please add it to the .env file.");
    process.exit(1);
}

// OpenAI API Client Initialization
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Use API key from environment variables
});

// Verify Lock Code
app.post('/verify-code', (req, res) => {
    const { code } = req.body;
    if (code === lockCode) {
        res.status(200).json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Incorrect code' });
    }
});

// Modified chat endpoint to handle file context
app.post('/chat', async (req, res) => {
    const { message, fileContext } = req.body;

    try {
        let messages = [
            { 
                role: 'system', 
                content: 'You are a supportive and calming study assistant for Simran Mohanty, who is preparing for the NET Life Science examination. This application was created by her loving partner, Soumya Darshan Pattanaik (affectionately called Doggu). Simran\'s birthday is on May 16, 2000, and Doggu\'s birthday is on January 13, 2001. Your role is to guide Simran through her exam preparation, provide motivation, and help her stay calm and confident. Soumya deeply cares for Simran, so always be there to offer encouragement, support, and focus whenever she needs it.'
            }
        ];

        // Add file context if provided
        if (fileContext) {
            messages.push({ 
                role: 'system', 
                content: `Context from uploaded file: ${fileContext}` 
            });
        }

        messages.push({ role: 'user', content: message });

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            max_tokens: 1000,
        });

        const gptResponse = response.choices[0].message.content;

        // Format the response to split structured content
        const formattedResponse = splitAndFormatResponse(gptResponse);

        // Save to chat history
        chatHistory.push({ user: message, bot: formattedResponse });

        // Send response back to client
        res.status(200).json({ response: formattedResponse });
    } catch (error) {
        console.error('Error communicating with OpenAI API:', error);
        res.status(500).json({ error: 'Failed to get a response from GPT' });
    }
});

// Function to split and format GPT response
const splitAndFormatResponse = (response) => {
    const responseParts = [];
    let remainingText = response;

    // Extract and split code blocks
    remainingText = remainingText.replace(/```([\s\S]*?)```/g, (match, code) => {
        responseParts.push({ 
            type: 'code', 
            content: code.trim() 
        });
        return '';
    });

    // Extract and split tables
    const tableRegex = /\|[\s\S]*?\|[\s\S]*?(?=\n\n|$)/g;
    remainingText = remainingText.replace(tableRegex, (match) => {
        const tableRows = match.trim().split('\n')
            .filter(row => row.trim() !== '')
            .map(row => row.trim());
        
        if (tableRows.length > 0) {
            responseParts.push({
                type: 'table',
                content: tableRows.join('\n')
            });
        }
        return '';
    });

    // Add remaining text
    if (remainingText.trim()) {
        responseParts.push({ 
            type: 'text', 
            content: remainingText.trim() 
        });
    }

    return responseParts;
};

// Clear Chat History Endpoint
app.delete('/clear-history', (req, res) => {
    chatHistory = [];
    res.status(200).json({ success: true, message: 'Chat history cleared successfully' });
});

// Get Chat History Endpoint
app.get('/history', (req, res) => {
    res.status(200).json(chatHistory);
});

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Function to analyze image
const analyzeImage = async (imagePath, mimetype) => {
    const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
    const imageUrl = `data:${mimetype};base64,${base64Image}`;
    
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "Analyze this image in detail and provide insights relevant for exam preparation." },
                    {
                        type: "image_url",
                        image_url: {
                            url: imageUrl,
                            detail: "high"
                        }
                    }
                ]
            }
        ]
    });

    return response.choices[0].message.content;
};

// File upload endpoint
app.post('/upload', upload.array('files'), async (req, res) => {
    try {
        const files = req.files;
        const analysisResults = [];

        for (const file of files) {
            try {
                let result = {
                    type: file.mimetype.startsWith('image/') ? 'image' : 'pdf',
                    name: file.originalname
                };

                if (file.mimetype.startsWith('image/')) {
                    result.analysis = await analyzeImage(file.path, file.mimetype);
                } else if (file.mimetype === 'application/pdf') {
                    const dataBuffer = fs.readFileSync(file.path);
                    const pdfData = await pdf(dataBuffer);
                    result.content = pdfData.text;
                }

                analysisResults.push(result);
            } catch (err) {
                console.error(`Error processing file ${file.originalname}:`, err);
                analysisResults.push({
                    type: 'error',
                    name: file.originalname,
                    error: 'Failed to process file'
                });
            } finally {
                // Clean up uploaded file
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }

        res.json({ success: true, results: analysisResults });
    } catch (error) {
        console.error('Error processing files:', error);
        res.status(500).json({ error: 'Failed to process files' });
    }
});

// Configure multer with progress tracking
const uploadWithProgress = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
}).single('file');

// Modified file analysis endpoint
app.post('/analyze-file', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let analysis = '';
        if (file.mimetype.startsWith('image/')) {
            analysis = await analyzeImage(file.path, file.mimetype);
        } else if (file.mimetype === 'application/pdf') {
            const dataBuffer = fs.readFileSync(file.path);
            const pdfData = await pdf(dataBuffer);
            analysis = pdfData.text;
        }

        fs.unlinkSync(file.path); // Clean up uploaded file
        res.json({ 
            success: true, 
            fileName: file.originalname,
            fileType: file.mimetype,
            analysis: analysis 
        });
    } catch (error) {
        console.error('Error analyzing file:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to analyze file' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));