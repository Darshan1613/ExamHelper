require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Allow all origins

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

// Chat Endpoint
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    try {
        // Call OpenAI API
        const response = await openai.chat.completions.create({
            model: 'gpt-4', // Specify GPT-4 model
            messages: [
                { role: 'system', content: 'You are a helpful assistant for Simran Mohanty’s NET Life Science exam preparation. This application was developed by Soumya Darshan Pattanaik.' },
                { role: 'user', content: message },
            ],
        });

        const gptResponse = response.choices[0].message.content;

        // Format the response to support various types
        const formattedResponse = formatResponse(gptResponse);

        // Save to chat history
        chatHistory.push({ user: message, bot: formattedResponse });

        // Send response back to client
        res.status(200).json({ response: formattedResponse });
    } catch (error) {
        console.error('Error communicating with OpenAI API:', error);
        res.status(500).json({ error: 'Failed to get a response from GPT' });
    }
});

// Generate Motivational Quote Endpoint
app.get('/generate-quote', async (req, res) => {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'You are a motivational assistant. Generate an inspiring quote related to studying and perseverance.' },
            ],
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

// Function to format GPT response
const formatResponse = (response) => {
    // Replace code blocks
    response = response.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${code}</code></pre>`;
    });

    // Replace tables
    response = response.replace(/\|(.+?)\|/g, (match) => {
        const rows = match
            .trim()
            .split('\n')
            .map((row) =>
                `<tr>${row
                    .split('|')
                    .map((cell) => `<td>${cell.trim()}</td>`)
                    .join('')}</tr>`
            )
            .join('');
        return `<table>${rows}</table>`;
    });

    // Replace emojis
    response = response.replace(/:([a-z_]+):/g, (match, emojiName) => {
        return `<span class="emoji">😊</span>`; // Replace with your emoji logic or fallback
    });

    // Replace images
    response = response.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
        return `<img src="${url}" alt="${alt}" />`;
    });

    return response;
};

// Get Chat History Endpoint
app.get('/history', (req, res) => {
    res.status(200).json(chatHistory);
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));