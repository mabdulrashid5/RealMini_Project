import { create } from 'zustand';
import { mockIncidents } from '@/mocks/incidents';

const store = (set, get) => ({
  incidents: [],
  isLoading: false,
  error: null,
  
  fetchIncidents: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      set({ 
        incidents: mockIncidents,
        isLoading: false
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newIncident = {
        id: `incident-${Date.now()}`,
        ...incidentData,
        reportedAt: Date.now(),
        status: 'pending',
        upvotes: 0
      };
      
      set({ 
        incidents: [newIncident, ...get().incidents],
        isLoading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to report incident',
        isLoading: false
      });
    }
  },
  
  upvoteIncident: async (id) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      set({
        incidents: get().incidents.map((incident) => 
          incident.id === id 
            ? { ...incident, upvotes: incident.upvotes + 1 }
            : incident
        )
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to upvote incident'
      });
    }
  },
  
  resolveIncident: async (id) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      set({
        incidents: get().incidents.map((incident) => 
          incident.id === id 
            ? { ...incident, status: 'resolved' }
            : incident
        )
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to resolve incident'
      });
    }
  }
});

export const useIncidentsStore = create()(store); 