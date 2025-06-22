import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';

export default function SignupScreen() {
  const router = useRouter();
  const { signup, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Clear any previous errors when component mounts
  useEffect(() => {
    clearError();
  }, []);
  
  // If user is already authenticated, redirect to main app
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }
  
  const handleSignup = async () => {
    await signup(name, email, password);
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const handleLogin = () => {
    router.push('/login');
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join our community to help make roads safer for everyone
            </Text>
          </View>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              leftIcon={<User size={20} color={colors.textSecondary} />}
            />
            
            <Input
              label="Email"
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              leftIcon={<Mail size={20} color={colors.textSecondary} />}
            />
            
            <Input
              label="Password"
              placeholder="Create a password"
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
            />
            
            <Text style={styles.passwordHint}>
              Password should be at least 8 characters
            </Text>
            
            <Button
              title="Sign Up"
              onPress={handleSignup}
              variant="primary"
              size="large"
              loading={isLoading}
              disabled={!name || !email || !password || password.length < 8}
              style={styles.button}
            />
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={handleLogin}>
              <Text style={styles.footerLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#FFEEEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  form: {
    marginBottom: 24,
  },
  passwordHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginLeft: 16,
  },
  button: {
    marginTop: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 4,
  },
}); 