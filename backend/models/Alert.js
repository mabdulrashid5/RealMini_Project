const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: [true, 'Associated incident is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  type: {
    type: String,
    enum: {
      values: ['incident', 'emergency', 'update', 'reminder', 'system'],
      message: '{VALUE} is not a valid alert type'
    },
    required: [true, 'Alert type is required']
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: '{VALUE} is not a valid priority level'
    },
    default: 'medium'
  },
  title: {
    type: String,
    required: [true, 'Alert title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Alert message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    },
    address: String,
    radius: {
      type: Number,
      default: 5000, // meters
      min: 100,
      max: 50000
    }
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'read', 'dismissed', 'expired'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },
  deliveryStatus: {
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      error: String
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      error: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      error: String
    }
  },
  readAt: {
    type: Date,
    default: null
  },
  dismissedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  },
  actions: [{
    type: {
      type: String,
      enum: ['navigate', 'call', 'share', 'report', 'dismiss'],
      required: true
    },
    label: {
      type: String,
      required: true
    },
    data: mongoose.Schema.Types.Mixed // Flexible data for action
  }],
  metadata: {
    distance: Number, // Distance from user when alert was created
    estimatedImpact: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    alternativeRoutes: Boolean,
    trafficDelay: Number // in minutes
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
alertSchema.index({ user: 1, createdAt: -1 });
alertSchema.index({ incident: 1 });
alertSchema.index({ status: 1 });
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
alertSchema.index({ location: '2dsphere' });
alertSchema.index({ type: 1, priority: 1 });

// Virtual for time since created
alertSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
});

// Pre-save middleware to set expiration based on priority
alertSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    const expirationHours = {
      low: 72,     // 3 days
      medium: 24,  // 1 day
      high: 12,    // 12 hours
      critical: 6  // 6 hours
    };
    
    const hours = expirationHours[this.priority] || 24;
    this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }
  next();
});

// Method to mark as read
alertSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Method to dismiss alert
alertSchema.methods.dismiss = function() {
  this.status = 'dismissed';
  this.dismissedAt = new Date();
  return this.save();
};

// Method to update delivery status
alertSchema.methods.updateDeliveryStatus = function(channel, status, error = null) {
  if (!this.deliveryStatus[channel]) return;
  
  const now = new Date();
  
  if (status === 'sent') {
    this.deliveryStatus[channel].sent = true;
    this.deliveryStatus[channel].sentAt = now;
  } else if (status === 'delivered') {
    this.deliveryStatus[channel].delivered = true;
    this.deliveryStatus[channel].deliveredAt = now;
  } else if (status === 'error') {
    this.deliveryStatus[channel].error = error;
  }
  
  return this.save();
};

// Static method to create location-based alert
alertSchema.statics.createLocationAlert = function(incidentData, userLocation, alertRadius = 5000) {
  const alertData = {
    incident: incidentData._id,
    type: 'incident',
    priority: incidentData.severity,
    title: `${incidentData.type.charAt(0).toUpperCase() + incidentData.type.slice(1)} Nearby`,
    message: `${incidentData.title} reported ${this.calculateDistance(
      userLocation.coordinates[0],
      userLocation.coordinates[1],
      incidentData.location.coordinates[0],
      incidentData.location.coordinates[1]
    )}m away`,
    location: {
      type: 'Point',
      coordinates: incidentData.location.coordinates,
      address: incidentData.location.address,
      radius: alertRadius
    },
    actions: [
      {
        type: 'navigate',
        label: 'Navigate',
        data: {
          destination: incidentData.location.coordinates,
          address: incidentData.location.address
        }
      },
      {
        type: 'dismiss',
        label: 'Dismiss',
        data: {}
      }
    ],
    metadata: {
      distance: this.calculateDistance(
        userLocation.coordinates[0],
        userLocation.coordinates[1],
        incidentData.location.coordinates[0],
        incidentData.location.coordinates[1]
      ),
      estimatedImpact: incidentData.severity === 'critical' ? 'high' : 
                      incidentData.severity === 'high' ? 'medium' : 'low'
    }
  };
  
  return alertData;
};

// Static method to calculate distance between two points
alertSchema.statics.calculateDistance = function(lon1, lat1, lon2, lat2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return Math.round(R * c);
};

// Static method to find alerts for user in area
alertSchema.statics.findForUserInArea = function(userId, longitude, latitude, radius = 10000) {
  return this.find({
    user: userId,
    status: { $in: ['active', 'read'] },
    isActive: true,
    expiresAt: { $gt: new Date() },
    $or: [
      {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: radius
          }
        }
      },
      {
        type: 'system' // System alerts are always relevant
      }
    ]
  })
  .populate('incident', 'title type status location')
  .sort({ priority: -1, createdAt: -1 });
};

module.exports = mongoose.model('Alert', alertSchema);
