const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let firebaseApp;

const initializeFirebase = () => {
  try {
    // In production, use service account key file or environment variables
    // For development, you can use the service account key file
    if (!admin.apps.length) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      console.log('✅ Firebase Admin initialized');
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    console.log('⚠️  Push notifications will not work without proper Firebase configuration');
  }
};

// Send push notification to a single device
const sendToDevice = async (deviceToken, notification, data = {}) => {
  if (!firebaseApp) {
    console.log('Firebase not initialized, skipping push notification');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const message = {
      token: deviceToken,
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { imageUrl: notification.imageUrl })
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      android: {
        notification: {
          channelId: 'roadalert_incidents',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          ...(notification.priority === 'critical' && {
            priority: 'max',
            visibility: 'public'
          })
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          ...data
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body
            },
            badge: 1,
            sound: 'default',
            ...(notification.priority === 'critical' && {
              'interruption-level': 'critical'
            })
          }
        },
        fcm_options: {
          image: notification.imageUrl
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Push notification sent successfully:', response);
    
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Push notification error:', error);
    
    // Handle specific FCM errors
    if (error.code === 'messaging/registration-token-not-registered') {
      return { success: false, error: 'Token not registered', shouldRemoveToken: true };
    } else if (error.code === 'messaging/invalid-registration-token') {
      return { success: false, error: 'Invalid token', shouldRemoveToken: true };
    }
    
    return { success: false, error: error.message };
  }
};

// Send push notification to multiple devices
const sendToMultipleDevices = async (deviceTokens, notification, data = {}) => {
  if (!firebaseApp || !Array.isArray(deviceTokens) || deviceTokens.length === 0) {
    return { success: false, error: 'Invalid input or Firebase not configured' };
  }

  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { imageUrl: notification.imageUrl })
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      android: {
        notification: {
          channelId: 'roadalert_incidents',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          ...data
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body
            },
            badge: 1,
            sound: 'default'
          }
        }
      },
      tokens: deviceTokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`✅ Batch notification sent: ${response.successCount}/${deviceTokens.length} successful`);
    
    // Handle failed tokens
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        if (error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token') {
          failedTokens.push(deviceTokens[idx]);
        }
      }
    });

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens
    };
  } catch (error) {
    console.error('❌ Batch push notification error:', error);
    return { success: false, error: error.message };
  }
};

// Send incident alert to nearby users
const sendIncidentAlert = async (incident, nearbyUsers) => {
  if (!Array.isArray(nearbyUsers) || nearbyUsers.length === 0) {
    return { success: true, message: 'No nearby users to notify' };
  }

  // Collect device tokens from users who have push notifications enabled
  const deviceTokens = [];
  const userTokenMap = new Map();

  nearbyUsers.forEach(user => {
    if (user.settings?.notifications?.push && user.deviceTokens?.length > 0) {
      user.deviceTokens.forEach(deviceToken => {
        deviceTokens.push(deviceToken.token);
        userTokenMap.set(deviceToken.token, user._id);
      });
    }
  });

  if (deviceTokens.length === 0) {
    return { success: true, message: 'No users with push notifications enabled' };
  }

  // Create notification based on incident type and severity
  const notification = {
    title: getIncidentTitle(incident),
    body: getIncidentBody(incident),
    imageUrl: incident.images?.[0]?.url,
    priority: incident.severity === 'critical' ? 'critical' : 'high'
  };

  const data = {
    type: 'incident_alert',
    incidentId: incident._id.toString(),
    incidentType: incident.type,
    severity: incident.severity,
    latitude: incident.location.coordinates[1].toString(),
    longitude: incident.location.coordinates[0].toString(),
    address: incident.location.address
  };

  const result = await sendToMultipleDevices(deviceTokens, notification, data);

  // Remove failed tokens from users
  if (result.failedTokens?.length > 0) {
    await removeFailedTokens(result.failedTokens, userTokenMap);
  }

  return result;
};

