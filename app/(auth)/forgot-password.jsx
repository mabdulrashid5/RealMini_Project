import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import { Mail } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate email
      if (!email) {
        throw new Error('Please enter your email address');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
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
          <Text style={styles.heroTitle}>Reset Password</Text>
          <Text style={styles.heroSubtitle}>
            Enter your email address and we'll send you instructions to reset your password
          </Text>
        </View>

        {/* Form Card */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.cardContainer}
        >
          <View style={styles.card}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {success ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successTitle}>Check your email</Text>
                  <Text style={styles.successText}>
                    We have sent password reset instructions to your email address.
                    Please check your inbox and follow the instructions.
                  </Text>
                  <Button
                    title="Back to Login"
                    onPress={() => router.back()}
                    variant="primary"
                    size="large"
                    style={styles.button}
                  />
                </View>
              ) : (
                <View style={styles.form}>
                  <Input
                    label="Email"
                    placeholder="Enter your email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    leftIcon={<Mail size={20} color={colors.textSecondary} />}
                    containerStyle={styles.input}
                  />

                  <Button
                    title="Send Reset Instructions"
                    onPress={handleResetPassword}
                    variant="primary"
                    size="large"
                    loading={isLoading}
                    style={styles.button}
                  />

                  <Button
                    title="Back to Login"
                    onPress={() => router.back()}
                    variant="secondary"
                    size="large"
                    style={[styles.button, styles.backButton]}
                  />
                </View>
              )}
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
  form: {
    marginTop: 8,
  },
  input: {
    marginBottom: 24,
    borderRadius: 12,
  },
  button: {
    width: '100%',
    marginBottom: 12,
  },
  backButton: {
    marginTop: 12,
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
  successContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F0FFF4',
    borderRadius: 8,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
}); 