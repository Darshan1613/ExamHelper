// Get all necessary DOM elements
const pinInputs = document.querySelectorAll('.pin-box'); // All individual PIN input boxes
const unlockBtn = document.getElementById('unlock-btn');
const pinError = document.getElementById('pin-error');
const lockScreen = document.getElementById('lock-screen');
const chatInterface = document.getElementById('chat-interface');
const sendBtn = document.getElementById('send-btn');
const messageInput = document.getElementById('message-input');
const chatBox = document.getElementById('chat-box');
const quoteText = document.getElementById('quote-text'); // For motivational quotes

// Backend API URL
const API_URL =
    window.location.hostname === 'localhost'
        ? 'http://localhost:3000' // Local testing
        : 'https://https://exam-backend-bbz2hcpzl-darshan1613s-projects.vercel.ap'; // Deployed backend

// Fetch a motivational quote from GPT API
const fetchMotivationalQuote = async () => {
    try {
        const response = await fetch(`${API_URL}/generate-quote`, {
            method: 'GET',
        });
        const data = await response.json();
        return data.quote || "Stay motivated and keep pushing forward!";
    } catch (error) {
        console.error("Error fetching motivational quote:", error);
        return "Hard work beats talent when talent doesn’t work hard.";
    }
};

// Display a motivational quote on the chat screen
const displayMotivationalQuote = async () => {
    const quote = await fetchMotivationalQuote();
    quoteText.textContent = `"${quote}"`;
};

// Highlight the active PIN input
pinInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        if (input.value.length === 1 && index < pinInputs.length - 1) {
            pinInputs[index + 1].focus(); // Move to next input
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value === '' && index > 0) {
            pinInputs[index - 1].focus(); // Move to previous input
        }
    });

    // Add focus highlight
    input.addEventListener('focus', () => {
        input.style.boxShadow = '0 0 5px rgba(76, 175, 80, 0.5)'; // Highlight active input
    });

    input.addEventListener('blur', () => {
        input.style.boxShadow = 'none'; // Remove highlight on blur
    });
});

// Unlock the chat interface after entering the correct PIN
unlockBtn.addEventListener('click', () => {
    const pin = Array.from(pinInputs).map(input => input.value).join(''); // Combine values from all inputs
    if (!pin || pin.length !== 4) {
        pinError.textContent = 'Please enter a valid 4-digit PIN.';
        return;
    }

    // Example: Replace '1234' with your backend validation logic
    if (pin === '1234') {
        pinError.textContent = ''; // Clear error
        lockScreen.style.display = 'none'; // Hide lock screen
        chatInterface.style.display = 'flex'; // Show chat interface
        displayMotivationalQuote(); // Fetch and show motivational quote
    } else {
        pinError.textContent = 'Incorrect PIN. Please try again.';
    }
});

// Send a chat message
const sendMessage = async () => {
    const message = messageInput.value.trim();
    if (!message) return;

    addMessage('user', message);

    const loader = document.createElement('div');
    loader.classList.add('message', 'bot-message');
    loader.innerHTML = `<div class="loader"></div>`;
    chatBox.appendChild(loader);

    // Disable the send button while the message is being processed
    sendBtn.disabled = true;
    sendBtn.classList.add('loading');

    messageInput.value = '';

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await response.json();

        chatBox.removeChild(loader); // Remove loader
        addMessage('bot', data.response);
    } catch (error) {
        chatBox.removeChild(loader); // Remove loader
        addMessage('bot', 'Oops! Something went wrong. Please try again later.');
    } finally {
        sendBtn.disabled = false; // Re-enable the send button
        sendBtn.classList.remove('loading');
    }
};

// Add a new message to the chat box
const addMessage = (sender, content) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

    const avatar = document.createElement('img');
    avatar.src = sender === 'user' ? 'user-icon.png' : 'bot-icon.png';
    avatar.alt = sender;

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    // Process content to render special formats
    if (/<pre><code>.*<\/code><\/pre>/.test(content)) {
        // Render as a code snippet
        const codeBlock = document.createElement('pre');
        codeBlock.classList.add('code-snippet');
        codeBlock.textContent = content.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/)[1];
        messageContent.appendChild(codeBlock);
    } else if (/^<img.*src=.*>$/.test(content)) {
        // Render as an image
        const img = document.createElement('img');
        img.src = content.match(/src=["'](.*?)["']/)[1];
        img.alt = 'Generated Image';
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        messageContent.appendChild(img);
    } else if (/<table>.*<\/table>/.test(content)) {
        // Render as a table
        const table = document.createElement('div');
        table.classList.add('table-wrapper');
        table.innerHTML = content;
        messageContent.appendChild(table);
    } else {
        // Render as plain HTML text
        if (content.length > 500) {
            const shortContent = content.slice(0, 500);
            messageContent.innerHTML = `${shortContent}... <a href="#" class="read-more">Read more</a>`;
        } else {
            messageContent.innerHTML = content;
        }
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    chatBox.appendChild(messageDiv);

    // Ensure the chat box scrolls to the latest message
    chatBox.scrollTop = chatBox.scrollHeight;
};

// Event listeners for sending messages
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});