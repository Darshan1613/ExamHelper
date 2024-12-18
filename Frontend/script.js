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
const fileInput = document.getElementById('file-input');
const fileBtn = document.getElementById('file-btn');

// Backend URL (set to localhost for development)
const API_URL = 'https://examhelper-backend.onrender.com'; // Change to production URL when deploying

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

let currentFileContext = null;
let currentUploadedFile = null;
let fileAnalysis = null;
let isFileUploading = false;

const sendMessage = async () => {
    const userMessage = messageInput.value.trim();
    if ((!userMessage && !currentUploadedFile) || isAIGenerating || isFileUploading) return;

    isAIGenerating = true;
    sendBtn.disabled = true;
    sendBtn.classList.add('loading');

    try {
        // If there's a file to process
        if (currentUploadedFile) {
            const preview = document.getElementById('upload-preview');
            const progress = preview.querySelector('.progress');
            
            const formData = new FormData();
            formData.append('file', currentUploadedFile);

            // Upload the file first
            const uploadResponse = await fetch(`${API_URL}/analyze-file`, {
                method: 'POST',
                body: formData,
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    progress.style.width = `${percentCompleted}%`;
                }
            });

            const fileData = await uploadResponse.json();
            
            if (fileData.success) {
                // Add file context to the message
                currentFileContext = fileData.analysis;
                
                // If there's a message, send it with file context
                if (userMessage) {
                    appendMessage('user', `📎 ${currentUploadedFile.name}\n${userMessage}`);
                    const response = await fetch(`${API_URL}/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: userMessage,
                            fileContext: currentFileContext
                        })
                    });
                    
                    const data = await response.json();
                    displayResponse(data.response);
                } else {
                    // If no message, just show file analysis
                    appendMessage('user', `📎 ${currentUploadedFile.name}`);
                    appendMessage('bot', fileData.analysis);
                }
                
                // Clean up
                document.getElementById('upload-preview').style.display = 'none';
                currentUploadedFile = null;
                fileInput.value = '';
            }
        } else {
            // Regular message without file
            appendMessage('user', userMessage);
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage })
            });
            
            const data = await response.json();
            displayResponse(data.response);
        }

        messageInput.value = '';
    } catch (error) {
        console.error('Error:', error);
        appendMessage('bot', 'Sorry, something went wrong while processing your request.');
    } finally {
        isAIGenerating = false;
        sendBtn.disabled = false;
        sendBtn.classList.remove('loading');
    }
};

// Display Response with typing animation
const displayResponse = async (responseParts) => {
    for (const part of responseParts) {
        if (part.type === 'text') {
            const typingIndicator = showTypingIndicator();
            await typeMessage(part.content, typingIndicator); // Animate text typing
        } else if (part.type === 'code') {
            const typingIndicator = showTypingIndicator();
            await delay(1000); // Show typing indicator briefly
            typingIndicator.remove();
            appendCodeSnippet(part.content);
        } else if (part.type === 'table') {
            const typingIndicator = showTypingIndicator();
            await delay(1000); // Show typing indicator briefly
            typingIndicator.remove();
            appendTable(part.content);
        }
        await delay(300); // Small delay between different parts
    }
};

// Function to animate text typing
const typeMessage = async (content, typingIndicator) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'bot-message');
    
    const avatar = document.createElement('img');
    avatar.src = 'bot-icon.png';
    avatar.alt = 'bot';
    avatar.classList.add('bot-avatar');
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    // Insert the message div but hide the content
    typingIndicator.insertAdjacentElement('beforebegin', messageDiv);
    
    // Format and type the content
    const formattedContent = formatBotMessage(content);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formattedContent;
    
    // Type each character with HTML preservation
    await typeHTML(tempDiv, messageContent);
    
    // Remove typing indicator and scroll to bottom
    typingIndicator.remove();
    chatBox.scrollTop = chatBox.scrollHeight;
};

// Helper function for delays
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to type HTML content
const typeHTML = async (sourceDiv, targetDiv) => {
    const children = Array.from(sourceDiv.childNodes);
    for (const child of children) {
        if (child.nodeType === Node.TEXT_NODE) {
            await typeText(child.textContent, targetDiv);
        } else {
            const newElement = child.cloneNode(false);
            targetDiv.appendChild(newElement);
            await typeHTML(child, newElement);
        }
    }
};

// Function to type text
const typeText = async (text, element) => {
    const words = text.split(' ');
    for (const word of words) {
        element.insertAdjacentText('beforeend', word + ' ');
        await delay(50); // Delay between words
    }
};

// Format Bot Message
const formatBotMessage = (content) => {
    // Split content into paragraphs
    content = content.split('\n\n').map(para => 
        `<div class="paragraph">${para}</div>`
    ).join('');
    
    // Format bullet points and numbered lists
    content = content.replace(/^[•●∙-]\s+(.+)/gm, '<li>$1</li>');
    content = content.replace(/^(\d+\.|\d+\))\s+(.+)/gm, '<li>$2</li>');
    content = content.replace(/<li>.*?<\/li>/gs, match => 
        `<ul class="bot-list">${match}</ul>`
    );

    // Format section headers
    content = content.replace(/^(#{1,3})\s+(.+)/gm, (_, level, text) => {
        const headingLevel = level.length;
        return `<div class="section-title heading-${headingLevel}">${text}</div>`;
    });

    // Format bold text
    content = content.replace(/\*\*(.*?)\*\*/g, '<span class="emphasis">$1</span>');
    content = content.replace(/__(.*?)__/g, '<span class="emphasis">$1</span>');

    // Format key points
    content = content.replace(/\[key:(.*?)\]/g, '<div class="key-point">$1</div>');

    // Format definitions
    content = content.replace(/\[def:(.*?)\]/g, '<div class="definition">$1</div>');
    
    // Format important points
    content = content.replace(/\[imp:(.*?)\]/g, '<div class="important-point">$1</div>');
    
    // Format examples
    content = content.replace(/\[ex:(.*?)\]/g, '<div class="example">$1</div>');
    
    // Format math expressions
    content = content.replace(/\$\$(.*?)\$\$/g, '<span class="math">$1</span>');
    
    // Format quotes
    content = content.replace(/^>\s+(.+)/gm, '<blockquote class="quote">$1</blockquote>');

    return content;
};

// Append Text Message
const appendMessage = (sender, content) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.innerHTML = formatBotMessage(content);

    const avatar = document.createElement('img');
    avatar.src = sender === 'user' ? 'user-icon.png' : 'bot-icon.png';
    avatar.alt = sender;
    avatar.classList.add(sender === 'user' ? 'user-avatar' : 'bot-avatar');

    if (sender === 'user') {
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(avatar);
    } else {
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
    }

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
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

// Add to script.js
fileBtn.addEventListener('click', () => fileInput.click());

// Modified file input handler
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById('upload-preview');
    const fileName = preview.querySelector('.file-name');
    const progress = preview.querySelector('.progress');
    const sendBtn = document.getElementById('send-btn');
    
    fileName.textContent = file.name;
    progress.style.width = '0%';
    preview.style.display = 'flex';
    
    // Disable send button while uploading
    isFileUploading = true;
    sendBtn.disabled = true;
    
    // Upload file immediately but don't send to chat
    uploadFile(file, progress);
});

// New file upload function
const uploadFile = async (file, progressElement) => {
    const formData = new FormData();
    formData.append('file', file);
    const sendBtn = document.getElementById('send-btn');

    try {
        const response = await fetch(`${API_URL}/analyze-file`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            progressElement.style.width = '100%';
            currentUploadedFile = file;
            fileAnalysis = data.analysis;
            
            // Enable send button after successful upload
            isFileUploading = false;
            sendBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        document.getElementById('upload-preview').style.display = 'none';
        appendMessage('bot', 'Sorry, there was an error uploading your file.');
        
        // Reset upload state
        isFileUploading = false;
        sendBtn.disabled = false;
    }
};

// Send file to chat button handler
document.querySelector('.send-file').addEventListener('click', () => {
    if (currentUploadedFile && fileAnalysis && !isFileUploading) {
        // Create file message
        const fileContent = `📎 **${currentUploadedFile.name}**\n\n${
            currentUploadedFile.type.startsWith('image/') ? '🖼️ Image Analysis:\n' : '📄 File Content:\n'
        }${fileAnalysis}`;
        
        appendMessage('user', fileContent);
        
        // Store context for follow-up questions
        currentFileContext = fileAnalysis;
        
        // Show prompt for questions
        appendMessage('bot', 'I\'ve analyzed your file. You can:\n' +
            '• Ask questions about specific parts\n' +
            '• Request summaries or explanations\n' +
            '• Get study recommendations based on the content');
        
        // Clean up
        document.getElementById('upload-preview').style.display = 'none';
        currentUploadedFile = null;
        fileAnalysis = null;
        fileInput.value = '';
    }
});

// Modified remove file handler
document.querySelector('.remove-file').addEventListener('click', () => {
    document.getElementById('upload-preview').style.display = 'none';
    currentUploadedFile = null;
    fileAnalysis = null;
    fileInput.value = '';
    isFileUploading = false;
    sendBtn.disabled = false;
});
