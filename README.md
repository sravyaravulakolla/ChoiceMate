# ChoiceMate

A smart shopping assistant that helps users find products based on their preferences using AI.

## Features

- User authentication (Email/Password and Google OAuth)
- AI-powered product recommendations
- Conversation-based preference collection
- Secure session management
- Email verification
- Password reset functionality

## Tech Stack

- Frontend: React.js
- Backend: Node.js, Express.js
- Database: MongoDB
- Authentication: JWT, Passport.js
- AI: Google Gemini API
- Email: Nodemailer

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Google Cloud Console account (for OAuth and Gemini API)
- Gmail account (for email verification)

## Environment Variables

Create `.env` files in both frontend and backend directories:

### Backend (.env)

```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
EMAIL_USER=your_gmail_address
EMAIL_PASSWORD=your_gmail_app_password
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)

```
REACT_APP_API_URL=http://localhost:5000
```

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/ChoiceMate.git
cd ChoiceMate
```

2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Install frontend dependencies:

```bash
cd ../frontend
npm install
```

## Running the Application

1. Start the backend server:

```bash
cd backend
npm start
```

2. Start the frontend development server:

```bash
cd frontend
npm start
```

The application will be available at:

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
