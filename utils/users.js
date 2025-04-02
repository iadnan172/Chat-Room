
const users = []; // In-memory storage for connected users

// Join user to chat (with password)
function userJoin(id, username, room, password) {
  const user = { 
    id, 
    username, 
    room, 
    password // Password is now included in user object
  };
  users.push(user);
  return user;
}

// Get current user by socket ID
function getCurrentUser(id) {
  return users.find(user => user.id === id);
}

// User leaves chat
function userLeave(id) {
  const index = users.findIndex(user => user.id === id);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

// Get room users
function getRoomUsers(room) {
  return users.filter(user => user.room === room);
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
};