export const mockAlerts = [
  {
    id: '1',
    incidentId: '1',
    title: 'Accident Nearby',
    message: 'Car collision reported 1.2km ahead on Ring Road Central',
    createdAt: Date.now() - 1000 * 60 * 10, // 10 minutes ago
    read: false
  },
  {
    id: '2',
    incidentId: '2',
    title: 'Hazard Alert',
    message: 'Large pothole reported on Liberation Road',
    createdAt: Date.now() - 1000 * 60 * 55, // 55 minutes ago
    read: true
  },
  {
    id: '3',
    incidentId: '3',
    title: 'Traffic Violation',
    message: 'Reckless driving reported on Spintex Road',
    createdAt: Date.now() - 1000 * 60 * 25, // 25 minutes ago
    read: false
  },
  {
    id: '4',
    incidentId: '4',
    title: 'Road Obstruction',
    message: 'Fallen tree blocking Legon Road',
    createdAt: Date.now() - 1000 * 60 * 115, // 1 hour 55 minutes ago
    read: true
  },
  {
    id: '5',
    incidentId: '5',
    title: 'Accident Alert',
    message: 'Motorcycle accident reported on Graphic Road',
    createdAt: Date.now() - 1000 * 60 * 40, // 40 minutes ago
    read: false
  }
]; 