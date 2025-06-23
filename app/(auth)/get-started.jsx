import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { Shield, AlertTriangle, Users, Navigation } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

const Feature = ({ icon: Icon, title, description, delay }) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.featureItem,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.featureIcon}>
        <Icon size={20} color={colors.primary} strokeWidth={2.5} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription} numberOfLines={2}>
          {description}
        </Text>
      </View>
    </Animated.View>
  );
};

export default function GetStartedScreen() {
  const logoScale = React.useRef(new Animated.Value(0.8)).current;
  const titleOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.end]}
        style={styles.gradient}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Animated.View 
            style={[
              styles.logoContainer,
              { transform: [{ scale: logoScale }] },
            ]}
          >
            <View style={styles.logo}>
              <Navigation size={24} color="#FFF" strokeWidth={2.5} />
            </View>
            <Text style={styles.appName}>RoadWatch</Text>
          </Animated.View>

          <Animated.View style={{ opacity: titleOpacity }}>
            <Text style={styles.heroTitle}>
              Your Safety{'\n'}
              Our Priority
            </Text>
            <Text style={styles.heroSubtitle} numberOfLines={2}>
              Join our community of vigilant road users making travel safer for everyone
            </Text>
          </Animated.View>
        </View>

        {/* Features Section */}
        <View style={styles.card}>
          <View style={styles.features}>
            <Feature
              icon={AlertTriangle}
              title="Real-time Incident Reporting"
              description="Report and view road incidents as they happen"
              delay={200}
            />
            <Feature
              icon={Shield}
              title="Emergency Assistance"
              description="Quick access to emergency services when needed"
              delay={400}
            />
            <Feature
              icon={Users}
              title="Community Updates"
              description="Stay informed with local road conditions"
              delay={600}
            />
          </View>

          <View style={styles.actions}>
            <Button
              title="Get Started"
              onPress={() => router.push('/(auth)')}
              variant="primary"
              size="large"
              style={styles.button}
            />
            
            <TouchableOpacity 
              style={styles.termsContainer}
              onPress={() => {/* Handle terms */}}
            >
              <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Text style={styles.termsLink}>Terms & Conditions</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  hero: {
    height: height * 0.38,
    paddingTop: Platform.OS === 'ios' ? height * 0.06 : height * 0.08,
    paddingHorizontal: 24,
    paddingBottom: height * 0.04,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallDevice ? 20 : 28,
  },
  logo: {
    width: isSmallDevice ? 44 : 48,
    height: isSmallDevice ? 44 : 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  appName: {
    color: '#FFF',
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: '700',
    marginLeft: 16,
    letterSpacing: -0.5,
  },
  heroTitle: {
    fontSize: isSmallDevice ? 36 : 40,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: isSmallDevice ? 12 : 16,
    lineHeight: isSmallDevice ? 44 : 48,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: isSmallDevice ? 15 : 16,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: isSmallDevice ? 22 : 24,
    letterSpacing: -0.2,
    paddingRight: width * 0.15,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  features: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: isSmallDevice ? 8 : 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallDevice ? 16 : 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: isSmallDevice ? 12 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  featureIcon: {
    width: isSmallDevice ? 40 : 44,
    height: isSmallDevice ? 40 : 44,
    borderRadius: 12,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: isSmallDevice ? 16 : 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  featureDescription: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#666',
    lineHeight: isSmallDevice ? 18 : 20,
    letterSpacing: -0.2,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: isSmallDevice ? 16 : 20,
  },
  button: {
    width: '100%',
  },
  termsContainer: {
    marginTop: isSmallDevice ? 12 : 16,
    alignItems: 'center',
  },
  termsText: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: isSmallDevice ? 16 : 18,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
}); 