import { create } from 'zustand';
import { mockAlerts } from '@/mocks/alerts';

export const useAlertsStore = create((set, get) => ({
  alerts: [],
  isLoading: false,
  error: null,
  
  fetchAlerts: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      
      set({ 
        alerts: mockAlerts,
        isLoading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch alerts',
        isLoading: false
      });
    }
  },
  
  markAsRead: async (id) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      set({
        alerts: get().alerts.map(alert => 
          alert.id === id 
            ? { ...alert, read: true }
            : alert
        )
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to mark alert as read'
      });
    }
  },
  
  markAllAsRead: async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      set({
        alerts: get().alerts.map(alert => ({ ...alert, read: true }))
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to mark all alerts as read'
      });
    }
  }
})); 