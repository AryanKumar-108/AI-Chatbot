function toggleSettingsPopover() {
    if (!settingsPopover) return;
        
    const willOpen = settingsPopover.classList.contains('hidden');
    if (willOpen) {
        const savedTheme = localStorage.getItem('aichatbot-theme') || 'light';
        const chips = settingsPopover.querySelectorAll('.chip[data-theme]');
        chips.forEach(ch => ch.classList.toggle('active', ch.dataset.theme === savedTheme));
        const savedModel = localStorage.getItem('aichatbot-model') || 'gemini-1.5-flash-latest';
        if (modelSelectPop) modelSelectPop.value = savedModel;
    }
    settingsPopover.classList.toggle('hidden');
    settingsPopover.classList.toggle('open');
}

function saveSettingsPopover() {
    if (!settingsPopover) return;
    const chips = settingsPopover.querySelectorAll('.chip[data-theme]');
    const selected = Array.from(chips).find(c => c.classList.contains('active'));
    const theme = selected ? selected.dataset.theme : 'light';
    if (theme === 'system') {
        localStorage.removeItem('aichatbot-theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
    } else {
        localStorage.setItem('aichatbot-theme', theme);
        applyTheme(theme);
    }
    if (modelSelectPop) localStorage.setItem('aichatbot-model', modelSelectPop.value);
    settingsPopover.classList.add('hidden');
    settingsPopover.classList.remove('open');
}
const API_KEY = 'Place Your Gemini API Key Here';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';


const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const welcomeSection = document.getElementById('welcome-section');
const newChatBtn = document.getElementById('new-chat-btn');
const menuBtn = document.querySelector('.menu-btn');
const sidebar = document.querySelector('.sidebar');
const suggestionChips = document.querySelectorAll('.suggestion-chip');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const reloadBtn = document.getElementById('reload-btn');
const fileInput = document.getElementById('file-input');
const attachBtn = document.querySelector('.attach-btn');
const attachmentPreview = document.getElementById('attachment-preview');
const settingsBtn = document.getElementById('settings-btn');
// Settings popover (lightweight inline settings)
// Note: removed legacy modal elements for simplicity and performance.
const themeChips = document.querySelectorAll('.chip[data-theme]');
const settingsPopover = document.getElementById('settings-popover');
const modelSelectPop = document.getElementById('model-select-pop');
const settingsSavePop = document.getElementById('settings-save-pop');
const menuBtnTop = document.getElementById('menu-btn');
const menuDropdown = document.getElementById('menu-dropdown');
const menuClearChat = document.getElementById('menu-clear-chat');
const menuClearAll = document.getElementById('menu-clear-all');
const menuExport = document.getElementById('menu-export');
const menuAbout = document.getElementById('menu-about');
const scrollFab = document.getElementById('scroll-to-bottom');


let isGenerating = false;
let chatHistory = [];


// Initialize essential UI wiring and state on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadChatHistory();
    adjustTextareaHeight();
    initializeTheme();
});

function initializeEventListeners() {
    
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', handleKeyDown);
    userInput.addEventListener('input', handleInputChange);
    
    
    newChatBtn.addEventListener('click', startNewChat);
    
    
    menuBtn.addEventListener('click', toggleSidebar);
    
    
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.getAttribute('data-prompt');
            userInput.value = prompt;
            handleSendMessage();
        });
    });
    
    
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    
    themeToggleBtn.addEventListener('click', toggleTheme);

    
    reloadBtn.addEventListener('click', () => {
        
        startNewChat();
    });

    
    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelected);
    }

    // Settings modal
    if (settingsBtn) settingsBtn.addEventListener('click', toggleSettingsPopover);
    themeChips.forEach(chip => chip.addEventListener('click', () => selectThemeChip(chip)));
    if (settingsSavePop) settingsSavePop.addEventListener('click', saveSettingsPopover);

    
    if (menuBtnTop && menuDropdown) {
        menuBtnTop.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!menuDropdown.classList.contains('hidden')) {
                if (!menuDropdown.contains(e.target) && e.target !== menuBtnTop) {
                    menuDropdown.classList.add('hidden');
                }
            }
        });
    }

    if (menuClearChat) menuClearChat.addEventListener('click', () => { chatMessages.innerHTML = ''; menuDropdown.classList.add('hidden'); });
    if (menuClearAll) menuClearAll.addEventListener('click', () => { localStorage.removeItem('aichatbot-chat-history'); chatHistory = []; updateChatHistoryUI(); menuDropdown.classList.add('hidden'); });
    if (menuExport) menuExport.addEventListener('click', exportCurrentChat);
    if (menuAbout) menuAbout.addEventListener('click', () => { alert('AI ChatBot — powered by Gemini API.'); menuDropdown.classList.add('hidden'); });

    if (chatMessages) {
        chatMessages.addEventListener('scroll', handleScrollFab);
    }
    if (scrollFab) {
        scrollFab.addEventListener('click', () => {
            chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
        });
    }
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
}