// Send emergency alert
const sendEmergencyAlert = async (alert, nearbyUsers) => {
  const deviceTokens = [];
  const userTokenMap = new Map();

  nearbyUsers.forEach(user => {
    if (user.settings?.notifications?.push && user.deviceTokens?.length > 0) {
      user.deviceTokens.forEach(deviceToken => {
        deviceTokens.push(deviceToken.token);
        userTokenMap.set(deviceToken.token, user._id);
      });
    }
  });

  if (deviceTokens.length === 0) {
    return { success: true, message: 'No users to notify' };
  }

  const notification = {
    title: '🚨 Emergency Alert',
    body: alert.message,
    priority: 'critical'
  };

  const data = {
    type: 'emergency_alert',
    alertId: alert._id?.toString() || 'emergency',
    latitude: alert.location?.coordinates?.[1]?.toString() || '',
    longitude: alert.location?.coordinates?.[0]?.toString() || '',
    address: alert.location?.address || ''
  };

  const result = await sendToMultipleDevices(deviceTokens, notification, data);

  if (result.failedTokens?.length > 0) {
    await removeFailedTokens(result.failedTokens, userTokenMap);
  }

  return result;
};

// Send status update notification
const sendStatusUpdate = async (incident, users, status) => {
  const deviceTokens = [];
  const userTokenMap = new Map();

  users.forEach(user => {
    if (user.settings?.notifications?.push && user.deviceTokens?.length > 0) {
      user.deviceTokens.forEach(deviceToken => {
        deviceTokens.push(deviceToken.token);
        userTokenMap.set(deviceToken.token, user._id);
      });
    }
  });

  if (deviceTokens.length === 0) {
    return { success: true, message: 'No users to notify' };
  }

  const statusMessages = {
    verified: 'Incident has been verified by authorities',
    resolved: 'Incident has been resolved',
    rejected: 'Incident report has been rejected'
  };

  const notification = {
    title: `Incident ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    body: `${incident.title} - ${statusMessages[status] || 'Status updated'}`,
    priority: 'normal'
  };

  const data = {
    type: 'status_update',
    incidentId: incident._id.toString(),
    status,
    incidentType: incident.type
  };

  const result = await sendToMultipleDevices(deviceTokens, notification, data);

  if (result.failedTokens?.length > 0) {
    await removeFailedTokens(result.failedTokens, userTokenMap);
  }

  return result;
};

// Helper functions
const getIncidentTitle = (incident) => {
  const typeEmojis = {
    accident: '🚗',
    hazard: '⚠️',
    violation: '🚨',
    emergency: '🆘',
    construction: '🚧',
    weather: '🌦️'
  };

  const emoji = typeEmojis[incident.type] || '📍';
  const typeText = incident.type.charAt(0).toUpperCase() + incident.type.slice(1);
  
  return `${emoji} ${typeText} Alert`;
};

const getIncidentBody = (incident) => {
  const distance = incident.distance ? ` (${Math.round(incident.distance)}m away)` : '';
  return `${incident.title}${distance} - ${incident.location.address}`;
};

const removeFailedTokens = async (failedTokens, userTokenMap) => {
  try {
    const User = require('../models/User');
    
    // Group failed tokens by user
    const tokensByUser = new Map();
    failedTokens.forEach(token => {
      const userId = userTokenMap.get(token);
      if (userId) {
        if (!tokensByUser.has(userId)) {
          tokensByUser.set(userId, []);
        }
        tokensByUser.get(userId).push(token);
      }
    });

    // Remove tokens from each user
    const removePromises = Array.from(tokensByUser.entries()).map(([userId, tokens]) => {
      return User.findByIdAndUpdate(userId, {
        $pull: { deviceTokens: { token: { $in: tokens } } }
      });
    });

    await Promise.all(removePromises);
    console.log(`🗑️  Removed ${failedTokens.length} invalid device tokens`);
  } catch (error) {
    console.error('Error removing failed tokens:', error);
  }
};

// Subscribe to topic (for broadcast notifications)
const subscribeToTopic = async (tokens, topic) => {
  if (!firebaseApp || !Array.isArray(tokens) || tokens.length === 0) {
    return { success: false, error: 'Invalid input or Firebase not configured' };
  }

  try {
    const response = await admin.messaging().subscribeToTopic(tokens, topic);
    console.log(`✅ Subscribed ${response.successCount} devices to topic: ${topic}`);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    console.error('Topic subscription error:', error);
    return { success: false, error: error.message };
  }
};

// Send to topic
const sendToTopic = async (topic, notification, data = {}) => {
  if (!firebaseApp) {
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const message = {
      topic,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Topic notification sent:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Topic notification error:', error);
    return { success: false, error: error.message };
  }
};

// Initialize Firebase on module load
initializeFirebase();

module.exports = {
  sendToDevice,
  sendToMultipleDevices,
  sendIncidentAlert,
  sendEmergencyAlert,
  sendStatusUpdate,
  subscribeToTopic,
  sendToTopic,
  initializeFirebase
};
