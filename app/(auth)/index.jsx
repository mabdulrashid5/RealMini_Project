import React from 'react';
import { StyleSheet, View, Text, Image, SafeAreaView } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  // If user is already authenticated, redirect to main app
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }
  
  const handleLogin = () => {
    router.push('/login');
  };
  
  const handleSignup = () => {
    router.push('/signup');
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }} 
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        
        <Text style={styles.title}>Road Safety Reporter</Text>
        
        <Text style={styles.subtitle}>
          Report road incidents, hazards, and violations in real-time to help keep our roads safe.
        </Text>
        
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>🚨</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Report Incidents</Text>
              <Text style={styles.featureDescription}>
                Quickly report accidents, hazards, and traffic violations
              </Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>📍</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Location Tracking</Text>
              <Text style={styles.featureDescription}>
                Automatically capture your location for accurate reporting
              </Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>⚡</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Real-time Alerts</Text>
              <Text style={styles.featureDescription}>
                Get notified about incidents near your location
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Button
          title="Log In"
          onPress={handleLogin}
          variant="primary"
          size="large"
          style={styles.button}
        />
        
        <Button
          title="Sign Up"
          onPress={handleSignup}
          variant="outline"
          size="large"
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  features: {
    marginTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    paddingBottom: 36,
  },
  button: {
    marginBottom: 16,
    width: '100%',
  },
}); 