function handleInputChange() {
    adjustTextareaHeight();
    updateSendButton();
}

function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
}

function updateSendButton() {
    const hasText = userInput.value.trim().length > 0;
    sendButton.disabled = !hasText || isGenerating;
}

async function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message || isGenerating) return;

    
    welcomeSection.style.display = 'none';
    chatMessages.classList.add('active');
    
    // Add user message to UI
    addMessage(message, 'user');
    userInput.value = '';
    adjustTextareaHeight();
    updateSendButton();
    
    // Show typing indicator while we wait for API
    showTypingIndicator();
    
    try {
        isGenerating = true;
        sendButton.disabled = true;
        
        const response = await generateResponseWithAttachment(message);
        hideTypingIndicator();
        addMessage(response, 'bot');
        
        // Persist a compact summary for the sidebar history
        chatHistory.push({ user: message, bot: response });
        saveChatHistory();
        
    } catch (error) {
        console.error('Error:', error);
        hideTypingIndicator();
        addMessage('Sorry, I hit an error. Please try again.', 'bot');
    } finally {
        isGenerating = false;
        updateSendButton();
        userInput.focus();
    }
}

function handleFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        fileInput.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        if (!attachmentPreview) return;
        attachmentPreview.classList.remove('hidden');
        attachmentPreview.innerHTML = '';
        const img = document.createElement('img');
        img.src = reader.result;
        img.alt = file.name;
        attachmentPreview.appendChild(img);
        const chip = document.createElement('div');
        chip.className = 'attachment-chip';
        chip.innerHTML = `<span>${file.name}</span><button type="button" id="remove-attachment" title="Remove"><span class="material-icons">close</span></button>`;
        attachmentPreview.appendChild(chip);
        const removeBtn = document.getElementById('remove-attachment');
        if (removeBtn) removeBtn.addEventListener('click', clearAttachment);
        updateSendButton();
    };
    reader.readAsDataURL(file);
}

function clearAttachment() {
    if (!attachmentPreview) return;
    attachmentPreview.classList.add('hidden');
    attachmentPreview.innerHTML = '';
    if (fileInput) fileInput.value = '';
}

async function generateResponseWithAttachment(prompt) {
    const hasImage = fileInput && fileInput.files && fileInput.files[0];
    if (!hasImage) {
        return generateResponse(prompt);
    }
    const file = fileInput.files[0];
    const base64 = await toBase64(file);
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: file.type, data: base64.split(',')[1] } }
                ]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024
            }
        })
    });
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    clearAttachment();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function generateResponse(prompt) {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                            text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        })
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response format from API');
    }

    return data.candidates[0].content.parts[0].text;
}

