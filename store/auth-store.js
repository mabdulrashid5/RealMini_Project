import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const createAuthStore = (set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  token: null,
  refreshToken: null,

  // Initialize auth state from storage
  initializeAuth: async () => {
    try {
      const storedToken = await AsyncStorage.getItem('@auth_token');
      const storedRefreshToken = await AsyncStorage.getItem('@refresh_token');
      
      if (storedToken) {
        set({ token: storedToken, refreshToken: storedRefreshToken, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
    }
  },
  
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
      
      // Real API call
      const response = await fetch(`${require('@/utils/config').API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      const { user, token, refreshToken } = data.data;
      
      set({ 
        user: {
          id: user.id,
          name: user.profile.name,
          email: user.email,
          avatar: user.profile.avatar,
          role: user.permissions.includes('admin') ? 'admin' : 
                user.permissions.includes('moderate') ? 'moderator' : 'user',
          permissions: user.permissions,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
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

  refreshAuthToken: async () => {
    try {
      const currentRefreshToken = get().refreshToken;
      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${require('@/utils/config').API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Token refresh failed');
      }

      const { token, refreshToken } = data.data;
      
      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@refresh_token', refreshToken);
      
      set({ token, refreshToken });
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear auth state on refresh failure
      get().logout();
      throw error;
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
      
      // Real API call
      const response = await fetch(`${require('@/utils/config').API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password,
          profile: { name }
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      const { user, token, refreshToken } = data.data;
      
      set({ 
        user: {
          id: user.id,
          name: user.profile.name,
          email: user.email,
          avatar: user.profile.avatar,
          role: user.permissions.includes('admin') ? 'admin' : 
                user.permissions.includes('moderate') ? 'moderator' : 'user',
          permissions: user.permissions,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
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

      // Real API call to refresh token
      const response = await fetch(`${require('@/utils/config').API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to refresh session');
      }

      const { token: newToken, refreshToken: newRefreshToken } = data.data;

      set({ token: newToken });
      await AsyncStorage.setItem('@auth_token', newToken);
      if (newRefreshToken) {
        await AsyncStorage.setItem('@refresh_token', newRefreshToken);
      }

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
      const { token } = get();
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      // Real API call to update profile
      const response = await fetch(`${require('@/utils/config').API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profile: {
            name: userData.name
          }
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Profile update failed');
      }
      
      // Update local state with new user data
      set({ user: { ...get().user, ...userData } });
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      set({ error: error.message });
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

      // Real API call for password reset
      const response = await fetch(`${require('@/utils/config').API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Password reset request failed');
      }
      
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
      console.log('Starting account deletion process');
      if (!password) {
        throw new Error('Please enter your password to confirm account deletion');
      }

      const state = get();
      console.log('Current auth state:', { isAuthenticated: state.isAuthenticated, hasToken: !!state.token });
      if (!state.token) {
        throw new Error('No authentication token available');
      }
      
      console.log('Making delete request to backend');
      const apiUrl = require('@/utils/config').API_URL;
      console.log('API URL:', apiUrl);
      // Log the complete URL for debugging
      const completeUrl = `${apiUrl}/api/auth/account`;
      console.log('Complete URL:', completeUrl);
      const response = await fetch(completeUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ password })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete account');
      }
      
      if (data.success) {
        // Clear all stored data after successful deletion
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
      }
      throw new Error('Failed to delete account');
      
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

      const { token } = get();
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Real API call to change password
      const response = await fetch(`${require('@/utils/config').API_URL}/api/auth/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Password change failed');
      }
      
      // Update tokens after password change
      if (data.data && data.data.token) {
        await AsyncStorage.setItem('@auth_token', data.data.token);
        await AsyncStorage.setItem('@refresh_token', data.data.refreshToken);
        set({ 
          token: data.data.token, 
          refreshToken: data.data.refreshToken,
          isLoading: false 
        });
      } else {
        set({ isLoading: false });
      }
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

export const useAuthStore = create(
  persist(
    createAuthStore,
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
); 