# RoadAlert Backend API

A comprehensive Node.js backend for the RoadAlert mobile application, providing real-time incident reporting, geospatial queries, user authentication, and push notifications.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based permissions
- **Incident Management**: CRUD operations with geospatial queries for nearby incidents
- **Real-time Updates**: Socket.IO for live incident alerts and notifications
- **Image Upload**: Cloudinary integration for incident photos
- **Push Notifications**: Firebase FCM for mobile notifications
- **Geospatial Queries**: MongoDB geospatial indexing for location-based features
- **User Management**: Profile management, statistics, and leaderboards
- **Alert System**: Location-based alert generation and management

## 📋 Prerequisites

- Node.js (v18.0.0 or higher)
- MongoDB (v5.0 or higher)
- Redis (optional, for caching)
- Cloudinary account (for image uploads)
- Firebase project (for push notifications)

## 🛠 Installation

1. **Clone and navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment setup:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables in `.env`:**
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/roadalert

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d
   JWT_REFRESH_EXPIRE=30d

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your-cloudinary-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret

   # Firebase Configuration (for push notifications)
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_CLIENT_EMAIL=your-firebase-client-email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

5. **Start MongoDB:**
   ```bash
   mongod
   ```

6. **Seed the database (optional):**
   ```bash
   npm run seed
   ```

7. **Start the server:**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register       - Register new user
POST   /api/auth/login          - User login
POST   /api/auth/refresh        - Refresh JWT token
POST   /api/auth/logout         - User logout
GET    /api/auth/me             - Get current user
PUT    /api/auth/profile        - Update user profile
PUT    /api/auth/password       - Change password
POST   /api/auth/forgot-password - Request password reset
POST   /api/auth/device-token   - Add device token for push notifications
```

### Incidents
```
GET    /api/incidents           - Get all incidents (with filtering)
GET    /api/incidents/nearby    - Get nearby incidents
GET    /api/incidents/trending  - Get trending incidents
GET    /api/incidents/:id       - Get single incident
POST   /api/incidents           - Create new incident
PUT    /api/incidents/:id       - Update incident
DELETE /api/incidents/:id       - Delete incident
POST   /api/incidents/:id/upvote - Upvote incident
DELETE /api/incidents/:id/upvote - Remove upvote
POST   /api/incidents/:id/verify - Verify incident (moderator)
POST   /api/incidents/:id/resolve - Resolve incident (admin)
POST   /api/incidents/:id/comments - Add comment
```

### Users
```
GET    /api/users/profile       - Get user profile with stats
PUT    /api/users/location      - Update user location
POST   /api/users/avatar        - Upload user avatar
GET    /api/users/incidents     - Get user's incidents
GET    /api/users/leaderboard   - Get user leaderboard
GET    /api/users/:id           - Get public user profile
PUT    /api/users/settings      - Update user settings
PUT    /api/users/deactivate    - Deactivate account
GET    /api/users/admin/stats   - Get user statistics (admin only)
```

### Alerts
```
GET    /api/alerts              - Get user's alerts
GET    /api/alerts/:id          - Get single alert
PUT    /api/alerts/:id/read     - Mark alert as read
PUT    /api/alerts/:id/dismiss  - Dismiss alert
PUT    /api/alerts/bulk/read    - Mark multiple alerts as read
GET    /api/alerts/stats        - Get alert statistics
DELETE /api/alerts/cleanup      - Cleanup old alerts
```

### Health Check
```
GET    /health                  - Server health check
```

## 🔌 WebSocket Events

### Client to Server
```javascript
// Authentication
socket.emit('authenticate', { token: 'jwt_token' });

// Location updates
socket.emit('update_location', { latitude, longitude, address });

// Area subscriptions
socket.emit('subscribe_to_area', { latitude, longitude, radius });
socket.emit('unsubscribe_from_area', { latitude, longitude, radius });

// Incident rooms
socket.emit('join_incident_room', { incidentId });
socket.emit('leave_incident_room', { incidentId });

// Typing indicators
socket.emit('typing_comment', { incidentId });
socket.emit('stop_typing_comment', { incidentId });

