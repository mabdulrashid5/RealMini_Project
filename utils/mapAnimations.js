import { Animated, Easing } from 'react-native';

// Animation configurations for different scenarios
export const ANIMATION_CONFIGS = {
  SMOOTH: {
    duration: 1000,
    easing: Easing.out(Easing.cubic),
  },
  FAST: {
    duration: 500,
    easing: Easing.out(Easing.quad),
  },
  NAVIGATION: {
    duration: 1500,
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  }
};

// Smooth camera animation for map
export const animateToRegion = (mapRef, region, config = ANIMATION_CONFIGS.SMOOTH) => {
  if (!mapRef?.current) return;
  
  mapRef.current.animateToRegion(region, config.duration);
};

// Animate to show both points with padding
export const animateToShowBounds = (mapRef, coordinates, padding = 0.1) => {
  if (!mapRef?.current || !coordinates || coordinates.length === 0) return;

  const lats = coordinates.map(coord => coord.latitude);
  const lngs = coordinates.map(coord => coord.longitude);
  
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  
  const latDelta = (maxLat - minLat) * (1 + padding);
  const lngDelta = (maxLng - minLng) * (1 + padding);
  
  const region = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(latDelta, 0.01), // Minimum zoom level
    longitudeDelta: Math.max(lngDelta, 0.01),
  };
  
  animateToRegion(mapRef, region, ANIMATION_CONFIGS.SMOOTH);
};

// Navigation-specific camera animation
export const animateToNavigationView = (mapRef, location, heading = 0) => {
  if (!mapRef?.current || !location) return;
  
  mapRef.current.animateCamera({
    center: {
      latitude: location.latitude,
      longitude: location.longitude,
    },
    heading: heading,
    pitch: 60,
    zoom: 18,
  }, ANIMATION_CONFIGS.NAVIGATION.duration);
};

// Smooth zoom animation
export const animateZoom = (mapRef, location, zoomLevel = 15) => {
  if (!mapRef?.current || !location) return;
  
  const region = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.01 * (20 - zoomLevel), // Approximate delta for zoom level
    longitudeDelta: 0.01 * (20 - zoomLevel),
  };
  
  animateToRegion(mapRef, region, ANIMATION_CONFIGS.FAST);
};

// Animated value for smooth marker transitions
export const createMarkerAnimation = (initialValue = 0) => {
  const animatedValue = new Animated.Value(initialValue);
  
  const animate = (toValue, config = ANIMATION_CONFIGS.SMOOTH) => {
    Animated.timing(animatedValue, {
      toValue,
      duration: config.duration,
      easing: config.easing,
      useNativeDriver: true,
    }).start();
  };
  
  return { animatedValue, animate };
};

// Pulse animation for markers
export const createPulseAnimation = () => {
  const pulseAnim = new Animated.Value(1);
  
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };
  
  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };
  
  return { pulseAnim, startPulse, stopPulse };
};

// Smooth polyline drawing animation
export const animatePolylineDraw = (coordinates, onUpdate, duration = 2000) => {
  if (!coordinates || coordinates.length === 0) return;
  
  const animatedValue = new Animated.Value(0);
  
  const listener = animatedValue.addListener(({ value }) => {
    const index = Math.floor(value * (coordinates.length - 1));
    const visibleCoordinates = coordinates.slice(0, index + 1);
    onUpdate(visibleCoordinates);
  });
  
  Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: false,
  }).start(() => {
    animatedValue.removeListener(listener);
  });
  
  return animatedValue;
};

// Debounced animation helper
export const createDebouncedAnimation = (animationFn, delay = 300) => {
  let timeoutId;
  
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      animationFn(...args);
    }, delay);
  };
};

// Performance optimized region change handler
export const createOptimizedRegionChangeHandler = (callback, throttleMs = 100) => {
  let lastCallTime = 0;
  
  return (region) => {
    const now = Date.now();
    if (now - lastCallTime >= throttleMs) {
      lastCallTime = now;
      callback(region);
    }
  };
};

export default {
  ANIMATION_CONFIGS,
  animateToRegion,
  animateToShowBounds,
  animateToNavigationView,
  animateZoom,
  createMarkerAnimation,
  createPulseAnimation,
  animatePolylineDraw,
  createDebouncedAnimation,
  createOptimizedRegionChangeHandler,
};
