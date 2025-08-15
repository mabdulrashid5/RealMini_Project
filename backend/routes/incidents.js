const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
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

// Helper function to upload images to Cloudinary
const uploadImages = async (files) => {
  const uploadPromises = files.map(file => {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'roadalert/incidents',
          resource_type: 'image',
          transformation: [
            { width: 800, height: 600, crop: 'limit', quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve({
            url: result.secure_url,
            publicId: result.public_id
          });
        }
      );
      uploadStream.end(file.buffer);
    });
  });

  return Promise.all(uploadPromises);
};

// Helper function to create alerts for nearby users
const createNearbyAlerts = async (incident) => {
  try {
    // Find users within 10km who have incident alerts enabled
    const nearbyUsers = await User.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: incident.location.coordinates
          },
          $maxDistance: 10000 // 10km
        }
      },
      'settings.alerts.types': incident.type,
      'settings.notifications.push': true,
      isActive: true,
      _id: { $ne: incident.reportedBy } // Don't alert the reporter
    });

    // Create alerts for each nearby user
    const alertPromises = nearbyUsers.map(user => {
      const distance = Alert.calculateDistance(
        user.location.coordinates[0],
        user.location.coordinates[1],
        incident.location.coordinates[0],
        incident.location.coordinates[1]
      );

      // Only create alert if within user's preferred radius
      if (distance <= user.settings.alerts.radius) {
        const alertData = Alert.createLocationAlert(incident, user.location, user.settings.alerts.radius);
        alertData.user = user._id;
        alertData.metadata.distance = distance;

        return Alert.create(alertData);
      }
    });

    const alerts = await Promise.all(alertPromises.filter(Boolean));
    
    // Emit real-time alerts via Socket.IO
    const io = require('../server').get('io');
    if (io) {
      alerts.forEach(alert => {
        io.to(`user_${alert.user}`).emit('new_alert', alert);
      });
    }

    return alerts;
  } catch (error) {
    console.error('Error creating nearby alerts:', error);
  }
};

