// Check if user is authenticated
const token = localStorage.getItem('chatToken');
const storedUsername = localStorage.getItem('username');

if (!token || !storedUsername) {
  console.log('No token or username found, redirecting to login');
  window.location.href = '/index.html';
}

// Verify token on page load
fetch('/api/verify', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(response => {
  if (!response.ok) {
    console.log('Token verification failed');
    localStorage.removeItem('chatToken');
    localStorage.removeItem('username');
    window.location.href = '/index.html';
  }
})
.catch(() => {
  console.log('Token verification error');
  localStorage.removeItem('chatToken');
  localStorage.removeItem('username');
  window.location.href = '/index.html';
});

// Get elements
const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const roomName = document.getElementById("room-name");
const userList = document.getElementById("users");
const privateChatControls = document.getElementById("private-chat-controls");
const userSelect = document.getElementById("user-select");

// Get username and room from URL (use Qs from CDN)
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

console.log('Joining room:', room, 'as user:', username);

// Validate username matches stored username
if (username !== storedUsername) {
  console.log('Username mismatch');
  alert('Session mismatch. Please login again.');
  localStorage.removeItem('chatToken');
  localStorage.removeItem('username');
  window.location.href = '/index.html';
}

// Show/hide private chat controls based on room type
if (room === "Private-Chat") {
  privateChatControls.style.display = "block";
} else {
  privateChatControls.style.display = "none";
}

// Initialize socket with authentication
const socket = io({
  auth: {
    token: token
  }
});

// Handle connection success
socket.on('connect', () => {
  console.log('Socket connected successfully');
});

// Handle authentication errors
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  if (error.message.includes('Authentication')) {
    alert('Authentication failed. Please login again.');
    localStorage.removeItem('chatToken');
    localStorage.removeItem('username');
    window.location.href = '/index.html';
  }
});

// Join chatroom (no password needed now - using JWT)
socket.emit("joinRoom", { room });

// Get room and users
socket.on("roomUsers", ({ room, users }) => {
  console.log('Room users updated:', users);
  outputRoomName(room);
  outputUsers(users);
  
  // Update user selection dropdown for private chat
  if (room === "Private-Chat") {
    updateUserSelect(users);
  }
});

// Message from server
socket.on("message", (message) => {
  console.log('Message received:', message);
  outputMessage(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Update user selection dropdown
function updateUserSelect(users) {
  // Clear existing options except the first one
  userSelect.innerHTML = '<option value="">Select a user...</option>';
  
  // Add all users except current user
  users.forEach(user => {
    if (user.username !== username) {
      const option = document.createElement('option');
      option.value = user.username;
      option.textContent = user.username;
      userSelect.appendChild(option);
    }
  });
}

// Message submit handler
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const msg = e.target.elements.msg.value.trim();
  
  console.log('Sending message - Room:', room, 'Message:', msg);
  
  if (!msg) {
    alert("Please enter a message!");
    return;
  }
  
  if (room === "Group-Chat") {
    // Group chat - no receiver needed
    console.log('Emitting group chat message');
    socket.emit("groupChatMessage", { msg });
  } else if (room === "Private-Chat") {
    // Private chat - get selected receiver
    const receiver = userSelect.value;
    
    if (!receiver) {
      alert("Please select a user to send the message to!");
      return;
    }
    
    console.log('Emitting private chat message to:', receiver);
    socket.emit("chatMessage", { msg, receiver });
  }
  
  // Clear message input and focus
  e.target.elements.msg.value = "";
  e.target.elements.msg.focus();
});

// DOM output functions
function outputMessage(message) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerHTML = `
    <p class="meta">${message.username} <span>${message.time}</span></p>
    <p class="text">${message.text}</p>
  `;
  chatMessages.appendChild(div);
}

function outputRoomName(room) {
  roomName.textContent = room;
}

function outputUsers(users) {
  userList.innerHTML = users.map(user => {
    const isCurrentUser = user.username === username;
    return `<li ${isCurrentUser ? 'style="font-weight: bold; color: #51cf66;"' : ''}>${user.username} ${isCurrentUser ? '(You)' : ''}</li>`;
  }).join("");
}

// Leave room handler
document.getElementById("leave-btn").addEventListener("click", async () => {
  if (confirm("Are you sure you want to leave the chatroom?")) {
    try {
      // Notify server of logout
      await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear local storage
    localStorage.removeItem('chatToken');
    localStorage.removeItem('username');
    
    // Disconnect socket
    socket.disconnect();
    
    // Redirect to login
    window.location.href = "/index.html";
  }
});