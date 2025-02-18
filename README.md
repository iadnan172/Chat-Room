# Chat-Room Application

This is a real-time chat-room application built using **Socket.IO**, **HTML**, **CSS**, **JavaScript**, and **MySQL**. The application runs on **localhost:4000** and utilizes a **Redis server** for managing WebSocket connections efficiently.

## Features

- **Real-time messaging** using Socket.IO.
- **User authentication** with MySQL database.
- **Multiple chat rooms** for users to join.
- **Redis server** integration for efficient message broadcasting.
- **Private chat support** between users.
- **User online status tracking**.

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: MySQL
- **Caching & WebSockets**: Redis server

## Installation & Setup

1. **Clone the repository**:
   ```sh
   git clone https://github.com/iadnan172/Chat-Room.git
   cd Chat-Room
   ```

2. **Install dependencies**:
   ```sh
   npm install
   ```

3. **Setup MySQL Database**:
   - Create a MySQL database and update the connection details in the `.env` file.

4. **Run Redis Server**:
   Ensure Redis is installed and running on your system:
   ```sh
   redis-server
   ```

5. **Start the Application**:
   ```sh
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:4000`.

## Environment Variables

Create a `.env` file in the project root and configure the following:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=chat_app
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Folder Structure

```
/chat-room
│── /public            # Frontend files
│   ├── /css           # Stylesheets
│   │   ├── styles.css
│   ├── /js            # JavaScript files
│   │   ├── main.js
│   ├── index.html     # Main chat room page
│   ├── chat.html      # Chat interface page
│── /utils             # Utility functions
│   ├── message.js
│   ├── users.js
│── server.js          # Main server file
│── package.json       # Project dependencies
│── .env               # Environment variables
│── README.md          # Project documentation
```

## Future Enhancements

- Add **media sharing** (images, files, videos).
- Implement **user authentication** using JWT.
- Introduce **message encryption** for privacy.
- Deploy the application on **AWS/GCP**.

## License

This project is licensed under the **MIT License**.

---

**Contributions are welcome!** If you find any issues, feel free to raise a pull request or an issue. 😊

This is my college final year project, and in the future, I plan to add multiple features to it.

Thanks,
Adnan Pathan