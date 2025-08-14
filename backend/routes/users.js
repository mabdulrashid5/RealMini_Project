const express = require('express');
const { query, body, validationResult } = require('express-validator');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');
const Incident = require('../models/Incident');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Helper function to upload image to Cloudinary
const uploadAvatar = async (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'roadalert/avatars',
        resource_type: 'image',
        transformation: [
          { width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(file.buffer);
  });
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -deviceTokens')
      .lean();

    // Get user's incident statistics
    const incidentStats = await Incident.aggregate([
      {
        $match: { reportedBy: req.user._id }
      },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          pendingReports: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          verifiedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] }
          },
          resolvedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          totalUpvotes: { $sum: '$upvotes' },
          byType: {
            $push: '$type'
          }
        }
      }
    ]);

    const stats = incidentStats[0] || {
      totalReports: 0,
      pendingReports: 0,
      verifiedReports: 0,
      resolvedReports: 0,
      totalUpvotes: 0,
      byType: []
    };

    // Count incidents by type
    const typeStats = stats.byType.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          incidentStats: {
            ...stats,
            typeStats,
            byType: undefined
          }
        }
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Update user location
// @route   PUT /api/users/location
// @access  Private
router.put('/location', protect, [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    await req.user.updateLocation(longitude, latitude, address);

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        location: req.user.location
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Upload user avatar
// @route   POST /api/users/avatar
// @access  Private
router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Upload to Cloudinary
    const avatarUrl = await uploadAvatar(req.file);

    // Update user profile
    req.user.profile.avatar = avatarUrl;
    await req.user.save();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar: avatarUrl
      }
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get user's incidents
// @route   GET /api/users/incidents
// @access  Private
router.get('/incidents', protect, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'verified', 'resolved', 'rejected'])
    .withMessage('Invalid status'),
  query('type')
    .optional()
    .isIn(['accident', 'hazard', 'violation', 'emergency', 'construction', 'weather'])
    .withMessage('Invalid incident type')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { reportedBy: req.user._id };
    if (status) query.status = status;
    if (type) query.type = type;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const incidents = await Incident.find(query)
      .populate('verifiedBy', 'profile.name')
      .populate('resolvedBy', 'profile.name')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Incident.countDocuments(query);

    res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get user incidents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user incidents',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get user leaderboard
// @route   GET /api/users/leaderboard
// @access  Public
router.get('/leaderboard', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('timeframe')
    .optional()
    .isIn(['week', 'month', 'year', 'all'])
    .withMessage('Invalid timeframe')
], handleValidationErrors, async (req, res) => {
  try {
    const { limit = 50, timeframe = 'month' } = req.query;

    // Calculate date range based on timeframe
    let dateFilter = {};
    if (timeframe !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
      
      if (startDate) {
        dateFilter = { lastActiveAt: { $gte: startDate } };
      }
    }

    const leaderboard = await User.find({
      isActive: true,
      ...dateFilter
    })
    .select('profile.name profile.avatar stats createdAt')
    .sort({ 'stats.reputation': -1, 'stats.reportsSubmitted': -1 })
    .limit(parseInt(limit))
    .lean();

    // Add rank to each user
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    res.json({
      success: true,
      data: {
        leaderboard: rankedLeaderboard,
        timeframe,
        total: rankedLeaderboard.length
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get user by ID (public profile)
// @route   GET /api/users/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('profile.name profile.avatar stats isVerified createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get public incident statistics
    const incidentStats = await Incident.aggregate([
      {
        $match: { 
          reportedBy: user._id,
          status: { $in: ['verified', 'resolved'] } // Only show verified/resolved incidents
        }
      },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          verifiedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] }
          },
          resolvedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          totalUpvotes: { $sum: '$upvotes' },
          byType: {
            $push: '$type'
          }
        }
      }
    ]);

    const stats = incidentStats[0] || {
      totalReports: 0,
      verifiedReports: 0,
      resolvedReports: 0,
      totalUpvotes: 0,
      byType: []
    };

    // Count incidents by type
    const typeStats = stats.byType.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          publicStats: {
            ...stats,
            typeStats,
            byType: undefined
          }
        }
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Update user settings
// @route   PUT /api/users/settings
// @access  Private
router.put('/settings', protect, [
  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notifications setting must be boolean'),
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notifications setting must be boolean'),
  body('privacy.shareLocation')
    .optional()
    .isBoolean()
    .withMessage('Share location setting must be boolean'),
  body('alerts.radius')
    .optional()
    .isInt({ min: 1000, max: 50000 })
    .withMessage('Alert radius must be between 1000 and 50000 meters'),
  body('alerts.types')
    .optional()
    .isArray()
    .withMessage('Alert types must be an array'),
  body('alerts.types.*')
    .optional()
    .isIn(['accident', 'hazard', 'violation', 'emergency'])
    .withMessage('Invalid alert type')
], handleValidationErrors, async (req, res) => {
  try {
    const { notifications, privacy, alerts } = req.body;

    const updateData = { settings: { ...req.user.settings } };

    if (notifications) {
      updateData.settings.notifications = {
        ...updateData.settings.notifications,
        ...notifications
      };
    }

    if (privacy) {
      updateData.settings.privacy = {
        ...updateData.settings.privacy,
        ...privacy
      };
    }

    if (alerts) {
      updateData.settings.alerts = {
        ...updateData.settings.alerts,
        ...alerts
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -deviceTokens');

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        settings: updatedUser.settings
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Deactivate user account
// @route   PUT /api/users/deactivate
// @access  Private
router.put('/deactivate', protect, async (req, res) => {
  try {
    req.user.isActive = false;
    await req.user.save();

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get user statistics (admin only)
// @route   GET /api/users/admin/stats
// @access  Private (Admin only)
router.get('/admin/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          verifiedUsers: {
            $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
          },
          usersWithReports: {
            $sum: { $cond: [{ $gt: ['$stats.reportsSubmitted', 0] }, 1, 0] }
          },
          totalReports: { $sum: '$stats.reportsSubmitted' },
          totalUpvotes: { $sum: '$stats.upvotesReceived' }
        }
      }
    ]);

    const result = stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      verifiedUsers: 0,
      usersWithReports: 0,
      totalReports: 0,
      totalUpvotes: 0
    };

    // Get registration trends (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const registrationTrend = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        stats: result,
        registrationTrend
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
