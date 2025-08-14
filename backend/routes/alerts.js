const express = require('express');
const { query, validationResult } = require('express-validator');
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');

const router = express.Router();

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

// @desc    Get user's alerts
// @route   GET /api/alerts
// @access  Private
router.get('/', protect, [
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
    .isIn(['active', 'read', 'dismissed', 'expired'])
    .withMessage('Invalid status'),
  query('type')
    .optional()
    .isIn(['incident', 'emergency', 'update', 'reminder', 'system'])
    .withMessage('Invalid alert type'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority'),
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
], handleValidationErrors, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      priority,
      latitude,
      longitude,
      radius = 10000
    } = req.query;

    // If location provided, use location-based query
    if (latitude && longitude) {
      const alerts = await Alert.findForUserInArea(
        req.user._id,
        parseFloat(longitude),
        parseFloat(latitude),
        parseInt(radius)
      );

      // Apply additional filters
      let filteredAlerts = alerts;
      if (status) filteredAlerts = filteredAlerts.filter(alert => alert.status === status);
      if (type) filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
      if (priority) filteredAlerts = filteredAlerts.filter(alert => alert.priority === priority);

      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);

      return res.json({
        success: true,
        data: {
          alerts: paginatedAlerts,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(filteredAlerts.length / limit),
            total: filteredAlerts.length,
            hasNext: endIndex < filteredAlerts.length,
            hasPrev: page > 1
          }
        }
      });
    }

    // Regular query without location
    const query = { user: req.user._id };
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const alerts = await Alert.find(query)
      .populate('incident', 'title type status location')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Alert.countDocuments(query);

    res.json({
      success: true,
      data: {
        alerts,
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
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get single alert
// @route   GET /api/alerts/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('incident', 'title type status location description images');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: { alert }
    });
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Mark alert as read
// @route   PUT /api/alerts/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    if (alert.status === 'read') {
      return res.status(400).json({
        success: false,
        message: 'Alert is already marked as read'
      });
    }

    await alert.markAsRead();

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user._id}`).emit('alert_read', {
        id: alert._id,
        readAt: alert.readAt
      });
    }

    res.json({
      success: true,
      message: 'Alert marked as read',
      data: {
        status: alert.status,
        readAt: alert.readAt
      }
    });
  } catch (error) {
    console.error('Mark alert as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark alert as read',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Dismiss alert
// @route   PUT /api/alerts/:id/dismiss
// @access  Private
router.put('/:id/dismiss', protect, async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    if (alert.status === 'dismissed') {
      return res.status(400).json({
        success: false,
        message: 'Alert is already dismissed'
      });
    }

    await alert.dismiss();

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user._id}`).emit('alert_dismissed', {
        id: alert._id,
        dismissedAt: alert.dismissedAt
      });
    }

    res.json({
      success: true,
      message: 'Alert dismissed',
      data: {
        status: alert.status,
        dismissedAt: alert.dismissedAt
      }
    });
  } catch (error) {
    console.error('Dismiss alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss alert',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Mark multiple alerts as read
// @route   PUT /api/alerts/bulk/read
// @access  Private
router.put('/bulk/read', protect, async (req, res) => {
  try {
    const { alertIds } = req.body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Alert IDs array is required'
      });
    }

    const result = await Alert.updateMany(
      {
        _id: { $in: alertIds },
        user: req.user._id,
        status: { $ne: 'read' }
      },
      {
        status: 'read',
        readAt: new Date()
      }
    );

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user._id}`).emit('alerts_bulk_read', {
        alertIds: alertIds,
        readAt: new Date()
      });
    }

    res.json({
      success: true,
      message: `${result.modifiedCount} alerts marked as read`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Bulk mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark alerts as read',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get alert statistics
// @route   GET /api/alerts/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await Alert.aggregate([
      {
        $match: { user: req.user._id }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          read: {
            $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] }
          },
          dismissed: {
            $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] }
          },
          byType: {
            $push: '$type'
          },
          byPriority: {
            $push: '$priority'
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          active: 1,
          read: 1,
          dismissed: 1,
          typeStats: {
            $reduce: {
              input: '$byType',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [
                        {
                          k: '$$this',
                          v: {
                            $add: [
                              { $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] },
                              1
                            ]
                          }
                        }
                      ]
                    ]
                  }
                ]
              }
            }
          },
          priorityStats: {
            $reduce: {
              input: '$byPriority',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [
                        {
                          k: '$$this',
                          v: {
                            $add: [
                              { $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] },
                              1
                            ]
                          }
                        }
                      ]
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      active: 0,
      read: 0,
      dismissed: 0,
      typeStats: {},
      priorityStats: {}
    };

    res.json({
      success: true,
      data: { stats: result }
    });
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Delete old alerts (cleanup)
// @route   DELETE /api/alerts/cleanup
// @access  Private
router.delete('/cleanup', protect, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await Alert.deleteMany({
      user: req.user._id,
      status: { $in: ['read', 'dismissed'] },
      updatedAt: { $lt: thirtyDaysAgo }
    });

    res.json({
      success: true,
      message: `${result.deletedCount} old alerts cleaned up`,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('Cleanup alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
