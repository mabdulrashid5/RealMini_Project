export const mockIncidents = [
  {
    id: '1',
    type: 'accident',
    title: 'Car collision',
    description: 'Two vehicles involved in a collision. Traffic moving slowly.',
    location: {
      latitude: 5.6037,
      longitude: -0.1870,
      address: 'Ring Road Central, Accra'
    },
    images: ['https://images.unsplash.com/photo-1566474557233-c4e5e0e72d1a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'],
    reportedBy: 'user1',
    reportedAt: Date.now() - 1000 * 60 * 15, // 15 minutes ago
    status: 'verified',
    verifiedBy: 'moderator1',
    verifiedAt: Date.now() - 1000 * 60 * 10,
    upvotes: 5
  },
  {
    id: '2',
    type: 'hazard',
    title: 'Large pothole',
    description: 'Deep pothole in the right lane causing vehicles to swerve.',
    location: {
      latitude: 5.6142,
      longitude: -0.1964,
      address: 'Liberation Road, Accra'
    },
    reportedBy: 'user1',
    reportedAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
    status: 'pending',
    upvotes: 3
  },
  {
    id: '3',
    type: 'violation',
    title: 'Reckless driving',
    description: 'Taxi driver overtaking dangerously and running red lights.',
    location: {
      latitude: 5.6292,
      longitude: -0.1761,
      address: 'Spintex Road, Accra'
    },
    images: ['https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'],
    reportedBy: 'user3',
    reportedAt: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    status: 'verified',
    upvotes: 8
  },
  {
    id: '4',
    type: 'hazard',
    title: 'Fallen tree',
    description: 'Tree blocking half the road after last night\'s storm.',
    location: {
      latitude: 5.6505,
      longitude: -0.1856,
      address: 'Legon Road, Accra'
    },
    reportedBy: 'user4',
    reportedAt: Date.now() - 1000 * 60 * 120, // 2 hours ago
    status: 'resolved',
    upvotes: 12
  },
  {
    id: '5',
    type: 'accident',
    title: 'Motorcycle accident',
    description: 'Motorcycle and car collision. Ambulance on scene.',
    location: {
      latitude: 5.6192,
      longitude: -0.2164,
      address: 'Graphic Road, Accra'
    },
    reportedBy: 'user5',
    reportedAt: Date.now() - 1000 * 60 * 45, // 45 minutes ago
    status: 'verified',
    upvotes: 7
  }
]; 