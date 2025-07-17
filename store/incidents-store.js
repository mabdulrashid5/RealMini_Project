import { create } from 'zustand';
import { mockIncidents } from '@/mocks/incidents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './auth-store';

const INCIDENTS_STORAGE_KEY = '@incidents';
const PENDING_ACTIONS_KEY = '@pending_actions';

const store = (set, get) => ({
  incidents: [],
  isLoading: false,
  error: null,
  lastSynced: null,
  pendingActions: [], // For offline support
  
  fetchIncidents: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Check for cached incidents
      const cachedData = await AsyncStorage.getItem(INCIDENTS_STORAGE_KEY);
      if (cachedData) {
        const { incidents, timestamp } = JSON.parse(cachedData);
        set({ incidents, lastSynced: timestamp });
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update cache
      const timestamp = Date.now();
      await AsyncStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify({
        incidents: mockIncidents,
        timestamp
      }));
      
      set({ 
        incidents: mockIncidents,
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
      const newIncident = {
        id: `incident-${Date.now()}`,
        ...incidentData,
        reportedAt: Date.now(),
        updatedAt: Date.now(),
        status: 'pending',
        upvotes: 0,
        verifiedBy: null,
        verifiedAt: null,
        resolvedBy: null,
        resolvedAt: null,
        severity: 'medium',
        comments: []
      };

      // Check if online
      const isOnline = await checkOnlineStatus();
      
      if (isOnline) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        set({ 
          incidents: [newIncident, ...get().incidents],
          isLoading: false
        });

        // Update cache
        await updateCache(get().incidents);
      } else {
        // Store in pending actions
        const pendingActions = [...get().pendingActions, {
          type: 'CREATE',
          data: newIncident,
          timestamp: Date.now()
        }];
        
        await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(pendingActions));
        set({
          incidents: [newIncident, ...get().incidents],
          pendingActions,
          isLoading: false
        });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to report incident',
        isLoading: false
      });
    }
  },
  
  upvoteIncident: async (id) => {
    try {
      const isOnline = await checkOnlineStatus();
      
      if (isOnline) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const updatedIncidents = get().incidents.map((incident) => 
          incident.id === id 
            ? { ...incident, upvotes: incident.upvotes + 1, updatedAt: Date.now() }
            : incident
        );
        
        set({ incidents: updatedIncidents });
        await updateCache(updatedIncidents);
      } else {
        // Store in pending actions
        const pendingActions = [...get().pendingActions, {
          type: 'UPVOTE',
          data: { id },
          timestamp: Date.now()
        }];
        
        await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(pendingActions));
        set({
          incidents: get().incidents.map((incident) => 
            incident.id === id 
              ? { ...incident, upvotes: incident.upvotes + 1, updatedAt: Date.now() }
              : incident
          ),
          pendingActions
        });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to upvote incident'
      });
    }
  },
  
  resolveIncident: async (id) => {
    try {
      const isOnline = await checkOnlineStatus();
      const { user } = useAuthStore.getState();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (isOnline) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const updatedIncidents = get().incidents.map((incident) => 
          incident.id === id 
            ? { 
                ...incident, 
                status: 'resolved',
                resolvedBy: user.id,
                resolvedAt: Date.now(),
                updatedAt: Date.now()
              }
            : incident
        );
        
        set({ incidents: updatedIncidents });
        await updateCache(updatedIncidents);
      } else {
        // Store in pending actions
        const pendingActions = [...get().pendingActions, {
          type: 'RESOLVE',
          data: { id },
          timestamp: Date.now()
        }];
        
        await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(pendingActions));
        set({
          incidents: get().incidents.map((incident) => 
            incident.id === id 
              ? { 
                  ...incident, 
                  status: 'resolved',
                  resolvedBy: user.id,
                  resolvedAt: Date.now(),
                  updatedAt: Date.now()
                }
              : incident
          ),
          pendingActions
        });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to resolve incident'
      });
    }
  },

  addComment: async (id, comment) => {
    try {
      const isOnline = await checkOnlineStatus();
      const { user } = useAuthStore.getState();
      
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

      if (isOnline) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const updatedIncidents = get().incidents.map((incident) => 
          incident.id === id 
            ? { 
                ...incident, 
                comments: [...(incident.comments || []), newComment],
                updatedAt: Date.now()
              }
            : incident
        );
        
        set({ incidents: updatedIncidents });
        await updateCache(updatedIncidents);
      } else {
        // Store in pending actions
        const pendingActions = [...get().pendingActions, {
          type: 'ADD_COMMENT',
          data: { id, comment: newComment },
          timestamp: Date.now()
        }];
        
        await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(pendingActions));
        set({
          incidents: get().incidents.map((incident) => 
            incident.id === id 
              ? { 
                  ...incident, 
                  comments: [...(incident.comments || []), newComment],
                  updatedAt: Date.now()
                }
              : incident
          ),
          pendingActions
        });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add comment'
      });
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
    
    if (!user || !incidents.length) {
      return {
        totalReports: 0,
        verifiedReports: 0,
        totalUpvotes: 0
      };
    }

    const userIncidents = incidents.filter(incident => incident.reportedBy === user.id);
    
    return {
      totalReports: userIncidents.length,
      verifiedReports: userIncidents.filter(incident => incident.verifiedBy).length,
      totalUpvotes: userIncidents.reduce((total, incident) => total + (incident.upvotes || 0), 0)
    };
  }
});

// Helper functions
const checkOnlineStatus = async () => {
  // In a real app, implement proper online/offline detection
  return true;
};

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

export const useIncidentsStore = create()(store); 