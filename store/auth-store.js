import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock user for demo purposes
const mockUser = {
  id: 'user1',
  name: 'Abdul Rashid',
  email: 'abdul@example.com',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80'
};

const store = (set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo, accept any credentials
      if (email && password) {
        set({ 
          user: mockUser,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false
      });
    }
  },
  
  signup: async (name, email, password) => {
    set({ isLoading: true, error: null });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (name && email && password) {
        set({ 
          user: { ...mockUser, name, email },
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        throw new Error('Please fill all required fields');
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Signup failed',
        isLoading: false
      });
    }
  },
  
  logout: () => {
    set({ 
      user: null,
      isAuthenticated: false
    });
  },
  
  clearError: () => {
    set({ error: null });
  },
  
  updateUser: (user) => {
    set({ user });
  }
});

export const useAuthStore = create()(
  persist(store, {
    name: 'auth-storage',
    storage: createJSONStorage(() => AsyncStorage)
  })
); 