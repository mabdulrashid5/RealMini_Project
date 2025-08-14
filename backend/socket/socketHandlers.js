const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Store connected users
const connectedUsers = new Map();

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return next(new Error('Authentication error: Invalid user'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

// Handle user connection
const handleConnection = (socket) => {
  console.log(`✅ User connected: ${socket.user.profile.name} (${socket.userId})`);
  
  // Store the connection
  connectedUsers.set(socket.userId, {
    socketId: socket.id,
    user: socket.user,
    connectedAt: new Date()
  });

  // Join user-specific room for personal notifications
  socket.join(`user_${socket.userId}`);

  // Join location-based rooms if user has location
  if (socket.user.location && socket.user.location.coordinates) {
    const [longitude, latitude] = socket.user.location.coordinates;
    
    // Create geohash-like room names for location-based grouping
    const locationRoom = `location_${Math.floor(latitude * 100)}_${Math.floor(longitude * 100)}`;
    socket.join(locationRoom);
    socket.locationRoom = locationRoom;
  }

  // Send connection confirmation
  socket.emit('connected', {
    message: 'Successfully connected to RoadAlert',
    userId: socket.userId,
    timestamp: new Date()
  });

  // Send any pending notifications
  sendPendingNotifications(socket);

  // Handle location updates
  socket.on('update_location', handleLocationUpdate);
  
  // Handle incident subscriptions
  socket.on('subscribe_to_area', handleAreaSubscription);
  socket.on('unsubscribe_from_area', handleAreaUnsubscription);
  
  // Handle real-time incident interactions
  socket.on('join_incident_room', handleJoinIncidentRoom);
  socket.on('leave_incident_room', handleLeaveIncidentRoom);
  
  // Handle typing indicators for incident comments
  socket.on('typing_comment', handleTypingComment);
  socket.on('stop_typing_comment', handleStopTypingComment);
  
  // Handle emergency alerts
  socket.on('emergency_alert', handleEmergencyAlert);
  
  // Handle ping/pong for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date() });
  });

  // Handle disconnection
  socket.on('disconnect', () => handleDisconnection(socket));
};

// Handle location updates
const handleLocationUpdate = function(data) {
  const socket = this;
  
  try {
    const { latitude, longitude, address } = data;
    
    if (!latitude || !longitude) {
      return socket.emit('error', { message: 'Invalid location data' });
    }

    // Leave old location room
    if (socket.locationRoom) {
      socket.leave(socket.locationRoom);
    }

    // Join new location room
    const locationRoom = `location_${Math.floor(latitude * 100)}_${Math.floor(longitude * 100)}`;
    socket.join(locationRoom);
    socket.locationRoom = locationRoom;

    // Update user location in database (async, don't wait)
    socket.user.updateLocation(longitude, latitude, address).catch(console.error);

    // Update in-memory user data
    socket.user.location = {
      type: 'Point',
      coordinates: [longitude, latitude],
      address: address || '',
      lastUpdated: new Date()
    };

    // Update connected users map
    const userConnection = connectedUsers.get(socket.userId);
    if (userConnection) {
      userConnection.user.location = socket.user.location;
    }

    socket.emit('location_updated', {
      message: 'Location updated successfully',
      location: socket.user.location
    });

    console.log(`📍 Location updated for user ${socket.userId}: ${latitude}, ${longitude}`);
  } catch (error) {
    console.error('Location update error:', error);
    socket.emit('error', { message: 'Failed to update location' });
  }
};

// Handle area subscription for incident alerts
const handleAreaSubscription = function(data) {
  const socket = this;
  
  try {
    const { latitude, longitude, radius = 5000 } = data;
    
    if (!latitude || !longitude) {
      return socket.emit('error', { message: 'Invalid area data' });
    }

    // Create area room name
    const areaRoom = `area_${Math.floor(latitude * 1000)}_${Math.floor(longitude * 1000)}_${radius}`;
    socket.join(areaRoom);

    // Store subscription
    if (!socket.areaSubscriptions) {
      socket.areaSubscriptions = new Set();
    }
    socket.areaSubscriptions.add(areaRoom);

    socket.emit('subscribed_to_area', {
      message: 'Subscribed to area alerts',
      area: { latitude, longitude, radius },
      room: areaRoom
    });

    console.log(`🔔 User ${socket.userId} subscribed to area: ${latitude}, ${longitude} (${radius}m)`);
  } catch (error) {
    console.error('Area subscription error:', error);
    socket.emit('error', { message: 'Failed to subscribe to area' });
  }
};

// Handle area unsubscription
const handleAreaUnsubscription = function(data) {
  const socket = this;
  
  try {
    const { latitude, longitude, radius = 5000 } = data;
    const areaRoom = `area_${Math.floor(latitude * 1000)}_${Math.floor(longitude * 1000)}_${radius}`;
    
    socket.leave(areaRoom);
    
    if (socket.areaSubscriptions) {
      socket.areaSubscriptions.delete(areaRoom);
    }

    socket.emit('unsubscribed_from_area', {
      message: 'Unsubscribed from area alerts',
      area: { latitude, longitude, radius }
    });

    console.log(`🔕 User ${socket.userId} unsubscribed from area: ${latitude}, ${longitude} (${radius}m)`);
  } catch (error) {
    console.error('Area unsubscription error:', error);
    socket.emit('error', { message: 'Failed to unsubscribe from area' });
  }
};

