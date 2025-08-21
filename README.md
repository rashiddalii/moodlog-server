# Mental Health Journal - Backend Server

A Node.js + Express + MongoDB backend for the Mental Health Journal application.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the server directory with the following variables:
```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/moodlog

# JWT Secrets (generate secure random strings)
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# Server Configuration
PORT=5000

# Optional: Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
```

3. Start the development server:
```bash
npm run dev
```

## Environment Variables

### Required Variables:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `JWT_REFRESH_SECRET`: Secret key for refresh token signing

### Optional Variables:
- `PORT`: Server port (default: 5000)
- `FRONTEND_URL`: Frontend URL for CORS configuration

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/register-anonymous` - Register anonymous user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - User logout

### Journal Entries
- `POST /api/journal/entry` - Create/update journal entry
- `GET /api/journal/entry/:date` - Get entry for specific date
- `DELETE /api/journal/entry/:date` - Delete entry for specific date
- `GET /api/journal/entries` - Get entries for date range
- `GET /api/journal/mood-trends` - Get mood analytics
- `GET /api/journal/recent` - Get recent entries

### Anonymous Stories
- `POST /api/stories` - Create new story
- `GET /api/stories` - Get all published stories
- `GET /api/stories/:id` - Get specific story
- `PUT /api/stories/:id` - Update story
- `DELETE /api/stories/:id` - Delete story
- `POST /api/stories/:id/like` - Like/unlike story
- `GET /api/stories/user/my-stories` - Get user's stories
- `POST /api/stories/:id/flag` - Flag story
- `GET /api/stories/categories/list` - Get available categories

## Database Models

### User
- `username`: String (unique)
- `password`: String (hashed)
- `displayName`: String
- `createdAt`: Date
- `lastLogin`: Date
- `refreshTokens`: Array

### JournalEntry
- `user`: ObjectId (ref: User)
- `date`: Date
- `content`: String
- `mood`: Number (1-5)
- `moodEmoji`: String
- `tags`: Array
- `isEdited`: Boolean
- `editHistory`: Array

### AnonymousStory
- `authorId`: String
- `title`: String
- `content`: String
- `category`: String
- `tags`: Array
- `status`: String
- `likes`: Number
- `likedBy`: Array
- `commentsCount`: Number
- `isPublic`: Boolean
- `flags`: Array

## Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting on authentication endpoints
- Input validation and sanitization
- CORS configuration
- Helmet security headers
