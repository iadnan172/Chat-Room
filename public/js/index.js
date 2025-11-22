// // Client-side JavaScript for chat application
// const chatForm = document.getElementById("chat-form");
// const chatMessages = document.querySelector(".chat-messages");
// const roomName = document.getElementById("room-name");
// const userList = document.getElementById("users");

// // Get username, room, and password from URL
// const { username, room, password } = Qs.parse(location.search, {
//   ignoreQueryPrefix: true,
// });

// const socket = io(); // Initialize socket FIRST

// // Join chatroom with password
// socket.emit("joinRoom", { username, room, password });

// // Get room and users
// socket.on("roomUsers", ({ room, users }) => {
//   outputRoomName(room);
//   outputUsers(users);
// });
// //-------------------------------------------------
// // In your client-side main.js
// if (room === "Group-chat") {
//   socket.emit("groupChatMessage", { msg });
// }

// //-------------------------------------------------
// // Message from server
// socket.on("message", (message) => {
//   console.log(message);
//   outputMessage(message);
//   chatMessages.scrollTop = chatMessages.scrollHeight;
// });

//  // Message submit handlerr
// chatForm.addEventListener("submit", (e) => {
//   e.preventDefault();
//   const msg = e.target.elements.msg.value.trim();
//   const receiver = e.target.elements.receiver.value.trim();
  
//   if (msg) {
//     if (room === "Group-chat") {
//       // Ensure no receiver for group chats
//       e.target.elements.receiver.value = "";
//       socket.emit("groupChatMessage", { msg });
//     } else if (receiver) {
//       socket.emit("chatMessage", { msg, receiver });
//     } else {
//       alert("Please select a receiver for private chat!");
//     }
    
//     e.target.elements.msg.value = "";
//     e.target.elements.msg.focus();
//   }
// });

// // DOM output functions
// function outputMessage(message) {
//   const div = document.createElement("div");
//   div.classList.add("message");
//   div.innerHTML = `
//     <p class="meta">${message.username} <span>${message.time}</span></p>
//     <p class="text">${message.text}</p>
//   `;
//   chatMessages.appendChild(div);
// }

// function outputRoomName(room) {
//   roomName.textContent = room;
// }

// function outputUsers(users) {
//   userList.innerHTML = users.map(user => 
//     `<li>${user.username}</li>`
//   ).join("");
// }

// // Leave room handler
// document.getElementById("leave-btn").addEventListener("click", () => {
//   if (confirm("Are you sure you want to leave the chatroom?")) {
//     window.location = "../index.html";
//   }
// });


// Check if user is authenticated
const token = localStorage.getItem('chatToken');

if (!token) {
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
    localStorage.removeItem('chatToken');
    localStorage.removeItem('username');
    window.location.href = '/index.html';
  }
})
.catch(() => {
  localStorage.removeItem('chatToken');
  window.location.href = '/index.html';
});

// Get elements
const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const roomName = document.getElementById("room-name");
const userList = document.getElementById("users");

// Get username and room from URL
const { username, room } = qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

// Initialize socket with authentication
const socket = io({
  auth: {
    token: token
  }
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
  outputRoomName(room);
  outputUsers(users);
});

// Message from server
socket.on("message", (message) => {
  console.log(message);
  outputMessage(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Message submit handler
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = e.target.elements.msg.value.trim();
  const receiver = e.target.elements.receiver.value.trim();
  
  if (msg) {
    if (room === "Group-Chat") {
      e.target.elements.receiver.value = "";
      socket.emit("groupChatMessage", { msg });
    } else if (receiver) {
      socket.emit("chatMessage", { msg, receiver });
    } else {
      alert("Please select a receiver for private chat!");
    }
    
    e.target.elements.msg.value = "";
    e.target.elements.msg.focus();
  }
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
  userList.innerHTML = users.map(user => 
    `<li>${user.username}</li>`
  ).join("");
}

// Leave room handler
document.getElementById("leave-btn").addEventListener("click", () => {
  if (confirm("Are you sure you want to leave the chatroom?")) {
    localStorage.removeItem('chatToken');
    localStorage.removeItem('username');
    window.location = "/index.html";
  }
});