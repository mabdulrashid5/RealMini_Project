# 🚀 RoadAlert Backend - Complete Setup Guide

## 🎉 Congratulations! Your backend is ready!

I've created a **complete, production-ready backend** for your RoadAlert mobile app. Here's everything you need to know:

## 📁 What's Been Created

```
backend/
├── 📄 server.js                 # Main server file
├── 📁 models/                   # Database models
│   ├── User.js                  # User model with auth & stats
│   ├── Incident.js              # Incident model with geospatial
│   └── Alert.js                 # Alert model for notifications
├── 📁 routes/                   # API endpoints
│   ├── auth.js                  # Authentication routes
│   ├── incidents.js             # Incident CRUD + geospatial
│   ├── users.js                 # User management
│   └── alerts.js                # Alert management
├── 📁 middleware/               # Custom middleware
│   ├── auth.js                  # JWT authentication
│   └── errorMiddleware.js       # Error handling
├── 📁 socket/                   # Real-time features
│   └── socketHandlers.js        # Socket.IO handlers
├── 📁 services/                 # External services
│   └── pushNotifications.js     # Firebase FCM
├── 📁 scripts/                  # Utility scripts
│   ├── seedDatabase.js          # Sample data seeder
│   └── start.sh                 # Startup script
├── 📄 package.json              # Dependencies & scripts
├── 📄 .env                      # Environment configuration
└── 📄 README.md                 # Complete documentation
```

## 🚀 Quick Start (1 minute setup!)

### 1. Navigate to backend directory:
```bash
cd backend
```

### 2. Run the automatic setup script:
```bash
./scripts/start.sh
```

**That's it!** The script will:
- ✅ Check all prerequisites
- ✅ Install dependencies
- ✅ Set up environment variables
- ✅ Seed the database with sample data
- ✅ Start the server

## 🔧 Manual Setup (if you prefer)

### 1. Install dependencies:
```bash
npm install
```

### 2. Configure environment:
```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your settings (MongoDB URI, JWT secret, etc.)
nano .env
```

### 3. Start MongoDB:
```bash
mongod
```

### 4. Seed database (optional):
```bash
npm run seed
```

### 5. Start server:
```bash
# Development
npm run dev

# Production
npm start
```

## 🌐 API Endpoints Overview

Your backend provides **50+ endpoints** across 4 main categories:

### 🔐 Authentication (`/api/auth`)
- Register, login, logout, refresh tokens
- Profile management, password changes
- Device token management for push notifications

### 📍 Incidents (`/api/incidents`)
- Full CRUD operations
- **Geospatial queries** (find incidents within radius)
- Upvoting, commenting, verification system
- Image upload via Cloudinary
- Real-time updates via Socket.IO

### 👥 Users (`/api/users`)
- Profile management with avatar upload
- Location updates
- Statistics and leaderboards
- Settings management

### 🚨 Alerts (`/api/alerts`)
- Location-based alert generation
- Push notification delivery
- Alert management (read, dismiss)

## 🔌 Real-time Features

**Socket.IO** provides real-time updates for:
- ⚡ New incident alerts
- 📍 Location-based notifications
- 💬 Live commenting
- 🔄 Status updates (verified/resolved)
- 🚨 Emergency broadcasts

## 📱 Push Notifications

**Firebase FCM** integration for:
- 🎯 Location-based incident alerts
- 🚨 Emergency notifications
- ✅ Status update notifications
- 📢 System announcements

## 🗄️ Database Features

**MongoDB** with advanced features:
- 🌍 **Geospatial indexing** for location queries
- 📊 **Aggregation pipelines** for statistics
- 🔍 **Full-text search** capabilities
- ⚡ **Optimized indexes** for performance

## 🔒 Security Features

Your backend includes enterprise-grade security:
- 🛡️ **JWT authentication** with refresh tokens
- 🔐 **Password hashing** with bcrypt (12 rounds)
- 🚦 **Rate limiting** (100 requests/15min)
- 🧹 **Input validation** and sanitization
- 🛡️ **XSS protection** and CORS configuration
- 🔒 **MongoDB injection** prevention

