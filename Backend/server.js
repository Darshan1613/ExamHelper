require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const OpenAI = require('openai');

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

// Chat Endpoint - Using GPT-4o
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    try {
        // Call OpenAI API
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Use GPT-4o model
            messages: [
                { role: 'system', content: 'You are a helpful assistant for Simran Mohanty’s NET Life Science exam preparation. This application was developed by Soumya Darshan Pattanaik.' },
                { role: 'user', content: message },
            ],
            max_tokens: 1000, // Ensures larger responses are handled
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

// Generate Motivational Quote Endpoint - Using GPT-4o
app.get('/generate-quote', async (req, res) => {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are a motivational assistant. Generate an inspiring quote related to studying and perseverance.' },
            ],
            max_tokens: 100, // Limit token size for quotes
        });

        const quote = response.choices[0].message.content.trim();
        res.status(200).json({ quote });
    } catch (error) {
        console.error('Error generating quote:', error);
        res.status(500).json({ error: 'Failed to generate a motivational quote' });
    }
});

// Clear Chat History Endpoint
app.delete('/clear-history', (req, res) => {
    chatHistory = [];
    res.status(200).json({ success: true, message: 'Chat history cleared successfully' });
});

// Get Chat History Endpoint
app.get('/history', (req, res) => {
    res.status(200).json(chatHistory);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));