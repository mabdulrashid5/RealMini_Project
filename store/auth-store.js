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

// Validation helpers
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

const store = (set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    
    try {
      // Input validation
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

      if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      set({ 
        user: mockUser,
        isAuthenticated: true,
        isLoading: false
      });
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
      // Input validation
      if (!name || !email || !password) {
        throw new Error('Please fill in all fields');
      }

      if (name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }

      if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      if (!isValidPassword(password)) {
        throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number');
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      set({ 
        user: { ...mockUser, name, email },
        isAuthenticated: true,
        isLoading: false
      });
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
      isAuthenticated: false,
      error: null
    });
  },
  
  clearError: () => {
    set({ error: null });
  },
  
  updateUser: (user) => {
    set({ user });
  },

  requestPasswordReset: async (email) => {
    set({ isLoading: true, error: null });
    
    try {
      if (!email) {
        throw new Error('Please enter your email address');
      }

      if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, always succeed
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Password reset request failed',
        isLoading: false
      });
      return false;
    }
  }
});

export const useAuthStore = create()(
  persist(store, {
    name: 'auth-storage',
    storage: createJSONStorage(() => AsyncStorage)
  })
); 