function addMessage(content, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender} fade-in`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    // Use image avatar for bot, initial for user
    if (sender === 'bot') {
        const img = document.createElement('img');
        img.src = '../Media/ChatBot-Logo.png';
        img.alt = 'AI ChatBot';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        avatar.appendChild(img);
    } else {
        const img = document.createElement('img');
        img.src = '../Media/User.png';
        img.alt = 'You';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        avatar.appendChild(img);
    }

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    if (sender === 'bot') {
        messageContent.innerHTML = renderMarkdownSafe(content);
    } else {
        messageContent.textContent = content;
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    // Utilities row (timestamp only)
    const utils = document.createElement('div');
    utils.className = 'message-utils';
    const time = document.createElement('span');
    time.className = 'timestamp';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    utils.appendChild(time);
    messageDiv.appendChild(utils);

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot typing-indicator';
    typingDiv.id = 'typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    const img = document.createElement('img');
    img.src = '../Media/ChatBot-Logo.png';
    img.alt = 'AI ChatBot';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.borderRadius = '50%';
    avatar.appendChild(img);
    
    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    dots.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(dots);
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function startNewChat() {
    // Reset chat UI to the welcome state
    chatMessages.innerHTML = '';
    chatMessages.classList.remove('active');
    welcomeSection.style.display = 'flex';
    
    // Clear input
        userInput.value = '';
    adjustTextareaHeight();
    updateSendButton();
    
    // Start a fresh history buffer
    chatHistory = [];
    saveChatHistory();
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
    
    userInput.focus();
}

function toggleSidebar() {
    sidebar.classList.toggle('open');
}

function loadChatHistory() {
    const saved = localStorage.getItem('aichatbot-chat-history');
    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
            updateChatHistoryUI();
        } catch (error) {
            console.error('Error loading chat history:', error);
            chatHistory = [];
        }
    }
}

function saveChatHistory() {
    try {
        localStorage.setItem('aichatbot-chat-history', JSON.stringify(chatHistory));
        updateChatHistoryUI();
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

function updateChatHistoryUI() {
    const historyContainer = document.getElementById('chat-history');
    historyContainer.innerHTML = '';
    
    if (chatHistory.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'chat-history-item';
        emptyState.textContent = 'No recent chats';
        emptyState.style.color = '#9aa0a6';
        emptyState.style.fontStyle = 'italic';
        historyContainer.appendChild(emptyState);
        return;
    }
    
    chatHistory.forEach((chat, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'chat-history-item';
        historyItem.textContent = chat.user.substring(0, 50) + (chat.user.length > 50 ? '...' : '');
        historyItem.addEventListener('click', () => loadChatFromHistory(index));
        historyContainer.appendChild(historyItem);
    });
}

function loadChatFromHistory(index) {
    const chat = chatHistory[index];
    if (!chat) return;
    
    // Show chat messages
    welcomeSection.style.display = 'none';
    chatMessages.classList.add('active');
    chatMessages.innerHTML = '';
    
    // Add messages from history
    addMessage(chat.user, 'user');
    addMessage(chat.bot, 'bot');
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('open');
    }
});

function handleScrollFab() {
    const atBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 20;
    if (!scrollFab) return;
    scrollFab.classList.toggle('show', !atBottom);
}

// Auto-focus input on load
userInput.focus();

// Theme handling
function initializeTheme() {
    const savedTheme = localStorage.getItem('aichatbot-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem('aichatbot-theme', theme);
    updateThemeIcon(theme);
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    themeToggleIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
}

function selectThemeChip(chip) {
    themeChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
}

function exportCurrentChat() {
    const items = Array.from(document.querySelectorAll('.message .message-content'));
    const lines = items.map(el => el.textContent);
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (menuDropdown) menuDropdown.classList.add('hidden');
}

// Minimal Markdown renderer (safe subset)
function renderMarkdownSafe(text) {
    const escape = (s) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    let html = escape(text);
    // code blocks ```
    html = html.replace(/```([\s\S]*?)```/g, (m, p1) => `<pre><code>${escape(p1)}</code></pre>`);
    // inline code `code`
    html = html.replace(/`([^`]+)`/g, (m, p1) => `<code>${escape(p1)}</code>`);
    // bold **text** and italics *text*
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // simple lists
    html = html.replace(/(?:^|\n)(- .*(?:\n- .*)*)/g, (m) => {
        const items = m.trim().split(/\n/).map(li => `<li>${escape(li.replace(/^[-*]\s*/, ''))}</li>`).join('');
        return `\n<ul>${items}</ul>`;
    });
    // line breaks
    html = html.replace(/\n{2,}/g, '</p><p>');
    html = `<p>${html}</p>`;
    return html;
}