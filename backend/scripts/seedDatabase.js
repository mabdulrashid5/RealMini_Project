const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');

// Sample data
const sampleUsers = [
  {
    email: 'admin@roadalert.com',
    password: 'Admin123!',
    profile: {
      name: 'Admin User',
      phone: '+233244123456'
    },
    location: {
      type: 'Point',
      coordinates: [-0.1870, 5.6037], // Accra, Ghana
      address: 'Ring Road Central, Accra'
    },
    permissions: ['report', 'verify', 'resolve', 'moderate', 'admin'],
    isVerified: true
  },
  {
    email: 'moderator@roadalert.com',
    password: 'Mod123!',
    profile: {
      name: 'John Moderator',
      phone: '+233244123457'
    },
    location: {
      type: 'Point',
      coordinates: [-0.1964, 5.6142],
      address: 'Liberation Road, Accra'
    },
    permissions: ['report', 'verify', 'resolve', 'moderate'],
    isVerified: true
  },
  {
    email: 'user1@example.com',
    password: 'User123!',
    profile: {
      name: 'Alice Johnson',
      phone: '+233244123458'
    },
    location: {
      type: 'Point',
      coordinates: [-0.1761, 5.6292],
      address: 'Spintex Road, Accra'
    },
    permissions: ['report'],
    stats: {
      reportsSubmitted: 5,
      upvotesReceived: 12
    }
  },
  {
    email: 'user2@example.com',
    password: 'User123!',
    profile: {
      name: 'Bob Smith',
      phone: '+233244123459'
    },
    location: {
      type: 'Point',
      coordinates: [-0.1856, 5.6505],
      address: 'Legon Road, Accra'
    },
    permissions: ['report', 'verify'],
    stats: {
      reportsSubmitted: 3,
      reportsVerified: 2,
      upvotesReceived: 8
    }
  },
  {
    email: 'user3@example.com',
    password: 'User123!',
    profile: {
      name: 'Carol Williams',
      phone: '+233244123460'
    },
    location: {
      type: 'Point',
      coordinates: [-0.2164, 5.6192],
      address: 'Graphic Road, Accra'
    },
    permissions: ['report'],
    stats: {
      reportsSubmitted: 8,
      upvotesReceived: 20
    }
  }
];

