import { create } from 'zustand';
import { mockAlerts } from '@/mocks/alerts';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALERTS_STORAGE_KEY = '@alerts';

export const useAlertsStore = create((set, get) => ({
  alerts: [],
  isLoading: false,
  error: null,
  lastSynced: null,
  
  fetchAlerts: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Check for cached alerts
      const cachedData = await AsyncStorage.getItem(ALERTS_STORAGE_KEY);
      if (cachedData) {
        const { alerts, timestamp } = JSON.parse(cachedData);
        set({ alerts, lastSynced: timestamp });
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Add additional fields to mock alerts
      const enhancedAlerts = mockAlerts.map(alert => ({
        ...alert,
        type: alert.type || 'incident', // 'incident', 'emergency', 'update'
        priority: alert.priority || 'medium', // 'low', 'medium', 'high'
        radius: alert.radius || 5000, // meters
        expiresAt: alert.expiresAt || Date.now() + 1000 * 60 * 60 * 24, // 24 hours
        location: alert.location || null,
        actions: alert.actions || []
      }));

      // Update cache
      const timestamp = Date.now();
      await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify({
        alerts: enhancedAlerts,
        timestamp
      }));
      
      set({ 
        alerts: enhancedAlerts,
        isLoading: false,
        lastSynced: timestamp
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
      
      const updatedAlerts = get().alerts.map(alert => 
        alert.id === id 
          ? { ...alert, read: true, updatedAt: Date.now() }
          : alert
      );
      
      set({ alerts: updatedAlerts });

      // Update cache
      await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify({
        alerts: updatedAlerts,
        timestamp: Date.now()
      }));
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
      
      const updatedAlerts = get().alerts.map(alert => ({ 
        ...alert, 
        read: true,
        updatedAt: Date.now()
      }));
      
      set({ alerts: updatedAlerts });

      // Update cache
      await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify({
        alerts: updatedAlerts,
        timestamp: Date.now()
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to mark all alerts as read'
      });
    }
  },

  deleteAlert: async (id) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const updatedAlerts = get().alerts.filter(alert => alert.id !== id);
      set({ alerts: updatedAlerts });

      // Update cache
      await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify({
        alerts: updatedAlerts,
        timestamp: Date.now()
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete alert'
      });
    }
  },

  clearExpiredAlerts: async () => {
    try {
      const now = Date.now();
      const updatedAlerts = get().alerts.filter(alert => 
        !alert.expiresAt || alert.expiresAt > now
      );
      
      set({ alerts: updatedAlerts });

      // Update cache
      await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify({
        alerts: updatedAlerts,
        timestamp: now
      }));
    } catch (error) {
      console.error('Error clearing expired alerts:', error);
    }
  }
})); 