// @desc    Get all incidents with filtering and pagination
// @route   GET /api/incidents
// @access  Public
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['accident', 'hazard', 'violation', 'emergency', 'construction', 'weather'])
    .withMessage('Invalid incident type'),
  query('status')
    .optional()
    .isIn(['pending', 'verified', 'resolved', 'rejected'])
    .withMessage('Invalid status'),
  query('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity'),
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  query('radius')
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage('Radius must be between 100 and 50000 meters')
], handleValidationErrors, optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      severity,
      latitude,
      longitude,
      radius = 10000,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { isActive: true };
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (severity) query.severity = severity;

    // Location-based filtering
    if (latitude && longitude) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(radius)
        }
      };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const incidents = await Incident.find(query)
      .populate('reportedBy', 'profile.name profile.avatar stats.reputation')
      .populate('verifiedBy', 'profile.name')
      .populate('resolvedBy', 'profile.name')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Incident.countDocuments(query);

    // Add distance if location provided
    if (latitude && longitude && incidents.length > 0) {
      incidents.forEach(incident => {
        incident.distance = Alert.calculateDistance(
          parseFloat(longitude),
          parseFloat(latitude),
          incident.location.coordinates[0],
          incident.location.coordinates[1]
        );
      });
    }

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
    console.error('Get incidents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incidents',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get nearby incidents
// @route   GET /api/incidents/nearby
// @access  Public
router.get('/nearby', [
  query('latitude')
    .notEmpty()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  query('longitude')
    .notEmpty()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  query('radius')
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage('Radius must be between 100 and 50000 meters')
], handleValidationErrors, optionalAuth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000, type, status = 'verified,pending' } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (status) filters.status = { $in: status.split(',') };

    const incidents = await Incident.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseInt(radius),
      filters
    );

    // Add distance to each incident
    const incidentsWithDistance = incidents.map(incident => {
      const incidentObj = incident.toObject();
      incidentObj.distance = Alert.calculateDistance(
        parseFloat(longitude),
        parseFloat(latitude),
        incident.location.coordinates[0],
        incident.location.coordinates[1]
      );
      return incidentObj;
    });

    res.json({
      success: true,
      data: {
        incidents: incidentsWithDistance,
        center: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        radius: parseInt(radius)
      }
    });
  } catch (error) {
    console.error('Get nearby incidents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby incidents',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get trending incidents
// @route   GET /api/incidents/trending
// @access  Public
router.get('/trending', [
  query('hours')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('Hours must be between 1 and 168')
], handleValidationErrors, async (req, res) => {
  try {
    const { hours = 24 } = req.query;

    const incidents = await Incident.findTrending(parseInt(hours));

    res.json({
      success: true,
      data: {
        incidents,
        timeframe: `${hours} hours`
      }
    });
  } catch (error) {
    console.error('Get trending incidents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending incidents',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get single incident
// @route   GET /api/incidents/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('reportedBy', 'profile.name profile.avatar stats.reputation')
      .populate('verifiedBy', 'profile.name')
      .populate('resolvedBy', 'profile.name')
      .populate('comments.user', 'profile.name profile.avatar');

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Increment view count (async, don't wait)
    incident.incrementViewCount().catch(console.error);

    res.json({
      success: true,
      data: { incident }
    });
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incident',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Create new incident
// @route   POST /api/incidents
// @access  Private
router.post('/', protect, upload.array('images', 5), [
  body('type')
    .isIn(['accident', 'hazard', 'violation', 'emergency', 'construction', 'weather'])
    .withMessage('Invalid incident type'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('location')
    .isObject()
    .withMessage('Location is required'),
  body('location.type')
    .equals('Point')
    .withMessage('Invalid location type'),
  body('location.coordinates')
    .isArray()
    .withMessage('Invalid coordinates format'),
  body('location.coordinates.0')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('location.coordinates.1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('location.address')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity')
], handleValidationErrors, async (req, res) => {
  try {
    console.log('Creating incident with data:', req.body);
    const { type, title, description, location, severity, tags } = req.body;

    // Additional location validation
    if (!location || !location.type || !Array.isArray(location.coordinates)) {
      console.error('Invalid location format:', location);
      return res.status(400).json({
        success: false,
        message: 'Invalid location format',
        error: 'Location must include type and coordinates array'
      });
    }

    // Validate coordinates
    if (location.coordinates.length !== 2 || 
        !location.coordinates.every(coord => typeof coord === 'number' && !isNaN(coord))) {
      console.error('Invalid coordinates:', location.coordinates);
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates',
        error: 'Coordinates must be an array of two numbers [longitude, latitude]'
      });
    }

    // Log validation results
    console.log('Location validation passed:', {
      hasLocation: !!location,
      locationType: location.type,
      coordinates: location.coordinates,
      address: location.address
    });

    // Upload images if provided
    let images = [];
    if (req.files && req.files.length > 0) {
      try {
        images = await uploadImages(req.files);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload images',
          error: uploadError.message
        });
      }
    }

    console.log('Creating incident with validated data:', {
      type,
      title,
      description,
      location
    });

    // Create incident
    const incident = await Incident.create({
      type,
      title,
      description,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address
      },
      images,
      reportedBy: req.user._id,
      severity: severity || 'medium',
      tags: tags ? tags.split(',').map(tag => tag.trim().toLowerCase()) : []
    });

    console.log('Successfully created incident:', {
      id: incident._id,
      type: incident.type,
      location: incident.location
    });

    // Populate the incident for response
    await incident.populate('reportedBy', 'profile.name profile.avatar stats.reputation');

    // Update user stats
    await req.user.incrementStat('reportsSubmitted');

    // Create alerts for nearby users (async, don't wait)
    createNearbyAlerts(incident).catch(console.error);

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new_incident', {
        id: incident._id,
        type: incident.type,
        title: incident.title,
        location: incident.location,
        severity: incident.severity,
        reportedBy: incident.reportedBy
      });
    }

    res.status(201).json({
      success: true,
      message: 'Incident reported successfully',
      data: { incident }
    });
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create incident',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Update incident
// @route   PUT /api/incidents/:id
// @access  Private (Owner or Admin)
router.put('/:id', protect, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity')
], handleValidationErrors, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Check if user owns the incident or has admin permission
    if (incident.reportedBy.toString() !== req.user._id.toString() && 
        !req.user.permissions.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this incident'
      });
    }

    // Update incident
    const { title, description, severity, tags } = req.body;
    const updateData = {};
    
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (severity) updateData.severity = severity;
    if (tags) updateData.tags = tags.split(',').map(tag => tag.trim().toLowerCase());

    const updatedIncident = await Incident.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('reportedBy', 'profile.name profile.avatar stats.reputation');

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('incident_updated', {
        id: updatedIncident._id,
        updates: updateData
      });
    }

    res.json({
      success: true,
      message: 'Incident updated successfully',
      data: { incident: updatedIncident }
    });
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update incident',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Upvote incident
// @route   POST /api/incidents/:id/upvote
// @access  Private
router.post('/:id/upvote', protect, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Check if user already upvoted
    if (incident.upvotedBy.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You have already upvoted this incident'
      });
    }

    await incident.addUpvote(req.user._id);

    // Update reporter's stats
    const reporter = await User.findById(incident.reportedBy);
    if (reporter) {
      await reporter.incrementStat('upvotesReceived');
    }

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('incident_upvoted', {
        id: incident._id,
        upvotes: incident.upvotes,
        upvotedBy: req.user._id
      });
    }

    res.json({
      success: true,
      message: 'Incident upvoted successfully',
      data: {
        upvotes: incident.upvotes,
        upvoted: true
      }
    });
  } catch (error) {
    console.error('Upvote incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upvote incident',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Remove upvote from incident
// @route   DELETE /api/incidents/:id/upvote
// @access  Private
router.delete('/:id/upvote', protect, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Check if user has upvoted
    if (!incident.upvotedBy.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You have not upvoted this incident'
      });
    }

    await incident.removeUpvote(req.user._id);

    // Update reporter's stats
    const reporter = await User.findById(incident.reportedBy);
    if (reporter) {
      await reporter.incrementStat('upvotesReceived', -1);
    }

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('incident_upvote_removed', {
        id: incident._id,
        upvotes: incident.upvotes,
        removedBy: req.user._id
      });
    }

    res.json({
      success: true,
      message: 'Upvote removed successfully',
      data: {
        upvotes: incident.upvotes,
        upvoted: false
      }
    });
  } catch (error) {
    console.error('Remove upvote error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove upvote',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Verify incident
// @route   POST /api/incidents/:id/verify
// @access  Private (Verify permission required)
router.post('/:id/verify', protect, authorize('verify'), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    if (incident.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending incidents can be verified'
      });
    }

    await incident.verify(req.user._id);
    await req.user.incrementStat('reportsVerified');

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('incident_verified', {
        id: incident._id,
        verifiedBy: req.user._id,
        verifiedAt: incident.verifiedAt
      });
    }

    res.json({
      success: true,
      message: 'Incident verified successfully',
      data: {
        status: incident.status,
        verifiedBy: incident.verifiedBy,
        verifiedAt: incident.verifiedAt
      }
    });
  } catch (error) {
    console.error('Verify incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify incident',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Resolve incident
// @route   POST /api/incidents/:id/resolve
// @access  Private (Resolve permission required)
router.post('/:id/resolve', protect, authorize('resolve'), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    if (!['pending', 'verified'].includes(incident.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only pending or verified incidents can be resolved'
      });
    }

    await incident.resolve(req.user._id);
    await req.user.incrementStat('reportsResolved');

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('incident_resolved', {
        id: incident._id,
        resolvedBy: req.user._id,
        resolvedAt: incident.resolvedAt
      });
    }

    res.json({
      success: true,
      message: 'Incident resolved successfully',
      data: {
        status: incident.status,
        resolvedBy: incident.resolvedBy,
        resolvedAt: incident.resolvedAt
      }
    });
  } catch (error) {
    console.error('Resolve incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve incident',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Add comment to incident
// @route   POST /api/incidents/:id/comments
// @access  Private
router.post('/:id/comments', protect, [
  body('text')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { text } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    await incident.addComment(req.user._id, text);
    
    // Populate the new comment
    await incident.populate('comments.user', 'profile.name profile.avatar');
    const newComment = incident.comments[incident.comments.length - 1];

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('incident_comment_added', {
        incidentId: incident._id,
        comment: newComment
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { comment: newComment }
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Delete incident
// @route   DELETE /api/incidents/:id
// @access  Private (Owner or Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Check if user owns the incident or has admin permission
    if (incident.reportedBy.toString() !== req.user._id.toString() && 
        !req.user.permissions.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this incident'
      });
    }

    // Delete images from Cloudinary
    if (incident.images && incident.images.length > 0) {
      const deletePromises = incident.images.map(image => 
        cloudinary.uploader.destroy(image.publicId)
      );
      await Promise.all(deletePromises);
    }

    await Incident.findByIdAndDelete(req.params.id);

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('incident_deleted', { id: req.params.id });
    }

    res.json({
      success: true,
      message: 'Incident deleted successfully'
    });
  } catch (error) {
    console.error('Delete incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete incident',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