const sampleIncidents = [
  {
    type: 'accident',
    title: 'Car collision at Ring Road intersection',
    description: 'Two vehicles involved in a collision at the Ring Road Central intersection. Traffic is moving slowly in both directions. Emergency services are on scene.',
    location: {
      type: 'Point',
      coordinates: [-0.1870, 5.6037],
      address: 'Ring Road Central Intersection, Accra'
    },
    severity: 'high',
    status: 'verified',
    tags: ['intersection', 'emergency-services', 'traffic-delay']
  },
  {
    type: 'hazard',
    title: 'Large pothole causing vehicle damage',
    description: 'Deep pothole in the right lane is causing vehicles to swerve dangerously. Several cars have already suffered tire damage.',
    location: {
      type: 'Point',
      coordinates: [-0.1964, 5.6142],
      address: 'Liberation Road near Tema Station, Accra'
    },
    severity: 'medium',
    status: 'pending',
    tags: ['pothole', 'road-damage', 'vehicle-damage']
  },
  {
    type: 'violation',
    title: 'Reckless taxi driver running red lights',
    description: 'Yellow taxi with license plate GR-1234-20 has been observed running red lights and overtaking dangerously on Spintex Road.',
    location: {
      type: 'Point',
      coordinates: [-0.1761, 5.6292],
      address: 'Spintex Road near Junction Mall, Accra'
    },
    severity: 'high',
    status: 'verified',
    tags: ['reckless-driving', 'traffic-violation', 'taxi']
  },
  {
    type: 'hazard',
    title: 'Fallen tree blocking half the road',
    description: 'Large tree fell across the road during last night\'s storm, blocking the left lane completely. Vehicles are forced to merge into single lane.',
    location: {
      type: 'Point',
      coordinates: [-0.1856, 5.6505],
      address: 'Legon Road near University of Ghana, Accra'
    },
    severity: 'high',
    status: 'resolved',
    tags: ['tree-fall', 'storm-damage', 'lane-closure']
  },
  {
    type: 'accident',
    title: 'Motorcycle accident with injuries',
    description: 'Motorcycle collided with a car at the Graphic Road junction. Ambulance and police are on scene. One person injured.',
    location: {
      type: 'Point',
      coordinates: [-0.2164, 5.6192],
      address: 'Graphic Road Junction, Accra'
    },
    severity: 'critical',
    status: 'verified',
    tags: ['motorcycle', 'injury', 'ambulance', 'police']
  },
  {
    type: 'construction',
    title: 'Road construction causing delays',
    description: 'Major road construction work on the main carriageway. Traffic is being diverted through alternative routes causing significant delays.',
    location: {
      type: 'Point',
      coordinates: [-0.2020, 5.6200],
      address: 'Kaneshie-Mallam Highway, Accra'
    },
    severity: 'medium',
    status: 'verified',
    tags: ['construction', 'traffic-diversion', 'delays']
  },
  {
    type: 'weather',
    title: 'Heavy flooding on major road',
    description: 'Heavy rains have caused severe flooding on the main road. Water level is approximately 30cm deep, making passage dangerous for small vehicles.',
    location: {
      type: 'Point',
      coordinates: [-0.1800, 5.6100],
      address: 'Achimota-Lapaz Road, Accra'
    },
    severity: 'critical',
    status: 'pending',
    tags: ['flooding', 'heavy-rain', 'dangerous-conditions']
  },
  {
    type: 'emergency',
    title: 'Fire incident near fuel station',
    description: 'Small fire has broken out near a fuel station. Fire service is on scene. Road has been closed for safety. Avoid the area.',
    location: {
      type: 'Point',
      coordinates: [-0.1950, 5.6250],
      address: 'Kwame Nkrumah Avenue near Shell Station, Accra'
    },
    severity: 'critical',
    status: 'verified',
    tags: ['fire', 'fuel-station', 'road-closure', 'emergency']
  }
];

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Incident.deleteMany({});
    await Alert.deleteMany({});
    console.log('🗑️  Database cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

const seedUsers = async () => {
  try {
    console.log('👥 Seeding users...');
    
    const users = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      users.push(user);
    }
    
    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} users`);
    
    return createdUsers;
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

const seedIncidents = async (users) => {
  try {
    console.log('📍 Seeding incidents...');
    
    const incidents = [];
    for (let i = 0; i < sampleIncidents.length; i++) {
      const incidentData = sampleIncidents[i];
      const reportedBy = users[i % users.length]; // Rotate through users
      
      const incident = new Incident({
        ...incidentData,
        reportedBy: reportedBy._id,
        reportedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last week
        upvotes: Math.floor(Math.random() * 20),
        upvotedBy: [reportedBy._id], // Reporter upvoted their own incident
        viewCount: Math.floor(Math.random() * 100),
        // Add verification/resolution data for completed incidents
        ...(incidentData.status === 'verified' && {
          verifiedBy: users[1]._id, // Moderator
          verifiedAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000)
        }),
        ...(incidentData.status === 'resolved' && {
          verifiedBy: users[1]._id, // Moderator
          verifiedAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
          resolvedBy: users[0]._id, // Admin
          resolvedAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
        })
      });
      
      incidents.push(incident);
    }
    
    const createdIncidents = await Incident.insertMany(incidents);
    console.log(`✅ Created ${createdIncidents.length} incidents`);
    
    return createdIncidents;
  } catch (error) {
    console.error('Error seeding incidents:', error);
    throw error;
  }
};

const seedAlerts = async (users, incidents) => {
  try {
    console.log('🚨 Seeding alerts...');
    
    const alerts = [];
    
    // Create alerts for some incidents
    for (let i = 0; i < Math.min(incidents.length, 10); i++) {
      const incident = incidents[i];
      const user = users[(i + 1) % users.length]; // Different user than reporter
      
      const alert = new Alert({
        incident: incident._id,
        user: user._id,
        type: 'incident',
        priority: incident.severity === 'critical' ? 'critical' : 
                 incident.severity === 'high' ? 'high' : 'medium',
        title: `${incident.type.charAt(0).toUpperCase() + incident.type.slice(1)} Alert`,
        message: `${incident.title} reported nearby`,
        location: {
          type: 'Point',
          coordinates: incident.location.coordinates,
          address: incident.location.address,
          radius: 5000
        },
        status: Math.random() > 0.5 ? 'active' : 'read',
        actions: [
          {
            type: 'navigate',
            label: 'Navigate',
            data: {
              destination: incident.location.coordinates,
              address: incident.location.address
            }
          },
          {
            type: 'dismiss',
            label: 'Dismiss',
            data: {}
          }
        ],
        metadata: {
          distance: Math.floor(Math.random() * 5000),
          estimatedImpact: incident.severity === 'critical' ? 'high' : 'medium'
        },
        createdAt: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000)
      });
      
      alerts.push(alert);
    }
    
    // Create some system alerts
    const systemAlerts = [
      {
        user: users[0]._id,
        type: 'system',
        priority: 'low',
        title: 'Welcome to RoadAlert',
        message: 'Thank you for joining RoadAlert. Help keep our roads safe by reporting incidents.',
        status: 'read',
        actions: [
          {
            type: 'dismiss',
            label: 'Got it',
            data: {}
          }
        ]
      },
      {
        user: users[2]._id,
        type: 'update',
        priority: 'medium',
        title: 'App Update Available',
        message: 'A new version of RoadAlert is available with improved features and bug fixes.',
        status: 'active',
        actions: [
          {
            type: 'dismiss',
            label: 'Later',
            data: {}
          }
        ]
      }
    ];
    
    systemAlerts.forEach(alertData => {
      alerts.push(new Alert({
        ...alertData,
        createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
      }));
    });
    
    const createdAlerts = await Alert.insertMany(alerts);
    console.log(`✅ Created ${createdAlerts.length} alerts`);
    
    return createdAlerts;
  } catch (error) {
    console.error('Error seeding alerts:', error);
    throw error;
  }
};

const updateUserStats = async (users, incidents) => {
  try {
    console.log('📊 Updating user statistics...');
    
    for (const user of users) {
      const userIncidents = incidents.filter(inc => inc.reportedBy.toString() === user._id.toString());
      const totalUpvotes = userIncidents.reduce((sum, inc) => sum + inc.upvotes, 0);
      const verifiedCount = userIncidents.filter(inc => inc.status === 'verified' || inc.status === 'resolved').length;
      const resolvedCount = userIncidents.filter(inc => inc.status === 'resolved').length;
      
      user.stats.reportsSubmitted = userIncidents.length;
      user.stats.upvotesReceived = totalUpvotes;
      
      // Update moderator stats
      if (user.permissions.includes('verify')) {
        const verifiedByUser = incidents.filter(inc => 
          inc.verifiedBy && inc.verifiedBy.toString() === user._id.toString()
        ).length;
        user.stats.reportsVerified = verifiedByUser;
      }
      
      // Update admin stats
      if (user.permissions.includes('resolve')) {
        const resolvedByUser = incidents.filter(inc => 
          inc.resolvedBy && inc.resolvedBy.toString() === user._id.toString()
        ).length;
        user.stats.reportsResolved = resolvedByUser;
      }
      
      // Calculate reputation
      user.calculateReputation();
      await user.save();
    }
    
    console.log('✅ User statistics updated');
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    
    // Clear existing data
    await clearDatabase();
    
    // Seed data
    const users = await seedUsers();
    const incidents = await seedIncidents(users);
    const alerts = await seedAlerts(users, incidents);
    
    // Update user statistics
    await updateUserStats(users, incidents);
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   📍 Incidents: ${incidents.length}`);
    console.log(`   🚨 Alerts: ${alerts.length}`);
    
    console.log('\n🔐 Test Accounts:');
    console.log('   Admin: admin@roadalert.com / Admin123!');
    console.log('   Moderator: moderator@roadalert.com / Mod123!');
    console.log('   User: user1@example.com / User123!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
