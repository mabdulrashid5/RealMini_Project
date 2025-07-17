import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock user for demo purposes
const mockUser = {
  id: 'user1',
  name: 'Abdul Rashid',
  email: 'abdul@example.com',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
  role: 'user', // 'user', 'moderator', 'admin'
  permissions: ['report:create', 'report:read', 'report:update'],
  createdAt: Date.now(),
  lastLoginAt: Date.now()
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

const store = (set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  token: null,
  refreshToken: null,
  
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
      
      // Mock tokens
      const token = 'mock_jwt_token';
      const refreshToken = 'mock_refresh_token';
      
      set({ 
        user: {
          ...mockUser,
          lastLoginAt: Date.now()
        },
        isAuthenticated: true,
        isLoading: false,
        token,
        refreshToken
      });

      // Store tokens in secure storage
      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@refresh_token', refreshToken);
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
      
      // Mock tokens
      const token = 'mock_jwt_token';
      const refreshToken = 'mock_refresh_token';
      
      set({ 
        user: {
          ...mockUser,
          name,
          email,
          createdAt: Date.now(),
          lastLoginAt: Date.now()
        },
        isAuthenticated: true,
        isLoading: false,
        token,
        refreshToken
      });

      // Store tokens in secure storage
      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@refresh_token', refreshToken);
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Signup failed',
        isLoading: false
      });
    }
  },
  
  logout: async () => {
    try {
      // Clear tokens from storage
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@refresh_token');
      
      set({ 
        user: null,
        isAuthenticated: false,
        error: null,
        token: null,
        refreshToken: null
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  },
  
  refreshSession: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('@refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token found');
      }

      // Simulate API call to refresh token
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock new token
      const newToken = 'new_mock_jwt_token';
      
      set({ token: newToken });
      await AsyncStorage.setItem('@auth_token', newToken);
      
      return true;
    } catch (error) {
      console.error('Error refreshing session:', error);
      // If refresh fails, log out the user
      get().logout();
      return false;
    }
  },
  
  hasPermission: (permission) => {
    const { user } = get();
    return user?.permissions?.includes(permission) || false;
  },
  
  clearError: () => {
    set({ error: null });
  },
  
  updateUser: async (userData) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      set({ user: userData });
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
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
      
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Password reset request failed',
        isLoading: false
      });
      return false;
    }
  },

  deleteAccount: async (password) => {
    set({ isLoading: true, error: null });
    
    try {
      if (!password) {
        throw new Error('Please enter your password to confirm account deletion');
      }

      // Simulate API call to verify password and delete account
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Clear all stored data
      await AsyncStorage.clear();
      
      set({ 
        user: null,
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        isLoading: false,
        error: null
      });
      
      return true;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Account deletion failed',
        isLoading: false
      });
      return false;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ isLoading: true, error: null });
    
    try {
      if (!currentPassword || !newPassword) {
        throw new Error('Please fill in all fields');
      }

      if (!isValidPassword(newPassword)) {
        throw new Error('New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number');
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Password change failed',
        isLoading: false
      });
      return false;
    }
  },

  setup2FA: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Simulate API call to generate 2FA secret
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock 2FA secret and QR code
      const twoFactorSecret = 'ABCDEFGHIJKLMNOP';
      const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?data=otpauth://totp/RoadWatch:user@example.com?secret=' + twoFactorSecret;
      
      set({ isLoading: false });
      return { secret: twoFactorSecret, qrCode: qrCodeUrl };
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '2FA setup failed',
        isLoading: false
      });
      return null;
    }
  },

  verify2FA: async (code) => {
    set({ isLoading: true, error: null });
    
    try {
      if (!code) {
        throw new Error('Please enter the verification code');
      }

      // Simulate API call to verify 2FA code
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '2FA verification failed',
        isLoading: false
      });
      return false;
    }
  }
});

export const useAuthStore = create()(
  persist(store, {
    name: 'auth-storage',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
      // Don't persist sensitive data
      token: undefined,
      refreshToken: undefined,
      error: undefined,
      isLoading: undefined,
    }),
  })
); 