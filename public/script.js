const socket = io();

const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const messages = document.getElementById('messages');

let username;

// Set username
document.getElementById('join-chat').addEventListener('click', () => {
    username = document.getElementById('username-input').value.trim();
    if (username) {
        socket.emit('set username', username);
        document.getElementById('username-modal').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';
        document.getElementById('chat-username').textContent = `Logged in as: ${username}`;
    }
});

// Send message
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (message) {
        const data = { username, message };
        addMessage(data, 'sent');
        socket.emit('chat message', data);
        input.value = '';
    }
});

// Listen for incoming messages
socket.on('chat message', (data) => {
    addMessage(data, 'received');
});

// Add a message to the chat
function addMessage({ username, message }, type) {
    const li = document.createElement('li');
    li.textContent = `${username}: ${message}`;
    li.classList.add(type);
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
}
