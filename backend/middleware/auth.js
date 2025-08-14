const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Update last active time
      req.user.lastActiveAt = new Date();
      await req.user.save({ validateBeforeSave: false });

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Not authorized'
        });
      }
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }
};

// Grant access to specific permissions
const authorize = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const hasPermission = permissions.some(permission => 
      req.user.permissions.includes(permission) || 
      req.user.permissions.includes('admin')
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permissions: ${permissions.join(', ')}`
      });
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      
      if (req.user && req.user.isActive) {
        req.user.lastActiveAt = new Date();
        await req.user.save({ validateBeforeSave: false });
      }
    } catch (error) {
      // Silently fail for optional auth
      req.user = null;
    }
  }

  next();
};

// Check if user owns resource or has admin permission
const ownerOrAdmin = (resourceField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Admin can access everything
    if (req.user.permissions.includes('admin')) {
      return next();
    }

    // Check if user owns the resource
    const resource = req.resource || req.body || req.params;
    const resourceUserId = resource[resourceField];

    if (resourceUserId && resourceUserId.toString() === req.user._id.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources'
    });
  };
};

// Rate limiting for sensitive operations
const sensitiveOperation = (req, res, next) => {
  // This could be enhanced with Redis for distributed rate limiting
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  if (!req.user.lastSensitiveOp) {
    req.user.lastSensitiveOp = [];
  }

  // Clean old attempts
  req.user.lastSensitiveOp = req.user.lastSensitiveOp.filter(
    timestamp => now - timestamp < windowMs
  );

  if (req.user.lastSensitiveOp.length >= maxAttempts) {
    return res.status(429).json({
      success: false,
      message: 'Too many sensitive operations. Please try again later.'
    });
  }

  req.user.lastSensitiveOp.push(now);
  next();
};

// Verify refresh token
const verifyRefreshToken = async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

module.exports = {
  protect,
  authorize,
  optionalAuth,
  ownerOrAdmin,
  sensitiveOperation,
  verifyRefreshToken
};
