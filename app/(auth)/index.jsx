import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Redirect, router } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { GoogleIcon } from '@/components/GoogleIcon';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const TabButton = ({ title, isActive, onPress }) => (
  <TouchableOpacity 
    style={[styles.tabButton, isActive && styles.tabButtonActive]} 
    onPress={onPress}
  >
    <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
      {title}
    </Text>
  </TouchableOpacity>
);

const SocialButton = ({ icon: Icon, title, onPress }) => (
  <TouchableOpacity style={styles.socialButton} onPress={onPress}>
    <Icon size={20} />
    <Text style={styles.socialButtonText}>{title}</Text>
  </TouchableOpacity>
);

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, signup, isAuthenticated, isLoading, error } = useAuthStore();

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSubmit = async () => {
    if (activeTab === 'login') {
      await login(email, password);
    } else {
      if (password !== confirmPassword) {
        // You'll need to add error handling in your auth store
        return;
      }
      await signup(fullName, email, password);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.end]}
        style={styles.gradient}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Get Started now</Text>
          <Text style={styles.heroSubtitle}>Create an account or log in to explore about our app</Text>
        </View>

        {/* Auth Card */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.cardContainer}
        >
          <View style={styles.card}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Tab Switcher */}
              <View style={styles.tabContainer}>
                <TabButton 
                  title="Log In" 
                  isActive={activeTab === 'login'} 
                  onPress={() => setActiveTab('login')}
                />
                <TabButton 
                  title="Sign Up" 
                  isActive={activeTab === 'signup'} 
                  onPress={() => setActiveTab('signup')}
                />
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Form Fields */}
              <View style={styles.form}>
                {activeTab === 'signup' && (
                  <Input
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChangeText={setFullName}
                    leftIcon={<User size={20} color={colors.textSecondary} />}
                    containerStyle={styles.input}
                  />
                )}

                <Input
                  label="Email"
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  leftIcon={<Mail size={20} color={colors.textSecondary} />}
                  containerStyle={styles.input}
                />
                
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  leftIcon={<Lock size={20} color={colors.textSecondary} />}
                  rightIcon={
                    <TouchableOpacity onPress={togglePasswordVisibility}>
                      {showPassword ? (
                        <EyeOff size={20} color={colors.textSecondary} />
                      ) : (
                        <Eye size={20} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  }
                  containerStyle={styles.input}
                />

                {activeTab === 'signup' && (
                  <Input
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    leftIcon={<Lock size={20} color={colors.textSecondary} />}
                    rightIcon={
                      <TouchableOpacity onPress={toggleConfirmPasswordVisibility}>
                        {showConfirmPassword ? (
                          <EyeOff size={20} color={colors.textSecondary} />
                        ) : (
                          <Eye size={20} color={colors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    }
                    containerStyle={styles.input}
                  />
                )}

                {/* Remember Me & Forgot Password */}
                {activeTab === 'login' && (
                  <View style={styles.loginOptions}>
                    <TouchableOpacity 
                      style={styles.checkbox} 
                      onPress={() => setRememberMe(!rememberMe)}
                    >
                      <View style={[styles.checkboxBox, rememberMe && styles.checkboxChecked]}>
                        {rememberMe && <FontAwesome name="check" size={12} color="#FFF" />}
                      </View>
                      <Text style={styles.checkboxLabel}>Remember me</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                      <Text style={styles.forgotPassword}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Submit Button */}
                <Button
                  title={activeTab === 'login' ? "Log In" : "Sign Up"}
                  onPress={handleSubmit}
                  variant="primary"
                  size="large"
                  loading={isLoading}
                  style={styles.submitButton}
                />

                {/* Social Login */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <SocialButton
                  icon={GoogleIcon}
                  title="Continue with Google"
                  onPress={() => {}}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gradient.start,
  },
  gradient: {
    flex: 1,
  },
  hero: {
    paddingTop: height * 0.08,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
  },
  cardContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#F5F5F5',
    padding: 4,
    borderRadius: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFF',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  tabButtonTextActive: {
    color: '#000',
  },
  form: {
    marginTop: 8,
  },
  input: {
    marginBottom: 16,
    borderRadius: 12,
  },
  loginOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666666',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#666666',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#666',
  },
  forgotPassword: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    marginBottom: 24,
    width: '100%',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    height: 50,
    marginBottom: 12,
    width: '100%',
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
});