import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/utils/config';

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

      // Real API call
      const { token } = require('./auth-store').useAuthStore.getState();
      
      const response = await fetch(`${API_URL}/api/alerts`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch alerts');
      }
      
      const alerts = data.data.alerts || [];

      // Update cache
      const timestamp = Date.now();
      await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify({
        alerts,
        timestamp
      }));
      
      set({ 
        alerts,
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
      // Real API call to mark alert as read
      const { token } = require('./auth-store').useAuthStore.getState();
      
      const response = await fetch(`${API_URL}/api/alerts/${id}/read`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
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
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to mark alert as read'
      });
    }
  },
  
  markAllAsRead: async () => {
    try {
      // Real API call to mark all alerts as read
      const { token } = require('./auth-store').useAuthStore.getState();
      const alertIds = get().alerts.filter(alert => !alert.read).map(alert => alert.id);
      
      if (alertIds.length === 0) return;
      
      const response = await fetch(`${API_URL}/api/alerts/bulk/read`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ alertIds })
      });
      
      if (response.ok) {
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
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to mark all alerts as read'
      });
    }
  },

  deleteAlert: async (id) => {
    try {
      // Real API call to delete alert
      const { token } = require('./auth-store').useAuthStore.getState();
      
      const response = await fetch(`${API_URL}/api/alerts/${id}/dismiss`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const updatedAlerts = get().alerts.filter(alert => alert.id !== id);
        set({ alerts: updatedAlerts });

        // Update cache
        await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify({
          alerts: updatedAlerts,
          timestamp: Date.now()
        }));
      }
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