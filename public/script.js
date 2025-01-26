document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    let username = localStorage.getItem('username') || '';

    const chatHeader = document.querySelector('.chat-header h3');
    if (chatHeader) {
        chatHeader.textContent = username ? ` ${username}` : ' ${username} ';
    }

    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const messageInput = document.getElementById('messageInput');
            const message = messageInput.value.trim();
            if (message) {
                displayMessage({ username, message, type: 'sent' });
                socket.emit('send message', { username, message });
                messageInput.value = '';
            }
        });
    }

    socket.on('receive message', function(data) {
        displayMessage({ username: data.username, message: data.message, type: 'received' });
    });

    const createGroupButton = document.querySelector('.create-group');
    if (createGroupButton) {
        createGroupButton.addEventListener('click', function () {
            const groupName = prompt('Enter a group name:');
            if (groupName) {
                socket.emit('create group', { groupName, createdBy: username });
            }
        });
    }

    function displayMessage({ username, message, type }) {
        const chatList = document.getElementById('chatList');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', type);
        messageElement.innerHTML = `<strong>${username}:</strong> ${message}`;
        chatList.appendChild(messageElement);
        chatList.scrollTop = chatList.scrollHeight;
    }

    socket.on('update user list', function(users) {
        const userList = document.querySelector('.user-list');
        if (userList) {
            userList.innerHTML = '';
            users.forEach(user => {
                const userElement = document.createElement('div');
                userElement.classList.add('user');
                userElement.textContent = user;
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

    const signupButton = document.getElementById('signup-btn');
    if (signupButton) {
        signupButton.addEventListener('click', function () {
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const usernameValue = usernameInput.value.trim();
            const passwordValue = passwordInput.value.trim();

            if (usernameValue && passwordValue) {
                localStorage.setItem('username', usernameValue);
                window.location.href = 'chat.html';
            } else {
                alert('Please fill in all fields before signing up.');
            }
        });
    }

    if (username) {
        socket.emit('new user', username);
    }

    socket.on('update user list', function(users) {
        const userList = document.querySelector('.user-list');
        if (userList) {
            userList.innerHTML = '';
            users.forEach(user => {
                const userElement = document.createElement('div');
                userElement.classList.add('user');
                userElement.textContent = user;
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
});
