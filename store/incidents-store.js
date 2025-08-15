import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/utils/config';
import { useAuthStore } from './auth-store';

const INCIDENTS_STORAGE_KEY = '@incidents';

const updateCache = async (incidents) => {
  try {
    await AsyncStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify({
      incidents,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error updating cache:', error);
  }
};

const store = (set, get) => ({
  incidents: [],
  isLoading: false,
  error: null,
  lastSynced: null,
  
  fetchIncidents: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Check for cached incidents
      const cachedData = await AsyncStorage.getItem(INCIDENTS_STORAGE_KEY);
      if (cachedData) {
        const { incidents, timestamp } = JSON.parse(cachedData);
        set({ incidents, lastSynced: timestamp });
      }

      const { token } = useAuthStore.getState();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Real API call with auth token
      const response = await fetch(`${API_URL}/api/incidents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      console.log('Backend response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch incidents');
      }
      
      // Transform incidents to have consistent coordinate format and ensure unique IDs
      const incidents = (data.data?.incidents || []).map(incident => {
        // Ensure we have a valid ID
        const id = incident._id || incident.id;
        if (!id) {
          console.error('Incident missing ID:', incident);
          return null;
        }
        
        console.log('Processing incident:', {
          id,
          type: incident.type,
          reportedBy: incident.reportedBy || incident.userId,
          upvotes: incident.upvotes
        });
        
        const coordinate = {
          latitude: incident.location.coordinates[1],
          longitude: incident.location.coordinates[0]
        };
        
        return {
          id: id,
          type: incident.type,
          title: incident.title,
          description: incident.description,
          location: coordinate,
          coordinate: coordinate,
          reportedAt: new Date(incident.createdAt).getTime(),
          status: incident.status || 'pending',
          upvotes: incident.upvotes || incident.upvotedBy || [],
          verified: Boolean(incident.verified),
          reportedBy: incident.reportedBy || incident.userId,
          address: incident.location.address || 'Unknown location'
        };
      }).filter(Boolean); // Remove any null entries
      
      console.log('Processed incidents:', incidents.map(inc => ({
        id: inc.id,
        reportedBy: inc.reportedBy,
        upvotes: inc.upvotes
      })));
      
      // Update cache
      const timestamp = Date.now();
      await AsyncStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify({
        incidents,
        timestamp
      }));
      
      set({ 
        incidents,
        isLoading: false,
        lastSynced: timestamp
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch incidents',
        isLoading: false
      });
    }
  },
  
  reportIncident: async (incidentData) => {
    set({ isLoading: true, error: null });
    
    try {
      // Check authentication
      const { token } = useAuthStore.getState();
      if (!token) {
        throw new Error('Not authenticated');
      }

      console.log('Starting incident report with data:', JSON.stringify(incidentData, null, 2));

      // Validate required fields
      if (!incidentData.type || !incidentData.title || !incidentData.description || !incidentData.location) {
        console.error('Missing required fields:', { 
          hasType: !!incidentData.type, 
          hasTitle: !!incidentData.title, 
          hasDescription: !!incidentData.description, 
          hasLocation: !!incidentData.location 
        });
        throw new Error('All fields are required');
      }

      // Validate incident type
      const validTypes = ['accident', 'hazard', 'violation'];
      if (!validTypes.includes(incidentData.type)) {
        console.error('Invalid incident type:', incidentData.type);
        throw new Error('Invalid incident type. Must be one of: accident, hazard, or others');
      }

      // Create a copy of the incident data to work with
      const payload = { ...incidentData };
      
      // If location is not in GeoJSON format, convert it
      if (!payload.location.type || !Array.isArray(payload.location.coordinates)) {
        console.log('Converting location to GeoJSON format');
        payload.location = {
          type: 'Point',
          coordinates: [
            parseFloat(incidentData.location.coordinates?.[0] ?? incidentData.location.longitude),
            parseFloat(incidentData.location.coordinates?.[1] ?? incidentData.location.latitude)
          ],
          address: incidentData.location.address || 'Unknown location'
        };
      }

      // Validate coordinates
      if (!Array.isArray(payload.location.coordinates) || 
          payload.location.coordinates.length !== 2 ||
          !payload.location.coordinates.every(coord => typeof coord === 'number' && !isNaN(coord))) {
        console.error('Invalid coordinates:', payload.location.coordinates);
        throw new Error('Invalid coordinates format');
      }

      console.log('Final payload:', JSON.stringify(payload, null, 2));

      // Log the API URL
      console.log('API URL:', `${API_URL}/api/incidents`);

      // Create incident
      const response = await fetch(`${API_URL}/api/incidents`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      // Log response status
      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('[DEBUG] Server response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create incident');
      }

      if (!data.data || !data.data.incident) {
        console.error('[ERROR] Invalid server response:', data);
        throw new Error('Invalid response from server');
      }

      const serverIncident = data.data.incident;
      const coordinate = {
        latitude: serverIncident.location.coordinates[1],
        longitude: serverIncident.location.coordinates[0]
      };
      
      const newIncident = {
        id: serverIncident._id,
        type: serverIncident.type,
        title: serverIncident.title,
        description: serverIncident.description,
        location: coordinate,  // For backwards compatibility
        coordinate: coordinate,  // For map markers
        reportedAt: new Date(serverIncident.createdAt).getTime(),
        status: serverIncident.status || 'pending',
        upvotes: []
      };

      const currentIncidents = get().incidents;
      set({
        incidents: [newIncident, ...currentIncidents],
        isLoading: false
      });

      // Update cache
      await updateCache([newIncident, ...currentIncidents]);

      return newIncident;
    } catch (error) {
      console.error('Error creating incident:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  upvoteIncident: async (incidentId) => {
    const state = get();
    const { token, user } = useAuthStore.getState();
    if (!token || !user) {
      throw new Error('Authentication required');
    }

    const userId = user.id;
    const incidents = state.incidents;

    // Find the incident
    const incident = incidents.find(i => i.id === incidentId);
    if (!incident) {
      throw new Error('Incident not found');
    }

    // Check if user has already upvoted (for array-based upvotes)
    if (Array.isArray(incident.upvotes) && incident.upvotes.includes(userId)) {
      throw new Error('You have already upvoted this incident');
    }

    // Store original incident state for rollback
    const originalIncident = { ...incident };

    try {
      // Make API call first before updating UI
      const response = await fetch(`${API_URL}/api/incidents/${incidentId}/upvote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Upvote response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upvote incident');
      }

      // Only update UI after successful API call
      set({
        incidents: incidents.map(inc =>
          inc.id === incidentId
            ? {
                ...inc,
                upvotes: typeof data.upvotes === 'number' ? data.upvotes :
                         Array.isArray(data.upvotes) ? data.upvotes :
                         Array.isArray(data.upvotedBy) ? data.upvotedBy :
                         typeof inc.upvotes === 'number' ? inc.upvotes + 1 :
                         Array.isArray(inc.upvotes) ? [...inc.upvotes, userId] :
                         [userId]
              }
            : inc
        )
      });

      // Trigger stats recalculation
      await useAuthStore.getState().recalculateUserStats?.();

      // Update cache
      await updateCache(get().incidents);

      return true;
    } catch (error) {
      console.error('Error upvoting incident:', error);
      
      // Revert optimistic update
      set({
        incidents: incidents,
        error: error.message
      });
      
      await updateCache(incidents);
      return false;
    }
  },
  
  // For compatibility with old code
  toggleUpvote: function(incidentId) {
    return this.upvoteIncident(incidentId);
  },

  
  resolveIncident: async (id) => {
    try {
      const { user, token } = useAuthStore.getState();
      const state = get();
      
      if (!user || !token) {
        throw new Error('Authentication required');
      }

      // Find the incident first
      const incident = state.incidents.find(inc => inc.id === id);
      if (!incident) {
        throw new Error('Incident not found');
      }

      // Store current state for rollback
      const originalIncidents = state.incidents;

      try {
        // Make API call first before updating UI
        const response = await fetch(`${API_URL}/incidents/${id}/resolve`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        console.log('Resolve response:', data);
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to resolve incident');
        }

        // Only update UI after successful API call
        set({
          isLoading: false,
          error: null,
          incidents: state.incidents.map(inc =>
            inc.id === id
              ? {
                  ...inc,
                  ...(data.incident || {}),
                  status: 'resolved',
                  resolvedBy: user.id,
                  resolvedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }
              : inc
          )
        });

        // Update cache with the new state
        await updateCache(get().incidents);
        return true;

      } catch (error) {
        // Revert to original state
        set({
          isLoading: false,
          error: error.message,
          incidents: originalIncidents
        });
        
        // Update cache with original state
        await updateCache(originalIncidents);
        throw error;
      }
    } catch (error) {
      console.error('Error resolving incident:', error);
      
      // Revert to original state on error
      set(state => ({
        isLoading: false,
        incidents: state.incidents.map(inc =>
          inc.id === id
            ? {
                ...inc,
                status: 'pending'
              }
            : inc
        ),
        error: error instanceof Error ? error.message : 'Failed to resolve incident'
      }));
      
      // Update cache with reverted state
      await updateCache(get().incidents);
      return false;
    }
  },

  addComment: async (id, comment) => {
    try {
      const { token, user } = useAuthStore.getState();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const newComment = {
        id: `comment-${Date.now()}`,
        text: comment,
        userId: user.id,
        userName: user.name,
        createdAt: Date.now()
      };

      const response = await fetch(`${API_URL}/api/incidents/${id}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: comment })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const updatedIncidents = get().incidents.map((incident) => 
        incident.id === id 
          ? { 
              ...incident, 
              comments: [...(incident.comments || []), newComment],
              updatedAt: Date.now()
            }
          : incident
      );
      
      await updateCache(updatedIncidents);
      set({ incidents: updatedIncidents });
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  syncPendingActions: async () => {
    const { pendingActions } = get();
    if (pendingActions.length === 0) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear pending actions
      await AsyncStorage.removeItem(PENDING_ACTIONS_KEY);
      set({ pendingActions: [] });
      
      // Update cache
      await updateCache(get().incidents);
    } catch (error) {
      console.error('Error syncing pending actions:', error);
    }
  },

  getUserStats: () => {
    const { incidents } = get();
    const { user } = useAuthStore.getState();
    
    console.log('Current user:', user);
    console.log('Available incidents:', incidents);
    
    if (!user || !incidents || !Array.isArray(incidents)) {
      console.log('No user or incidents data');
      return {
        totalReports: 0,
        verifiedReports: 0,
        totalUpvotes: 0,
        upvotedReports: 0
      };
    }

    try {
      // First, ensure we have the correct user ID format
      const userId = user.id?.toString();
      console.log('Calculating stats for user ID:', userId);
      console.log('Total incidents to process:', incidents.length);

      // Get incidents reported by the user
      const userIncidents = incidents.filter(incident => {
        // Get the reporter ID, handling different data structures
        const reporterId = incident.reportedBy?._id || // Object form
                          incident.reportedBy?.id || // Alternative object form
                          incident.reportedBy || // Direct ID string
                          incident.userId; // Fallback field
        
        const reporterIdStr = reporterId?.toString();
        console.log(`Comparing incident ${incident.id} reporter:`, reporterIdStr, 'with user:', userId);
        return reporterIdStr === userId;
      });
      
      console.log('Found user incidents:', userIncidents.length);
      userIncidents.forEach(inc => {
        console.log('User incident:', {
          id: inc.id,
          type: inc.type,
          upvotes: typeof inc.upvotes === 'number' ? inc.upvotes :
                   (Array.isArray(inc.upvotes) ? inc.upvotes.length :
                   (inc.upvotedBy && Array.isArray(inc.upvotedBy) ? inc.upvotedBy.length : 0))
        });
      });

      // Get incidents that the user has upvoted
      const userUpvotedIncidents = incidents.filter(incident => {
        if (typeof incident.upvotes === 'number') {
          // Can't determine if user upvoted when upvotes is just a number
          return false;
        }
        // Check both upvotes and upvotedBy arrays
        const upvotes = incident.upvotes || incident.upvotedBy || [];
        const upvoteArray = Array.isArray(upvotes) ? upvotes : [];
        return upvoteArray.some(upvoteId => {
          const upvoteIdStr = (typeof upvoteId === 'object' ? upvoteId._id : upvoteId)?.toString();
          return upvoteIdStr === userId;
        });
      });

      console.log('User upvoted incidents:', userUpvotedIncidents.length);
      
      // Calculate total upvotes received on user's reports
      const totalUpvotes = userIncidents.reduce((total, incident) => {
        // Handle both number and array cases
        const upvotesCount = typeof incident.upvotes === 'number' ? incident.upvotes :
                            (Array.isArray(incident.upvotes) ? incident.upvotes.length :
                            (incident.upvotedBy && Array.isArray(incident.upvotedBy) ? incident.upvotedBy.length : 0));
        console.log(`Incident ${incident.id} has ${upvotesCount} upvotes`);
        return total + upvotesCount;
      }, 0);

      const stats = {
        totalReports: userIncidents.length,
        verifiedReports: userIncidents.filter(incident => incident.verified === true).length,
        totalUpvotes,
        upvotedReports: userUpvotedIncidents.length
      };

      console.log('Final calculated stats:', stats);
      return stats;
    } catch (error) {
      console.error('Error calculating user stats:', error);
      return {
        totalReports: 0,
        verifiedReports: 0,
        totalUpvotes: 0,
        upvotedReports: 0
      };
    }
  }
});

export const useIncidentsStore = create()(store);