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
const fileInput = document.getElementById("file-input");
const attachBtn = document.getElementById("attach-btn");
const uploadStatus = document.getElementById("upload-status");

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

// ===== File sharing (photos / videos / audio) =====
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (keep in sync with server)

// Attach button opens the hidden file picker
attachBtn.addEventListener("click", () => fileInput.click());

// When a file is chosen: validate -> upload -> emit as a message
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  // Client-side validation (server enforces these too)
  if (!/^(image|video|audio)\//.test(file.type)) {
    alert("Only image, video and audio files are allowed.");
    fileInput.value = "";
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    alert("File is too large. Max size is 25 MB.");
    fileInput.value = "";
    return;
  }

  // Private chat needs a selected receiver before sending
  let receiver = "";
  if (room === "Private-Chat") {
    receiver = userSelect.value;
    if (!receiver) {
      alert("Please select a user to send the file to!");
      fileInput.value = "";
      return;
    }
  }

  setUploading(true, `Uploading ${file.name}…`);

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Upload failed");
    }

    const payload = {
      msg: "",
      type: data.fileType,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
    };

    if (room === "Group-Chat") {
      socket.emit("groupChatMessage", payload);
    } else if (room === "Private-Chat") {
      socket.emit("chatMessage", { ...payload, receiver });
    }
  } catch (err) {
    console.error("Upload error:", err);
    alert(err.message || "Upload failed. Please try again.");
  } finally {
    setUploading(false);
    fileInput.value = "";
  }
});

function setUploading(isUploading, text = "") {
  attachBtn.disabled = isUploading;
  if (isUploading) {
    uploadStatus.textContent = text;
    uploadStatus.style.display = "block";
  } else {
    uploadStatus.style.display = "none";
    uploadStatus.textContent = "";
  }
}

// DOM output functions

// Escape HTML to prevent XSS when injecting user-provided content
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Build the media/text body of a message based on its type
function renderMessageBody(message) {
  const url = message.fileUrl ? encodeURI(message.fileUrl) : "";
  switch (message.type) {
    case "image":
      return `<a class="media-link" href="${url}" target="_blank" rel="noopener">
                <img class="media-img" src="${url}" alt="${escapeHtml(message.fileName)}" />
              </a>`;
    case "video":
      return `<video class="media-video" src="${url}" controls preload="metadata"></video>`;
    case "audio":
      return `<audio class="media-audio" src="${url}" controls preload="metadata"></audio>`;
    default:
      return `<p class="text">${escapeHtml(message.text)}</p>`;
  }
}

function outputMessage(message) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerHTML = `
    <p class="meta">${escapeHtml(message.username)} <span>${escapeHtml(message.time)}</span></p>
    ${renderMessageBody(message)}
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