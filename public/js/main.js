
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
// // Message from server
// socket.on("message", (message) => {
//   console.log(message);
//   outputMessage(message);
//   chatMessages.scrollTop = chatMessages.scrollHeight;
// });

// // Message submit handler
// chatForm.addEventListener("submit", (e) => {
//   e.preventDefault();
//   const msg = e.target.elements.msg.value.trim();
//   const receiver = e.target.elements.receiver.value.trim();

//   if (msg && receiver) {
//     socket.emit("chatMessage", { msg, receiver });
//     e.target.elements.msg.value = "";
//     e.target.elements.receiver.value = "";
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

const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const roomName = document.getElementById("room-name");
const userList = document.getElementById("users");

// Get username, room, and password from URL
const { username, room, password } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io(); // Initialize socket FIRST

// Join chatroom with password
socket.emit("joinRoom", { username, room, password });

// Get room and users
socket.on("roomUsers", ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});
//-------------------------------------------------
// In your client-side main.js
if (room === "Group-chat") {
  socket.emit("groupChatMessage", { msg });
}

//-------------------------------------------------
// Message from server
socket.on("message", (message) => {
  console.log(message);
  outputMessage(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Message submit handler
// chatForm.addEventListener("submit", (e) => {
//   e.preventDefault();
//   const msg = e.target.elements.msg.value.trim();
//   const receiver = e.target.elements.receiver.value.trim();
  
//   if (msg) {
//     if (room === "group-chat") {
//       // Send message to group chat
//       socket.emit("groupChatMessage", { username, room, msg });
//     } else if (receiver) {
//       // Send private message
//       socket.emit("chatMessage", { msg, receiver });
//     }
//     e.target.elements.msg.value = "";
//     e.target.elements.receiver.value = "";
//     e.target.elements.msg.focus();
//   }
// });

// Modify your message submit handler
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = e.target.elements.msg.value.trim();
  const receiver = e.target.elements.receiver.value.trim();
  
  if (msg) {
    if (room === "Group-chat") {
      // Ensure no receiver for group chats
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
    window.location = "../index.html";
  }
});
