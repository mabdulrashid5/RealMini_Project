import React, { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ActivityIndicator, 
  TouchableOpacity, 
  TextInput,
  Dimensions,
  Keyboard,
  Platform,
  FlatList,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Search, Navigation2, Menu, AlertTriangle, Layers, Navigation, X, ArrowLeft, ArrowRight, ArrowUp, Settings, Route } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { colors } from '@/constants/colors';
import { useIncidentsStore } from '@/store/incidents-store';
import { useAuthStore } from '@/store/auth-store';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { 
  searchPlaces, 
  getPlaceDetails, 
  getDirections, 
  getNearbyPlaces,
  getTrafficInfo,
  getPlaceAutocomplete 
} from '@/utils/googleMapsHelpers';
import { mapCache } from '@/utils/mapCache';
import NearbyPlacesPanel from '@/components/NearbyPlacesPanel';
import { animateToShowBounds, animateToNavigationView } from '@/utils/mapAnimations';
import { decodePolyline } from '@/utils/polylineDecoder';

const GOOGLE_MAPS_API_KEY = 'AIzaSyD6f4kc1k-aa0s1ndZWNpXiGkjj2CU_qgE';

const RoutePreferencesPanel = ({ preferences, onUpdate, onClose }) => (
  <>
    <TouchableOpacity 
      style={styles.backdrop} 
      activeOpacity={1} 
      onPress={onClose}
    />
    <View style={styles.preferencesPanel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Route Preferences</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButtonLarge}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    
    <View style={styles.preferenceSection}>
      <Text style={styles.sectionTitle}>Travel Mode</Text>
      <View style={styles.modeButtons}>
        {['driving', 'walking', 'bicycling'].map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeButton,
              { backgroundColor: preferences.mode === mode ? colors.primary : 'white' }
            ]}
            onPress={() => onUpdate({ ...preferences, mode })}
          >
            <Text style={[
              styles.modeText,
              { color: preferences.mode === mode ? 'white' : colors.text }
            ]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    <View style={styles.preferenceSection}>
      <Text style={styles.sectionTitle}>Avoid</Text>
      <TouchableOpacity
        style={styles.preferenceRow}
        onPress={() => onUpdate({ ...preferences, avoidTolls: !preferences.avoidTolls })}
      >
        <Text style={styles.preferenceText}>Tolls</Text>
        <View style={[
          styles.checkbox,
          { backgroundColor: preferences.avoidTolls ? colors.primary : 'white' }
        ]}>
          {preferences.avoidTolls && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.preferenceRow}
        onPress={() => onUpdate({ ...preferences, avoidHighways: !preferences.avoidHighways })}
      >
        <Text style={styles.preferenceText}>Highways</Text>
        <View style={[
          styles.checkbox,
          { backgroundColor: preferences.avoidHighways ? colors.primary : 'white' }
        ]}>
          {preferences.avoidHighways && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    </View>
  </View>
  </>
);

const StartNavigationOverlay = ({ distance, duration, destination, onStart, onClose, alternativeRoutes }) => (
  <View style={styles.startNavigationOverlay}>
    <View style={styles.destinationHeader}>
      <Text style={styles.destinationTitle} numberOfLines={1}>
        {destination?.name}
      </Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <X size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
    
    <View style={styles.tripInfo}>
      <View style={styles.tripDetail}>
        <Text style={styles.tripValue}>{duration}</Text>
        <Text style={styles.tripLabel}>Duration</Text>
      </View>
      <View style={styles.tripDetail}>
        <Text style={styles.tripValue}>{distance}</Text>
        <Text style={styles.tripLabel}>Distance</Text>
      </View>
    </View>

    {alternativeRoutes && alternativeRoutes.length > 0 && (
      <View style={styles.alternativeRoutes}>
        <Text style={styles.alternativesTitle}>Alternative Routes</Text>
        {alternativeRoutes.slice(0, 2).map((route, index) => (
          <TouchableOpacity
            key={route.id}
            style={styles.alternativeRoute}
            onPress={() => {
              // Switch to this route
              onStart(route);
            }}
          >
            <Text style={styles.routeDuration}>{route.duration}</Text>
            <Text style={styles.routeDistance}>{route.distance}</Text>
            <Text style={styles.routeSummary} numberOfLines={1}>{route.summary}</Text>
          </TouchableOpacity>
        ))}
      </View>
    )}

    <TouchableOpacity style={styles.startButton} onPress={onStart}>
      <Text style={styles.startButtonText}>Start Navigation</Text>
    </TouchableOpacity>
  </View>
);

const NavigationOverlay = ({ 
  instruction, 
  distance, 
  duration, 
  onClose, 
  nextManeuver, 
  remainingSteps,
  currentSpeed = 0,
  destination
}) => {
  const speedKmh = Math.round(currentSpeed * 3.6);
  
  // Calculate ETA based on current time and duration
  const now = new Date();
  const durationMinutes = parseInt(duration?.replace(/\D/g, '')) || 0;
  const eta = new Date(now.getTime() + durationMinutes * 60000);
  const etaString = eta.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  return (
  <View style={styles.navigationOverlay}>
    <View style={styles.navigationHeader}>
      <View style={styles.navigationTripInfo}>
          <View style={styles.etaContainer}>
            <Text style={styles.etaTime}>{etaString}</Text>
            <Text style={styles.etaLabel}>ETA</Text>
          </View>
          <View style={styles.durationContainer}>
            <Text style={styles.tripDuration}>{duration}</Text>
            <Text style={styles.tripDistanceText}>{distance}</Text>
          </View>
          <View style={styles.speedContainer}>
            <Text style={styles.currentSpeedText}>{speedKmh}</Text>
            <Text style={styles.speedUnitText}>km/h</Text>
          </View>
      </View>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={20} color="white" />
      </TouchableOpacity>
    </View>
      
    <View style={styles.navigationInstructionContainer}>
      <View style={styles.navigationNextStep}>
        <View style={styles.maneuverIconContainer}>
          {getManeuverIcon(nextManeuver)}
        </View>
        <View style={styles.instructionTextContainer}>
          <Text style={styles.navigationInstruction} numberOfLines={2}>
              {instruction?.replace(/<[^>]*>/g, '') || 'Continue straight ahead'}
          </Text>
            <Text style={styles.destinationName} numberOfLines={1}>
              to {destination?.name || 'destination'}
            </Text>
        </View>
      </View>
    </View>
  </View>
);
};

const getManeuverIcon = (maneuver) => {
  switch (maneuver) {
    case 'turn-left':
      return <ArrowLeft size={24} color="white" />;
    case 'turn-right':
      return <ArrowRight size={24} color="white" />;
    case 'straight':
      return <ArrowUp size={24} color="white" />;
    default:
      return <Navigation2 size={24} color="white" />;
  }
};

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef(null);
  const { incidents, fetchIncidents } = useIncidentsStore();
  const { isAuthenticated } = useAuthStore();
  const voiceRef = useRef({
    enabled: true,
    lastSpoken: '',
  });
  
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  
  // Handle focusing on new incidents
  useEffect(() => {
    const params = router.params;
    if (params?.focusIncident && params?.lat && params?.lng) {
      const incident = incidents.find(inc => inc.id === params.focusIncident);
      if (incident) {
        setSelectedIncident(incident);
        mapRef.current?.animateToRegion({
          latitude: parseFloat(params.lat),
          longitude: parseFloat(params.lng),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    }
  }, [router.params, incidents]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [mapType, setMapType] = useState('standard');
  const [navigationInstructions, setNavigationInstructions] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [navigationStarted, setNavigationStarted] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [remainingDistance, setRemainingDistance] = useState(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState([]);
  const [showTrafficLayer, setShowTrafficLayer] = useState(true);
  const [routePreferences, setRoutePreferences] = useState({
    avoidTolls: false,
    avoidHighways: false,
    mode: 'driving'
  });
  const [showPreferences, setShowPreferences] = useState(false);
  const [showNearbyPlaces, setShowNearbyPlaces] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [navigationMode, setNavigationMode] = useState('overview'); // overview, following, navigation

  useEffect(() => {
    if (isAuthenticated) {
      fetchIncidents();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let locationSubscription;
    
    const setupLocation = async () => {
      try {
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
          Alert.alert(
            'Permission Needed',
            'Location permission is required to use the map navigation features.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Get last known location first for faster map initialization
        const lastKnownLocation = await Location.getLastKnownPositionAsync({
          maxAge: 60000
        });

        if (lastKnownLocation) {
          setLocation(lastKnownLocation.coords);
        }

        // Then get current location with high accuracy
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });

        setLocation(currentLocation.coords);

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 1, // More sensitive for live following
            timeInterval: 500,   // Much more frequent updates
            activityType: Location.ActivityType.AutomotiveNavigation,
            showsBackgroundLocationIndicator: true
          },
          (newLocation) => {
            setLocation(newLocation.coords);
            
            if (navigationStarted && selectedPlace) {
              updateRouteToDestination(newLocation.coords, selectedPlace);
              
              // Google Maps-style dynamic camera following
              updateNavigationCamera(newLocation.coords);
            }
          }
        );
      } catch (error) {
        console.error('Error setting up location:', error);
        setErrorMsg('Error getting location');
      }
    };

    setupLocation();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c * 1000;
  };

  const deg2rad = (deg) => deg * (Math.PI/180);

  const speakInstruction = (instruction) => {
    if (!voiceRef.current.enabled || instruction === voiceRef.current.lastSpoken) return;
    
    // Clean up the HTML tags and simplify the instruction
    const cleanInstruction = instruction.replace(/<[^>]*>/g, '')
      .replace(/([0-9]+\s*(kilometers?|meters?|km|m))/gi, match => `in ${match}`);
    
    Speech.speak(cleanInstruction, {
      language: 'en',
      rate: 0.8,
      pitch: 1.0,
    });
    
    voiceRef.current.lastSpoken = instruction;
  };

  const getManeuverType = (instruction) => {
    const lowerInstruction = instruction.toLowerCase();
    if (lowerInstruction.includes('left')) return 'turn-left';
    if (lowerInstruction.includes('right')) return 'turn-right';
    if (lowerInstruction.includes('continue') || lowerInstruction.includes('straight')) return 'straight';
    return 'default';
  };

  const updateRouteToDestination = async (currentLocation, destination) => {
    if (!currentLocation || !destination) return;

    try {
      let shouldUpdateRoute = true;
      
      if (selectedRoute && selectedRoute.length > 0) {
        const distanceToNextPoint = getDistanceFromLatLonInMeters(
          currentLocation.latitude,
          currentLocation.longitude,
          selectedRoute[0].latitude,
          selectedRoute[0].longitude
        );
        // Update route more frequently for better accuracy
        shouldUpdateRoute = distanceToNextPoint > 20;
      }

      if (shouldUpdateRoute) {
        const result = await mapCache.getDirectionsWithCache(
          getDirections,
          currentLocation, 
          destination, 
          GOOGLE_MAPS_API_KEY, 
          {
            alternatives: true,
            avoidTolls: routePreferences.avoidTolls,
            avoidHighways: routePreferences.avoidHighways,
            mode: routePreferences.mode,
            trafficModel: 'best_guess',
            departureTime: 'now'
          }
        );
        
        if (result.routes && result.routes.length > 0) {
          // Main route
          const route = result.routes[0];
          const points = decodePolyline(route.overview_polyline.points);
          setSelectedRoute(points);
          
          // Alternative routes
          const alternatives = result.routes.slice(1, 3).map((altRoute, index) => ({
            id: `alt-${index}`,
            coordinates: decodePolyline(altRoute.overview_polyline.points),
            duration: altRoute.legs[0].duration.text,
            distance: altRoute.legs[0].distance.text,
            summary: altRoute.summary
          }));
          setAlternativeRoutes(alternatives);
          
          if (route.legs && route.legs[0]) {
            setEstimatedTime(route.legs[0].duration.text);
            setRemainingDistance(route.legs[0].distance.text);
            const steps = route.legs[0].steps.map(step => ({
              instruction: step.html_instructions,
              distance: step.distance.text,
              duration: step.duration.text,
              maneuver: getManeuverType(step.html_instructions),
              start_location: step.start_location,
              end_location: step.end_location,
            }));
            setNavigationInstructions(steps);
            
            // Update active step and provide voice guidance
            const activeStepInfo = updateActiveNavigationStep(currentLocation, route.legs[0].steps);
            if (activeStepInfo) {
              const { step, distance } = activeStepInfo;
              // Speak instructions when approaching turns (within 200 meters)
              if (distance < 200) {
                speakInstruction(step.html_instructions);
              }
              // Speak "You have arrived" when very close to destination
              if (distance < 20 && steps.length === 1) {
                speakInstruction("You have arrived at your destination");
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating route:', error);
    }
  };

  const updateActiveNavigationStep = (currentLocation, steps) => {
    if (!steps || !steps.length) return;
    
    const closestStep = steps.reduce((closest, step, index) => {
      const stepLocation = {
        latitude: step.start_location.lat,
        longitude: step.start_location.lng
      };
      
      const distance = getDistanceFromLatLonInMeters(
        currentLocation.latitude,
        currentLocation.longitude,
        stepLocation.latitude,
        stepLocation.longitude
      );
      
      if (distance < closest.distance) {
        return { distance, index };
      }
      return closest;
    }, { distance: Infinity, index: 0 });
    
    setActiveStep(closestStep.index);
  };

  const handleMapTypeChange = () => {
    setMapType(prevType => {
      switch (prevType) {
        case 'standard': return 'satellite';
        case 'satellite': return 'hybrid';
        case 'hybrid': return 'standard';
        default: return 'standard';
      }
    });
  };

  const handleCenterOnUser = () => {
    if (!location) return;
    
    mapRef.current?.animateCamera({
      center: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      heading: location.heading || 0,
      pitch: navigationStarted ? 45 : 0,
      zoom: navigationStarted ? 17 : 15,
      duration: 1000
    });
  };

  // Google Maps-style dynamic camera following
  const updateNavigationCamera = (currentLocation) => {
    if (!mapRef.current || !currentLocation) return;

    const speed = currentLocation.speed || 0; // m/s
    const speedKmh = speed * 3.6; // Convert to km/h
    
    // Dynamic zoom based on speed (like Google Maps)
    let zoom = 18; // Default close zoom
    if (speedKmh > 80) zoom = 15;      // Highway speed - zoom out more
    else if (speedKmh > 50) zoom = 16; // Fast city driving
    else if (speedKmh > 20) zoom = 17; // Normal city driving
    else zoom = 18;                    // Slow/stationary - zoom in close
    
    // Dynamic pitch based on speed
    let pitch = 45; // Default pitch
    if (speedKmh > 30) pitch = 60;     // Higher pitch at speed for better road view
    else if (speedKmh < 5) pitch = 30; // Lower pitch when slow/stationary
    
    // Smooth camera animation with heading
    mapRef.current.animateCamera({
      center: {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      },
      heading: currentLocation.heading || 0,
      pitch: pitch,
      zoom: zoom,
    }, 800); // Shorter duration for smoother following
  };

  const handleSearchSelection = async (item) => {
    try {
      const details = await getPlaceDetails(item.place_id, GOOGLE_MAPS_API_KEY);
      if (details) {
        const destination = {
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
          name: item.description
        };
        setSelectedPlace(destination);
        setSearchResults([]);
        setSearchInput('');
        Keyboard.dismiss();

        if (location) {
          // Just calculate the route but don't start navigation yet
          const result = await getDirections(
            location,
            destination,
            GOOGLE_MAPS_API_KEY
          );

          if (result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            const points = decodePolyline(route.overview_polyline.points);
            setSelectedRoute(points);
            setEstimatedTime(route.legs[0].duration.text);
            setRemainingDistance(route.legs[0].distance.text);
          }
        }

        // Show both current location and destination with smooth animation
        const coordinates = [location, destination];
        animateToShowBounds(mapRef, coordinates, 0.3);
      }
    } catch (error) {
      console.error('Error selecting place:', error);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        region={location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        } : {
          latitude: 5.6037,
          longitude: -0.1870,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onMapReady={() => {
          console.log('Map is ready');
          setMapReady(true);
          // Preload common data when map is ready
          if (location) {
            mapCache.preloadCommonData(location, GOOGLE_MAPS_API_KEY);
          }
        }}
        onError={(error) => {
          console.error('Map error:', error);
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={false} // We handle this manually for better control
        showsCompass={true}
        showsTraffic={showTrafficLayer}
        loadingEnabled={true}
        rotateEnabled={!navigationStarted} // Disable rotation during navigation
        pitchEnabled={true}
        zoomEnabled={true}
        scrollEnabled={!navigationStarted} // Disable manual scrolling during navigation
        paddingAdjustmentBehavior="automatic"
        userLocationPriority="high"
        userLocationUpdateInterval={1000}
        userLocationFastestInterval={500}
        mapPadding={{ top: 100, right: 20, bottom: navigationStarted ? 300 : 100, left: 20 }}
      >
        {selectedPlace && (
          <Marker
            coordinate={{
              latitude: selectedPlace.latitude,
              longitude: selectedPlace.longitude,
            }}
            title={selectedPlace.name}
          >
            <View style={styles.destinationMarker}>
              <MapPin size={24} color={colors.accent} />
            </View>
          </Marker>
        )}

        {selectedRoute && (
          <Polyline
            coordinates={selectedRoute}
            strokeWidth={navigationStarted ? 8 : 6} // Thicker during navigation
            strokeColor={navigationStarted ? '#2196F3' : colors.primary} // Blue during navigation
            strokeOpacity={navigationStarted ? 1.0 : 0.8}
            lineDashPattern={[0]}
            geodesic={true} // More accurate curved lines
            lineJoin="round"
            lineCap="round"
          />
        )}

        {/* Alternative routes */}
        {alternativeRoutes.map((route, index) => (
          <Polyline
            key={route.id}
            coordinates={route.coordinates}
            strokeColor={index === 0 ? '#4CAF50' : '#FF9800'}
            strokeWidth={4}
            strokeOpacity={0.6}
            lineDashPattern={[5, 5]}
            onPress={() => {
              // Switch to alternative route
              setSelectedRoute(route.coordinates);
              setEstimatedTime(route.duration);
              setRemainingDistance(route.distance);
            }}
          />
        ))}

        {incidents.map((incident) => {
          if (!incident || !incident.id || !incident.coordinate) {
            console.error('Invalid incident:', incident);
            return null;
          }
          
          return (
            <Marker
              key={incident.id}
              coordinate={incident.coordinate}
              onPress={() => setSelectedIncident(incident)}
            >
              <View style={styles.incidentMarker}>
                <AlertTriangle size={24} color={colors.warning} />
              </View>
              <Callout onPress={() => {
                const { user } = useAuthStore.getState();
                if (!user) {
                  Alert.alert('Login Required', 'Please login to upvote incidents');
                  return;
                }
                useIncidentsStore.getState().upvoteIncident(incident.id);
              }}>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{incident.title}</Text>
                  <Text style={styles.calloutDescription}>{incident.description}</Text>
                  <View style={styles.calloutMetadata}>
                    <Text style={styles.calloutType}>{incident.type}</Text>
                    {incident.verified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.calloutAddress}>{incident.address}</Text>
                  <View style={styles.calloutFooter}>
                    <Text style={styles.calloutTime}>
                      {new Date(incident.reportedAt).toLocaleString()}
                    </Text>
                    <View style={styles.calloutUpvotes}>
                      <Text style={styles.upvoteCount}>
                        {incident.upvotes?.length || 0} upvotes
                      </Text>
                    </View>
                  </View>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {!navigationStarted && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search destination..."
            value={searchInput}
            onChangeText={async (text) => {
              setSearchInput(text);
              if (text.length > 2) {
                try {
                  console.log('Searching for:', text);
                const results = await searchPlaces(text, GOOGLE_MAPS_API_KEY);
                  console.log('Search results:', results);
                setSearchResults(results?.predictions || []);
                } catch (error) {
                  console.error('Search error:', error);
                  setSearchResults([]);
                }
              } else {
                setSearchResults([]);
              }
            }}
          />
          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.place_id}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                bounces={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => handleSearchSelection(item)}
                  >
                    <Text style={styles.searchResultText}>{item.description}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      )}

      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleCenterOnUser}
        >
          <Navigation size={24} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: showTrafficLayer ? colors.primary : 'white' }
          ]}
          onPress={() => setShowTrafficLayer(!showTrafficLayer)}
        >
          <Route size={24} color={showTrafficLayer ? 'white' : colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowNearbyPlaces(true)}
        >
          <MapPin size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowPreferences(true)}
        >
          <Settings size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleMapTypeChange}
        >
          <Layers size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {selectedPlace && !navigationStarted && (
        <StartNavigationOverlay
          destination={selectedPlace}
          distance={remainingDistance}
          duration={estimatedTime}
          alternativeRoutes={alternativeRoutes}
          onStart={(selectedRoute) => {
            if (selectedRoute) {
              // User selected an alternative route
              setSelectedRoute(selectedRoute.coordinates);
              setEstimatedTime(selectedRoute.duration);
              setRemainingDistance(selectedRoute.distance);
            }
            setNavigationStarted(true);
            updateRouteToDestination(location, selectedPlace);
            // Animate to navigation view with smooth transition
            animateToNavigationView(mapRef, location, location.heading || 0);
          }}
          onClose={() => {
            setSelectedPlace(null);
            setSelectedRoute(null);
            setEstimatedTime(null);
            setRemainingDistance(null);
            setAlternativeRoutes([]);
          }}
        />
      )}

      {showPreferences && (
        <RoutePreferencesPanel
          preferences={routePreferences}
          onUpdate={(newPreferences) => {
            setRoutePreferences(newPreferences);
            // Recalculate route with new preferences if we have a destination
            if (selectedPlace && location) {
              handleSearchSelection({ 
                place_id: 'recalculate',
                description: selectedPlace.name 
              });
            }
          }}
          onClose={() => setShowPreferences(false)}
        />
      )}

      {navigationStarted && navigationInstructions.length > 0 && (
        <NavigationOverlay
          instruction={navigationInstructions[activeStep]?.instruction}
          distance={remainingDistance}
          duration={estimatedTime}
          currentSpeed={currentSpeed}
          destination={selectedPlace}
          nextManeuver={navigationInstructions[activeStep]?.maneuver}
          onClose={() => {
            setNavigationStarted(false);
            setSelectedRoute(null);
            setSelectedPlace(null);
            setNavigationInstructions([]);
            setNavigationMode('overview');
          }}
        />
      )}



      <NearbyPlacesPanel
        visible={showNearbyPlaces}
        location={location}
        apiKey={GOOGLE_MAPS_API_KEY}
        onPlaceSelect={(place) => {
          setSelectedPlace(place);
          setShowNearbyPlaces(false);
          // Calculate route to selected place
          handleSearchSelection({
            place_id: place.placeId,
            description: place.name
          });
        }}
        onClose={() => setShowNearbyPlaces(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  startNavigationOverlay: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: '60%',
  },
  alternativeRoutes: {
    marginBottom: 15,
  },
  alternativesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  alternativeRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    minWidth: 50,
  },
  routeDistance: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  calloutContainer: {
    minWidth: 250,
    maxWidth: 300,
    padding: 12,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  calloutMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  calloutType: {
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 8,
  },
  verifiedBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  calloutAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  calloutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  calloutTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  calloutUpvotes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upvoteCount: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 8,
    minWidth: 40,
  },
  routeSummary: {
    fontSize: 12,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  preferencesPanel: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: '60%',
    zIndex: 1000,
  },
  calloutContainer: {
    minWidth: 200,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  calloutTime: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  preferenceSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  preferenceText: {
    fontSize: 16,
    color: colors.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  closeButtonLarge: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  speedIndicator: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  speedValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  speedUnit: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.8,
  },
  destinationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  destinationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  tripDetail: {
    alignItems: 'center',
  },
  tripValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  tripLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 999,
  },
  searchInput: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    fontSize: 16,
  },
  searchResultsContainer: {
    backgroundColor: 'white',
    marginTop: 5,
    borderRadius: 8,
    maxHeight: 300, // Fixed height instead of percentage
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10, // Higher elevation
    zIndex: 1000, // Ensure it appears on top
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
  },
  searchResultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  searchResultText: {
    fontSize: 16,
    color: colors.text,
  },
  searchResultsList: {
    maxHeight: Platform.OS === 'ios' ? '80%' : '70%',
  },
  mapControls: {
    position: 'absolute',
    right: 20,
    top: 120, // Moved to top to avoid interference with search results
    zIndex: 1,
  },
  controlButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  destinationMarker: {
    padding: 5,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  incidentMarker: {
    padding: 5,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navigationOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    right: 16,
    backgroundColor: '#1E3A8A', // Deep blue like real GPS apps
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  navigationTripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  etaContainer: {
    alignItems: 'center',
    flex: 1,
  },
  etaTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  etaLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  durationContainer: {
    alignItems: 'center',
    flex: 1,
  },
  tripDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  tripDistanceText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  speedContainer: {
    alignItems: 'center',
    flex: 1,
  },
  currentSpeedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ADE80', // Green for speed
  },
  speedUnitText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  navigationInstructionContainer: {
    padding: 16,
  },
  navigationNextStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
  },
  navigationInstruction: {
    fontSize: 18,
    color: 'white',
    lineHeight: 24,
    fontWeight: '600',
  },
  destinationName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  instructionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  maneuverIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepPreview: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  navigationNextStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
  },
});
