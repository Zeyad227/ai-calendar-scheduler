# 🤖 AI-Powered Calendar Scheduler

A full-stack web application that enables users to schedule meetings and events through natural language processing, integrated with Google Calendar.

## ✨ Features

- 🗣️ **Natural Language Processing** - Schedule events using conversational language
- 📅 **Google Calendar Integration** - Seamless two-way sync with Google Calendar
- 🔐 **JWT Authentication** - Secure user authentication and authorization
- 🎨 **Modern UI** - Responsive design with Tailwind CSS
- 🤖 **AI-Powered** - Uses Groq AI for intelligent event extraction
- 💾 **MongoDB Database** - Reliable data storage and management

## 🛠️ Tech Stack

**Frontend:**
- React.js with TypeScript
- Tailwind CSS
- React Router DOM
- Axios

**Backend:**
- Node.js with Express.js
- MongoDB with Mongoose ODM
- Groq AI API
- Google Calendar API
- JWT Authentication
- bcryptjs for password hashing

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Groq API key
- Google Calendar API credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-calendar-scheduler.git
   cd ai-calendar-scheduler
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Environment Variables**
   
   Create `backend/.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   GROQ_API_KEY=your_groq_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
   FRONTEND_URL=http://localhost:3000
   ```

5. **Start the Application**
   ```bash
   # Start backend (in backend directory)
   npm run dev
   
   # Start frontend (in frontend directory, new terminal)
   npm start
   ```

## 📱 Usage

1. **Register/Login** - Create an account or sign in
2. **Connect Google Calendar** - Link your Google account for calendar sync
3. **Chat to Schedule** - Use natural language like:
   - "Schedule a meeting with John tomorrow at 2 PM"
   - "Book a 30-minute call with the team next Friday"
   - "Set up a weekly standup every Monday at 9 AM"
4. **Manage Events** - View, edit, and delete your scheduled events

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/google` - Google OAuth URL

### Chat Scheduling
- `POST /api/chat/schedule` - Process natural language scheduling
- `POST /api/chat/confirm` - Confirm and create event
- `GET /api/chat/history` - Get chat history

### Events
- `GET /api/events` - Get user events
- `POST /api/events` - Create event manually
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/sync` - Sync with Google Calendar

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Groq](https://groq.com/) for AI processing
- [Google Calendar API](https://developers.google.com/calendar) for calendar integration
- [MongoDB](https://mongodb.com/) for database services