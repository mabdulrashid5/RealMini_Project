const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  profile: {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    phone: {
      type: String,
      match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
    },
    avatar: {
      type: String,
      default: null
    },
    dateOfBirth: {
      type: Date
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    address: {
      type: String,
      default: ''
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  permissions: {
    type: [String],
    enum: ['report', 'verify', 'resolve', 'moderate', 'admin'],
    default: ['report']
  },
  stats: {
    reportsSubmitted: {
      type: Number,
      default: 0
    },
    reportsVerified: {
      type: Number,
      default: 0
    },
    reportsResolved: {
      type: Number,
      default: 0
    },
    upvotesReceived: {
      type: Number,
      default: 0
    },
    reputation: {
      type: Number,
      default: 0
    }
  },
  settings: {
    notifications: {
      push: {
        type: Boolean,
        default: true
      },
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    privacy: {
      shareLocation: {
        type: Boolean,
        default: true
      },
      showProfile: {
        type: Boolean,
        default: true
      }
    },
    alerts: {
      radius: {
        type: Number,
        default: 5000, // 5km in meters
        min: 1000,
        max: 50000
      },
      types: {
        type: [String],
        enum: ['accident', 'hazard', 'violation', 'emergency'],
        default: ['accident', 'hazard', 'violation', 'emergency']
      }
    }
  },
  deviceTokens: [{
    token: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLoginAt: Date,
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create geospatial index for location-based queries
userSchema.index({ location: '2dsphere' });

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'permissions': 1 });

// Virtual for user's age
userSchema.virtual('age').get(function() {
  if (!this.profile.dateOfBirth) return null;
  return Math.floor((Date.now() - this.profile.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update lastActiveAt on save
userSchema.pre('save', function(next) {
  if (this.isModified() && !this.isModified('lastActiveAt')) {
    this.lastActiveAt = new Date();
  }
  next();
});

// Method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      permissions: this.permissions
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE
    }
  );
};

// Method to generate refresh token
userSchema.methods.getRefreshToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE
    }
  );
};

// Method to update user location
userSchema.methods.updateLocation = function(longitude, latitude, address) {
  this.location.coordinates = [longitude, latitude];
  this.location.address = address || '';
  this.location.lastUpdated = new Date();
  return this.save();
};

// Method to add device token
userSchema.methods.addDeviceToken = function(token, platform) {
  // Remove existing token if it exists
  this.deviceTokens = this.deviceTokens.filter(dt => dt.token !== token);
  
  // Add new token
  this.deviceTokens.push({
    token,
    platform,
    addedAt: new Date()
  });
  
  // Keep only the last 5 tokens per user
  if (this.deviceTokens.length > 5) {
    this.deviceTokens = this.deviceTokens.slice(-5);
  }
  
  return this.save();
};

// Method to increment stats
userSchema.methods.incrementStat = function(statName, amount = 1) {
  if (this.stats.hasOwnProperty(statName)) {
    this.stats[statName] += amount;
    this.calculateReputation();
    return this.save();
  }
  throw new Error(`Invalid stat name: ${statName}`);
};

// Method to calculate reputation score
userSchema.methods.calculateReputation = function() {
  const {
    reportsSubmitted,
    reportsVerified,
    reportsResolved,
    upvotesReceived
  } = this.stats;
  
  // Simple reputation algorithm
  this.stats.reputation = Math.max(0, 
    (reportsSubmitted * 1) +
    (reportsVerified * 5) +
    (reportsResolved * 10) +
    (upvotesReceived * 2)
  );
};

module.exports = mongoose.model('User', userSchema);