// Emergency alerts
socket.emit('emergency_alert', { type, message, location });

// Health check
socket.emit('ping');
```

### Server to Client
```javascript
// Connection events
socket.on('connected', (data) => {});
socket.on('error', (error) => {});

// Incident events
socket.on('new_incident', (incident) => {});
socket.on('incident_updated', (update) => {});
socket.on('incident_verified', (data) => {});
socket.on('incident_resolved', (data) => {});
socket.on('incident_upvoted', (data) => {});

// Alert events
socket.on('new_alert', (alert) => {});
socket.on('alert_read', (data) => {});
socket.on('alert_dismissed', (data) => {});

// Emergency events
socket.on('emergency_alert_received', (alert) => {});

// User events
socket.on('user_viewing_incident', (data) => {});
socket.on('user_typing_comment', (data) => {});

// Health check
socket.on('pong', (data) => {});
```

## 📱 Push Notifications

The backend supports Firebase Cloud Messaging (FCM) for push notifications:

### Notification Types
- **Incident Alerts**: Nearby incident notifications
- **Emergency Alerts**: Critical emergency broadcasts
- **Status Updates**: Incident verification/resolution updates
- **System Notifications**: App updates and announcements

### Setup
1. Create a Firebase project
2. Generate a service account key
3. Configure environment variables
4. Users automatically receive notifications based on their location and preferences

## 🗄 Database Schema

### Users
```javascript
{
  email: String,
  password: String (hashed),
  profile: {
    name: String,
    phone: String,
    avatar: String,
    emergencyContact: Object
  },
  location: {
    type: "Point",
    coordinates: [longitude, latitude],
    address: String
  },
  permissions: [String],
  stats: {
    reportsSubmitted: Number,
    reportsVerified: Number,
    reportsResolved: Number,
    upvotesReceived: Number,
    reputation: Number
  },
  settings: {
    notifications: Object,
    privacy: Object,
    alerts: Object
  },
  deviceTokens: [Object]
}
```

### Incidents
```javascript
{
  type: String, // accident, hazard, violation, emergency, construction, weather
  title: String,
  description: String,
  location: {
    type: "Point",
    coordinates: [longitude, latitude],
    address: String
  },
  images: [Object],
  reportedBy: ObjectId,
  status: String, // pending, verified, resolved, rejected
  severity: String, // low, medium, high, critical
  upvotes: Number,
  upvotedBy: [ObjectId],
  comments: [Object],
  tags: [String]
}
```

### Alerts
```javascript
{
  incident: ObjectId,
  user: ObjectId,
  type: String, // incident, emergency, update, reminder, system
  priority: String, // low, medium, high, critical
  title: String,
  message: String,
  location: Object,
  status: String, // active, read, dismissed, expired
  actions: [Object],
  deliveryStatus: Object
}
```

## 🔧 Configuration

### Security Features
- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting
- Input validation and sanitization
- XSS protection
- MongoDB injection prevention
- CORS configuration

### Performance Features
- MongoDB indexing for geospatial queries
- Compression middleware
- Image optimization via Cloudinary
- Connection pooling
- Caching strategies

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📊 Monitoring

### Health Checks
- `GET /health` - Server status and uptime
- Database connection status
- External service connectivity

### Logging
- Request/response logging with Morgan
- Error logging with stack traces
- Performance monitoring

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database URI
3. Set up SSL certificates
4. Configure reverse proxy (Nginx)
5. Set up process manager (PM2)

### Docker Deployment
```bash
# Build image
docker build -t roadalert-backend .

# Run container
docker run -d -p 3000:3000 --env-file .env roadalert-backend
```

### Production Considerations
- Use MongoDB Atlas or managed database
- Set up Redis for session storage
- Configure CDN for image delivery
- Implement backup strategies
- Set up monitoring and alerting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the error logs

## 🔄 Changelog

### v1.0.0
- Initial release
- Complete authentication system
- Incident management with geospatial queries
- Real-time updates with Socket.IO
- Push notification system
- Image upload capabilities
- User management and statistics
- Alert system
