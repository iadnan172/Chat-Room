document.addEventListener('DOMContentLoaded', function() {
    // Initialize socket connection
    const socket = io();
    
    // Retrieve username from local storage or set to empty string if not found
    let username = localStorage.getItem('username') || '';

    // Update the chat header with the username
    const chatHeader = document.querySelector('.chat-header h3');
    if (chatHeader) {
        chatHeader.textContent = username ? ` ${username}` : ' ${username} ';
    }

    // Handle message form submission
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const messageInput = document.getElementById('messageInput');
            const message = messageInput.value.trim();
            
            // Check if message is not empty before sending
            if (message) {
                socket.emit('send message', { username, message });
                messageInput.value = ''; // Clear input field after sending
            }
        });
    }

    // Listen for incoming messages from the server
    socket.on('receive message', function(data) {
        displayMessage({ username: data.username, message: data.message, type: data.username === username ? 'sent' : 'received' });
    });

    // Handle group creation button click
    const createGroupButton = document.querySelector('.create-group');
    if (createGroupButton) {
        createGroupButton.addEventListener('click', function () {
            const groupName = prompt('Enter a group name:');
            if (groupName) {
                socket.emit('create group', { groupName, createdBy: username });
            }
        });
    }

    // Function to display messages in the chat window
    function displayMessage({ username, message, type }) {
        const chatList = document.getElementById('chatList');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', type);
        messageElement.innerHTML = `<strong>${username}:</strong> ${message}`;
        chatList.appendChild(messageElement);
        chatList.scrollTop = chatList.scrollHeight; // Auto-scroll to the latest message
    }

    // Update user list when a new user joins or leaves
    socket.on('update user list', function(users) {
        const userList = document.querySelector('.user-list');
        if (userList) {
            userList.innerHTML = '';
            users.forEach(user => {
                const userElement = document.createElement('div');
                userElement.classList.add('user');
                userElement.textContent = user;
                
                // Allow clicking on a user to initiate a private chat
                userElement.addEventListener('click', function() {
                    const activeUser = document.querySelector('.chat-header h3');
                    if (activeUser) {
                        activeUser.textContent = `Chatting with: ${user}`;
                    }
                });
                
                userList.appendChild(userElement);
            });
        }
    });

    // Handle user signup and store username in local storage
    const signupButton = document.getElementById('signup-btn');
    if (signupButton) {
        signupButton.addEventListener('click', function () {
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const usernameValue = usernameInput.value.trim();
            const passwordValue = passwordInput.value.trim();

            // Validate input fields before signing up
            if (usernameValue && passwordValue) {
                localStorage.setItem('username', usernameValue);
                window.location.href = 'chat.html'; // Redirect to chat page
            } else {
                alert('Please fill in all fields before signing up.');
            }
        });
    }

    // Notify the server when a new user joins
    if (username) {
        socket.emit('new user', username);
    }
});





// document.addEventListener('DOMContentLoaded', function() {
//     // Initialize socket connection
//     const socket = io();
    
//     // Retrieve username from local storage or set to empty string if not found
//     let username = localStorage.getItem('username') || '';

//     // Update the chat header with the username
//     const chatHeader = document.querySelector('.chat-header h3');
//     if (chatHeader) {
//         chatHeader.textContent = username ? ` ${username}` : ' ${username} ';
//     }

//     // Handle message form submission
//     const messageForm = document.getElementById('messageForm');
//     if (messageForm) {
//         messageForm.addEventListener('submit', function(e) {
//             e.preventDefault();
//             const messageInput = document.getElementById('messageInput');
//             const message = messageInput.value.trim();
            
//             // Check if message is not empty before sending
//             if (message) {
//                 socket.emit('send message', { username, message });
//                 messageInput.value = ''; // Clear input field after sending
//             }
//         });
//     }

//     // Listen for incoming messages from the server
//     socket.on('receive message', function(data) {
//         displayMessage({ username: data.username, message: data.message, type: data.username === username ? 'sent' : 'received' });
//     });

//     // Handle group creation button click
//     const createGroupButton = document.querySelector('.create-group');
//     if (createGroupButton) {
//         createGroupButton.addEventListener('click', function () {
//             const groupName = prompt('Enter a group name:');
//             if (groupName) {
//                 socket.emit('create group', { groupName, createdBy: username });
//             }
//         });
//     }

//     // Function to display messages in the chat window
//     function displayMessage({ username, message, type }) {
//         const chatList = document.getElementById('chatList');
//         const messageElement = document.createElement('div');
//         messageElement.classList.add('message', type);
//         messageElement.innerHTML = `<strong>${username}:</strong> ${message}`;
//         chatList.appendChild(messageElement);
//         chatList.scrollTop = chatList.scrollHeight; // Auto-scroll to the latest message
//     }

//     // Update user list when a new user joins or leaves
//     socket.on('update user list', function(users) {
//         const userList = document.querySelector('.user-list');
//         if (userList) {
//             userList.innerHTML = '';
//             users.forEach(user => {
//                 const userElement = document.createElement('div');
//                 userElement.classList.add('user');
//                 userElement.textContent = user;
                
//                 // Allow clicking on a user to initiate a private chat
//                 userElement.addEventListener('click', function() {
//                     const activeUser = document.querySelector('.chat-header h3');
//                     if (activeUser) {
//                         activeUser.textContent = `Chatting with: ${user}`;
//                     }
//                 });
                
//                 userList.appendChild(userElement);
//             });
//         }
//     });

//     // Handle user signup and store username in local storage
//     const signupButton = document.getElementById('signup-btn');
//     if (signupButton) {
//         signupButton.addEventListener('click', function () {
//             const usernameInput = document.getElementById('username');
//             const passwordInput = document.getElementById('password');
//             const usernameValue = usernameInput.value.trim();
//             const passwordValue = passwordInput.value.trim();

//             // Validate input fields before signing up
//             if (usernameValue && passwordValue) {
//                 localStorage.setItem('username', usernameValue);
//                 window.location.href = 'chat.html'; // Redirect to chat page
//             } else {
//                 alert('Please fill in all fields before signing up.');
//             }
//         });
//     }

//     // Notify the server when a new user joins
//     if (username) {
//         socket.emit('new user', username);
//     }
// });
