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
import { MapPin, Search, Navigation2, Menu, AlertTriangle, Layers, Navigation, X, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { colors } from '@/constants/colors';
import { useIncidentsStore } from '@/store/incidents-store';
import { useAuthStore } from '@/store/auth-store';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { searchPlaces, getPlaceDetails, getDirections } from '@/utils/googleMapsHelpers';
import { decodePolyline } from '@/utils/polylineDecoder';

const GOOGLE_MAPS_API_KEY = 'AIzaSyD6f4kc1k-aa0s1ndZWNpXiGkjj2CU_qgE';

const StartNavigationOverlay = ({ distance, duration, destination, onStart, onClose }) => (
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
    <TouchableOpacity style={styles.startButton} onPress={onStart}>
      <Text style={styles.startButtonText}>Start Navigation</Text>
    </TouchableOpacity>
  </View>
);

const NavigationOverlay = ({ instruction, distance, duration, onClose, nextManeuver, remainingSteps }) => (
  <View style={styles.navigationOverlay}>
    <View style={styles.navigationHeader}>
      <View style={styles.navigationTripInfo}>
        <Text style={styles.navigationEta}>ETA: {duration}</Text>
        <Text style={styles.navigationDistance}>{distance}</Text>
      </View>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <X size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
    <View style={styles.navigationInstructionContainer}>
      <View style={styles.navigationNextStep}>
        <View style={styles.maneuverIconContainer}>
          {getManeuverIcon(nextManeuver)}
        </View>
        <View style={styles.instructionTextContainer}>
          <Text style={styles.navigationInstruction} numberOfLines={2}>
            {instruction}
          </Text>
          {remainingSteps > 0 && (
            <Text style={styles.nextStepPreview}>
              Then: {remainingSteps} more steps
            </Text>
          )}
        </View>
      </View>
    </View>
  </View>
);

const getManeuverIcon = (maneuver) => {
  switch (maneuver) {
    case 'turn-left':
      return <ArrowLeft size={32} color={colors.primary} />;
    case 'turn-right':
      return <ArrowRight size={32} color={colors.primary} />;
    case 'straight':
      return <ArrowUp size={32} color={colors.primary} />;
    default:
      return <Navigation2 size={32} color={colors.primary} />;
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
            distanceInterval: 5,
            timeInterval: 2000,
            activityType: Location.ActivityType.AutomotiveNavigation,
            showsBackgroundLocationIndicator: true
          },
          (newLocation) => {
            setLocation(newLocation.coords);
            
            if (navigationStarted && selectedPlace) {
              updateRouteToDestination(newLocation.coords, selectedPlace);
              
              if (mapRef.current && newLocation.coords.heading) {
                mapRef.current.animateCamera({
                  center: {
                    latitude: newLocation.coords.latitude,
                    longitude: newLocation.coords.longitude,
                  },
                  heading: newLocation.coords.heading,
                  pitch: 60,
                  zoom: 18,
                  duration: 1000
                });
              }
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
        const result = await getDirections(currentLocation, destination, GOOGLE_MAPS_API_KEY);
        
        if (result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          const points = decodePolyline(route.overview_polyline.points);
          setSelectedRoute(points);
          
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

        // Show both current location and destination in the map view
        const bounds = {
          north: Math.max(location.latitude, destination.latitude),
          south: Math.min(location.latitude, destination.latitude),
          east: Math.max(location.longitude, destination.longitude),
          west: Math.min(location.longitude, destination.longitude),
        };
        
        // Add some padding to the bounds
        const padding = 0.3; // increased to 30% padding for better visibility
        mapRef.current?.animateToRegion({
          latitude: (bounds.north + bounds.south) / 2,
          longitude: (bounds.east + bounds.west) / 2,
          latitudeDelta: (bounds.north - bounds.south) * (1 + padding),
          longitudeDelta: (bounds.east - bounds.west) * (1 + padding),
        }, 1000);
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
        }}
        onError={(error) => {
          console.error('Map error:', error);
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={navigationStarted}
        showsCompass={true}
        showsTraffic={true}
        loadingEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
        zoomEnabled={true}
        paddingAdjustmentBehavior="automatic"
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
            strokeWidth={4}
            strokeColor={colors.primary}
          />
        )}

        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            coordinate={incident.location}
            onPress={() => setSelectedIncident(incident)}
          >
            <View style={styles.incidentMarker}>
              <AlertTriangle size={24} color={colors.warning} />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search destination..."
          value={searchInput}
          onChangeText={async (text) => {
            setSearchInput(text);
            if (text.length > 2) {
              const results = await searchPlaces(text, GOOGLE_MAPS_API_KEY);
              setSearchResults(results?.predictions || []);
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

      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleCenterOnUser}
        >
          <Navigation size={24} color={colors.primary} />
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
          onStart={() => {
            setNavigationStarted(true);
            updateRouteToDestination(location, selectedPlace);
            // Animate to navigation view
            mapRef.current?.animateCamera({
              center: {
                latitude: location.latitude,
                longitude: location.longitude,
              },
              heading: location.heading || 0,
              pitch: 60,
              zoom: 18,
              duration: 1000
            });
          }}
          onClose={() => {
            setSelectedPlace(null);
            setSelectedRoute(null);
            setEstimatedTime(null);
            setRemainingDistance(null);
          }}
        />
      )}

      {navigationStarted && navigationInstructions.length > 0 && (
        <NavigationOverlay
          instruction={navigationInstructions[activeStep]?.instruction}
          distance={remainingDistance}
          duration={estimatedTime}
          onClose={() => {
            setNavigationStarted(false);
            setSelectedRoute(null);
            setSelectedPlace(null);
            setNavigationInstructions([]);
          }}
        />
      )}
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
    maxHeight: '50%',
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
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    bottom: Platform.OS === 'ios' ? 100 : 90, // Significantly increased bottom margin
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20, // Increased margin from bottom
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  navigationTripInfo: {
    flex: 1,
  },
  navigationEta: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  navigationDistance: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  closeButton: {
    padding: 8,
  },
  navigationInstructionContainer: {
    padding: 20,
  },
  navigationNextStep: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
  },
  navigationInstruction: {
    fontSize: 18,
    color: colors.text,
    lineHeight: 24,
  },
  maneuverIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: colors.background,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  instructionTextContainer: {
    flex: 1,
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