// Handle joining incident-specific rooms for real-time updates
const handleJoinIncidentRoom = function(data) {
  const socket = this;
  
  try {
    const { incidentId } = data;
    
    if (!incidentId) {
      return socket.emit('error', { message: 'Incident ID is required' });
    }

    const incidentRoom = `incident_${incidentId}`;
    socket.join(incidentRoom);

    // Store joined incidents
    if (!socket.joinedIncidents) {
      socket.joinedIncidents = new Set();
    }
    socket.joinedIncidents.add(incidentId);

    socket.emit('joined_incident_room', {
      message: 'Joined incident room',
      incidentId,
      room: incidentRoom
    });

    // Notify others in the room about new viewer
    socket.to(incidentRoom).emit('user_viewing_incident', {
      userId: socket.userId,
      userName: socket.user.profile.name,
      incidentId
    });

    console.log(`👀 User ${socket.userId} joined incident room: ${incidentId}`);
  } catch (error) {
    console.error('Join incident room error:', error);
    socket.emit('error', { message: 'Failed to join incident room' });
  }
};

// Handle leaving incident rooms
const handleLeaveIncidentRoom = function(data) {
  const socket = this;
  
  try {
    const { incidentId } = data;
    const incidentRoom = `incident_${incidentId}`;
    
    socket.leave(incidentRoom);
    
    if (socket.joinedIncidents) {
      socket.joinedIncidents.delete(incidentId);
    }

    // Notify others in the room about user leaving
    socket.to(incidentRoom).emit('user_left_incident', {
      userId: socket.userId,
      userName: socket.user.profile.name,
      incidentId
    });

    socket.emit('left_incident_room', {
      message: 'Left incident room',
      incidentId
    });

    console.log(`👋 User ${socket.userId} left incident room: ${incidentId}`);
  } catch (error) {
    console.error('Leave incident room error:', error);
    socket.emit('error', { message: 'Failed to leave incident room' });
  }
};

// Handle typing indicators for comments
const handleTypingComment = function(data) {
  const socket = this;
  
  try {
    const { incidentId } = data;
    const incidentRoom = `incident_${incidentId}`;

    socket.to(incidentRoom).emit('user_typing_comment', {
      userId: socket.userId,
      userName: socket.user.profile.name,
      incidentId
    });
  } catch (error) {
    console.error('Typing comment error:', error);
  }
};

// Handle stop typing indicators
const handleStopTypingComment = function(data) {
  const socket = this;
  
  try {
    const { incidentId } = data;
    const incidentRoom = `incident_${incidentId}`;

    socket.to(incidentRoom).emit('user_stopped_typing_comment', {
      userId: socket.userId,
      userName: socket.user.profile.name,
      incidentId
    });
  } catch (error) {
    console.error('Stop typing comment error:', error);
  }
};

// Handle emergency alerts
const handleEmergencyAlert = function(data) {
  const socket = this;
  
  try {
    const { type, message, location } = data;
    
    if (!type || !message) {
      return socket.emit('error', { message: 'Emergency type and message are required' });
    }

    // Broadcast emergency alert to nearby users
    if (location && location.latitude && location.longitude) {
      const locationRoom = `location_${Math.floor(location.latitude * 100)}_${Math.floor(location.longitude * 100)}`;
      
      socket.to(locationRoom).emit('emergency_alert_received', {
        type,
        message,
        location,
        reportedBy: {
          id: socket.userId,
          name: socket.user.profile.name
        },
        timestamp: new Date()
      });

      console.log(`🚨 Emergency alert from user ${socket.userId}: ${type} - ${message}`);
    }

    socket.emit('emergency_alert_sent', {
      message: 'Emergency alert sent successfully',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Emergency alert error:', error);
    socket.emit('error', { message: 'Failed to send emergency alert' });
  }
};

// Send pending notifications to newly connected user
const sendPendingNotifications = async (socket) => {
  try {
    // This could query the database for pending notifications
    // For now, just send a welcome message
    socket.emit('notification', {
      type: 'welcome',
      title: 'Welcome to RoadAlert',
      message: 'You are now connected and will receive real-time incident alerts.',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Send pending notifications error:', error);
  }
};

// Handle user disconnection
const handleDisconnection = (socket) => {
  console.log(`❌ User disconnected: ${socket.userId}`);
  
  // Remove from connected users
  connectedUsers.delete(socket.userId);
  
  // Notify incident rooms about user leaving
  if (socket.joinedIncidents) {
    socket.joinedIncidents.forEach(incidentId => {
      const incidentRoom = `incident_${incidentId}`;
      socket.to(incidentRoom).emit('user_left_incident', {
        userId: socket.userId,
        userName: socket.user?.profile?.name,
        incidentId
      });
    });
  }
};

// Utility functions for external use
const getConnectedUsers = () => {
  return Array.from(connectedUsers.values()).map(conn => ({
    userId: conn.user._id,
    name: conn.user.profile.name,
    location: conn.user.location,
    connectedAt: conn.connectedAt
  }));
};

const isUserConnected = (userId) => {
  return connectedUsers.has(userId.toString());
};

const sendToUser = (io, userId, event, data) => {
  io.to(`user_${userId}`).emit(event, data);
};

const sendToLocation = (io, latitude, longitude, event, data) => {
  const locationRoom = `location_${Math.floor(latitude * 100)}_${Math.floor(longitude * 100)}`;
  io.to(locationRoom).emit(event, data);
};

const sendToIncident = (io, incidentId, event, data) => {
  io.to(`incident_${incidentId}`).emit(event, data);
};

// Initialize Socket.IO with authentication and handlers
const initializeSocket = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);
  
  // Handle connections
  io.on('connection', handleConnection);
  
  // Handle server-side events
  io.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });

  console.log('🔌 Socket.IO initialized with authentication');
  
  return io;
};

module.exports = {
  initializeSocket,
  getConnectedUsers,
  isUserConnected,
  sendToUser,
  sendToLocation,
  sendToIncident
};
