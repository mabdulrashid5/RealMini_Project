import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { colors } from '@/constants/colors';

const { width, height } = Dimensions.get('window');

export default function CustomSplashScreen({ onComplete }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 2,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide splash screen after animation
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.roads}>
          <View style={[styles.road, { transform: [{ translateY: -50 }] }]} />
          <View style={styles.road} />
          <View style={[styles.road, { transform: [{ translateY: 50 }] }]} />
        </View>
        <View style={styles.eye}>
          <View style={styles.pupil} />
        </View>
        <View style={styles.alertDot} />
      </Animated.View>
      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>ROAD WATCH</Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>Your Safety Companion</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: width * 0.4,
    height: width * 0.4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  roads: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  road: {
    width: '80%',
    height: 6,
    backgroundColor: 'white',
    borderRadius: 3,
    marginVertical: 20,
  },
  eye: {
    width: width * 0.15,
    height: width * 0.15,
    borderRadius: width * 0.075,
    borderWidth: 6,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: width * 0.05,
    height: width * 0.05,
    borderRadius: width * 0.025,
    backgroundColor: 'white',
  },
  alertDot: {
    position: 'absolute',
    top: -width * 0.025,
    width: width * 0.05,
    height: width * 0.05,
    borderRadius: width * 0.025,
    backgroundColor: colors.warning,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: width * 0.04,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