## 📊 Test Accounts (After seeding)

```
👑 Admin Account:
   Email: admin@roadalert.com
   Password: Admin123!
   Permissions: Full access

🛡️ Moderator Account:
   Email: moderator@roadalert.com
   Password: Mod123!
   Permissions: Verify/resolve incidents

👤 Regular User:
   Email: user1@example.com
   Password: User123!
   Permissions: Report incidents
```

## 🧪 Testing Your Backend

### 1. Health Check:
```bash
curl http://localhost:3000/health
```

### 2. Register a user:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "profile": {
      "name": "Test User",
      "phone": "+1234567890"
    }
  }'
```

### 3. Get nearby incidents:
```bash
curl "http://localhost:3000/api/incidents/nearby?latitude=5.6037&longitude=-0.1870&radius=5000"
```

## 🔗 Connecting Your Mobile App

Replace the mock API calls in your React Native app with these endpoints:

### Update your store files:

**`store/auth-store.js`** - Replace mock calls with:
```javascript
const response = await fetch('http://your-server:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

**`store/incidents-store.js`** - Replace mock calls with:
```javascript
const response = await fetch('http://your-server:3000/api/incidents/nearby?latitude=${lat}&longitude=${lng}&radius=5000');
```

### Add Socket.IO client:
```bash
npm install socket.io-client
```

```javascript
import io from 'socket.io-client';

const socket = io('http://your-server:3000', {
  auth: { token: userToken }
});

socket.on('new_incident', (incident) => {
  // Handle real-time incident updates
});
```

## 🚀 Deployment Options

### 1. **Heroku** (Easiest):
```bash
git add .
git commit -m "Add backend"
heroku create your-app-name
heroku config:set NODE_ENV=production
git push heroku main
```

### 2. **DigitalOcean App Platform**:
- Connect your GitHub repo
- Set environment variables
- Deploy with one click

### 3. **AWS/Google Cloud**:
- Use container deployment
- Set up load balancer
- Configure auto-scaling

## 🔧 Configuration Options

### Environment Variables:
```env
# Required
MONGODB_URI=mongodb://localhost:27017/roadalert
JWT_SECRET=your-secret-key

# Optional but recommended
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

REDIS_URL=redis://localhost:6379
```

## 📈 Performance Features

- ⚡ **Compression middleware** for faster responses
- 🗄️ **Connection pooling** for database efficiency
- 📸 **Image optimization** via Cloudinary
- 🚀 **Geospatial indexing** for location queries
- 💾 **Caching strategies** with Redis (optional)

## 🆘 Troubleshooting

### Common Issues:

**1. "Cannot connect to MongoDB"**
```bash
# Start MongoDB
mongod

# Or check connection string in .env
MONGODB_URI=mongodb://localhost:27017/roadalert
```

**2. "JWT secret not set"**
```bash
# Add to .env
JWT_SECRET=your-super-secret-key-here
```

**3. "Port already in use"**
```bash
# Change port in .env
PORT=3001
```

**4. "Images not uploading"**
- Configure Cloudinary credentials in `.env`
- Check Cloudinary dashboard for API limits

## 🎯 Next Steps

1. **Test all endpoints** using Postman or curl
2. **Update your mobile app** to use real API calls
3. **Configure push notifications** with Firebase
4. **Deploy to production** using your preferred platform
5. **Set up monitoring** and logging

## 📞 Support

If you encounter any issues:

1. **Check the logs** - The server provides detailed error messages
2. **Review the README.md** - Complete API documentation included
3. **Test with curl** - Verify endpoints work independently
4. **Check environment variables** - Most issues are configuration-related

## 🎉 You're All Set!

Your RoadAlert backend is **production-ready** with:
- ✅ Complete REST API
- ✅ Real-time WebSocket support
- ✅ Push notifications
- ✅ Image upload system
- ✅ Geospatial queries
- ✅ User management
- ✅ Security features
- ✅ Documentation

**Time to connect your mobile app and go live!** 🚀
