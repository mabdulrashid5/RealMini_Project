const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const incidentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Incident type is required'],
    enum: {
      values: ['accident', 'hazard', 'violation', 'emergency', 'construction', 'weather'],
      message: '{VALUE} is not a valid incident type'
    }
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Coordinates are required'],
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates format'
      }
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      maxlength: [200, 'Address cannot exceed 200 characters']
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reporter is required']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'verified', 'resolved', 'rejected', 'duplicate'],
      message: '{VALUE} is not a valid status'
    },
    default: 'pending'
  },
  severity: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: '{VALUE} is not a valid severity level'
    },
    default: 'medium'
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  upvotes: {
    type: Number,
    default: 0,
    min: 0
  },
  upvotedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    maxlength: [200, 'Rejection reason cannot exceed 200 characters']
  },
  comments: [commentSchema],
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  metadata: {
    weather: {
      condition: String,
      temperature: Number,
      visibility: Number
    },
    traffic: {
      congestionLevel: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      estimatedDelay: Number // in minutes
    },
    emergency: {
      servicesNotified: {
        type: Boolean,
        default: false
      },
      serviceTypes: [{
        type: String,
        enum: ['police', 'ambulance', 'fire', 'tow']
      }],
      estimatedResponse: Number // in minutes
    }
  },
  viewCount: {
    type: Number,
    default: 0
  },
  reportCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create geospatial index for location-based queries
incidentSchema.index({ location: '2dsphere' });

// Compound indexes for better query performance
incidentSchema.index({ status: 1, type: 1 });
incidentSchema.index({ reportedBy: 1, createdAt: -1 });
incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
incidentSchema.index({ upvotes: -1 });
incidentSchema.index({ severity: 1, priority: -1 });

// Virtual for time since reported
incidentSchema.virtual('timeAgo').get(function() {
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

// Virtual for distance (will be populated by aggregation queries)
incidentSchema.virtual('distance');

// Pre-save middleware to calculate priority based on severity and type
incidentSchema.pre('save', function(next) {
  if (this.isModified('severity') || this.isModified('type')) {
    const severityScores = { low: 1, medium: 3, high: 6, critical: 10 };
    const typeScores = { 
      violation: 1, 
      hazard: 3, 
      accident: 6, 
      construction: 2,
      weather: 4,
      emergency: 10 
    };
    
    this.priority = Math.min(10, 
      (severityScores[this.severity] || 3) + 
      (typeScores[this.type] || 3)
    );
  }
  next();
});

// Method to add upvote
incidentSchema.methods.addUpvote = function(userId) {
  if (!this.upvotedBy.includes(userId)) {
    this.upvotedBy.push(userId);
    this.upvotes += 1;
    return this.save();
  }
  throw new Error('User has already upvoted this incident');
};

// Method to remove upvote
incidentSchema.methods.removeUpvote = function(userId) {
  const index = this.upvotedBy.indexOf(userId);
  if (index > -1) {
    this.upvotedBy.splice(index, 1);
    this.upvotes = Math.max(0, this.upvotes - 1);
    return this.save();
  }
  throw new Error('User has not upvoted this incident');
};

// Method to add comment
incidentSchema.methods.addComment = function(userId, text) {
  this.comments.push({
    user: userId,
    text,
    createdAt: new Date()
  });
  return this.save();
};

// Method to verify incident
incidentSchema.methods.verify = function(userId) {
  this.status = 'verified';
  this.verifiedBy = userId;
  this.verifiedAt = new Date();
  return this.save();
};

// Method to resolve incident
incidentSchema.methods.resolve = function(userId) {
  this.status = 'resolved';
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  return this.save();
};

// Method to reject incident
incidentSchema.methods.reject = function(userId, reason) {
  this.status = 'rejected';
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Method to increment view count
incidentSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save({ validateBeforeSave: false });
};

// Static method to find nearby incidents
incidentSchema.statics.findNearby = function(longitude, latitude, maxDistance = 5000, filters = {}) {
  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true,
    ...filters
  };
  
  return this.find(query)
    .populate('reportedBy', 'profile.name profile.avatar stats.reputation')
    .populate('verifiedBy', 'profile.name')
    .populate('resolvedBy', 'profile.name')
    .sort({ priority: -1, createdAt: -1 });
};

// Static method to get trending incidents
incidentSchema.statics.findTrending = function(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    createdAt: { $gte: since },
    isActive: true,
    status: { $in: ['pending', 'verified'] }
  })
  .sort({ upvotes: -1, viewCount: -1, createdAt: -1 })
  .limit(20)
  .populate('reportedBy', 'profile.name profile.avatar stats.reputation');
};

module.exports = mongoose.model('Incident', incidentSchema);
