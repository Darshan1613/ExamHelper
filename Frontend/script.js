// DOM Elements
const pinInputs = document.querySelectorAll('.pin-box');
const unlockBtn = document.getElementById('unlock-btn');
const pinError = document.getElementById('pin-error');
const lockScreen = document.getElementById('lock-screen');
const chatInterface = document.getElementById('chat-interface');
const sendBtn = document.getElementById('send-btn');
const messageInput = document.getElementById('message-input');
const chatBox = document.getElementById('chat-box');
const quoteText = document.getElementById('quote-text');

// Backend URL (set to localhost for development)
const API_URL = 'http://localhost:3000'; // Change to production URL when deploying

// Fetch and Display a Motivational Quote
const fetchMotivationalQuote = async () => {
    try {
        const response = await fetch(`${API_URL}/generate-quote`);
        const data = await response.json();
        quoteText.textContent = `"${data.quote}"`;
    } catch (error) {
        console.error('Error fetching motivational quote:', error);
        quoteText.textContent = '"Stay focused and keep learning!"';
    }
};

// PIN Input Handling
pinInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && index < pinInputs.length - 1) {
            pinInputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value === '' && index > 0) {
            pinInputs[index - 1].focus();
        }
    });
});

// Unlock Chat Interface
unlockBtn.addEventListener('click', () => {
    const pin = Array.from(pinInputs).map(input => input.value).join('');
    if (pin === '1234') {
        lockScreen.style.display = 'none';
        chatInterface.style.display = 'flex';
        fetchMotivationalQuote();
    } else {
        pinError.textContent = 'Incorrect PIN. Please try again.';
    }
});

// Send Message
let isAIGenerating = false;

const showTypingIndicator = () => {
    const indicator = document.createElement('div');
    indicator.classList.add('message', 'bot-message', 'typing-indicator');
    indicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatBox.appendChild(indicator);
    chatBox.scrollTop = chatBox.scrollHeight;
    return indicator;
};

const sendMessage = async () => {
    const userMessage = messageInput.value.trim();
    if (!userMessage || isAIGenerating) return;

    appendMessage('user', userMessage);
    messageInput.value = '';

    // Show typing indicator and disable send button
    isAIGenerating = true;
    sendBtn.disabled = true;
    sendBtn.classList.add('loading');
    const typingIndicator = showTypingIndicator();

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage })
        });

        const data = await response.json();
        chatBox.removeChild(typingIndicator);
        displayResponse(data.response);
    } catch (error) {
        chatBox.removeChild(typingIndicator);
        appendMessage('bot', 'Oops! Something went wrong.');
        console.error('Error:', error);
    } finally {
        isAIGenerating = false;
        sendBtn.disabled = false;
        sendBtn.classList.remove('loading');
    }
};

// Display Response (handles text, code, and tables)
const displayResponse = (responseParts) => {
    responseParts.forEach((part) => {
        if (part.type === 'text') {
            appendMessage('bot', part.content); // Add text to chat
        } else if (part.type === 'code') {
            appendCodeSnippet(part.content); // Render code block
        } else if (part.type === 'table') {
            appendTable(part.content); // Render table
        }
    });
};

// Append Text Message
const appendMessage = (sender, content) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

    const avatar = document.createElement('img');
    avatar.src = sender === 'user' ? 'user-icon.png' : 'bot-icon.png';
    avatar.alt = sender;

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.textContent = content;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    chatBox.appendChild(messageDiv);

    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to latest message
};

// Append Code Snippet
const appendCodeSnippet = (code) => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('code-block');
    
    const pre = document.createElement('pre');
    const codeElement = document.createElement('code');
    codeElement.textContent = code;
    pre.appendChild(codeElement);
    
    wrapper.appendChild(pre);
    
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
};

// Append Table
const appendTable = (tableHtml) => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('table-block');
    
    const table = document.createElement('table');
    const rows = tableHtml.split('\n').filter(row => row.trim());
    
    rows.forEach((row, index) => {
        const tr = document.createElement('tr');
        const cells = row.split('|').filter(cell => cell.trim());
        
        cells.forEach(cell => {
            const element = document.createElement(index === 0 ? 'th' : 'td');
            element.textContent = cell.trim();
            tr.appendChild(element);
        });
        
        table.appendChild(tr);
    });
    
    wrapper.appendChild(table);
    
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
};

// Event Listeners for Sending Messages
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isAIGenerating) {
        sendMessage();
    }
});