import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform, TouchableOpacity, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, AlertTriangle, Navigation, Layers, X } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useIncidentsStore } from '@/store/incidents-store';
import { useAuthStore } from '@/store/auth-store';
import { EmptyState } from '@/components/EmptyState';
import { IncidentCard } from '@/components/IncidentCard';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

// Emergency services locations (example data - replace with real data)
const emergencyServices = [
  {
    id: 'e1',
    name: 'Central Police Station',
    coordinate: { latitude: 5.5557, longitude: -0.1963 },
    type: 'police'
  },
  {
    id: 'e2',
    name: 'Korle Bu Teaching Hospital',
    coordinate: { latitude: 5.5359, longitude: -0.2262 },
    type: 'hospital'
  },
  {
    id: 'e3',
    name: 'Fire Service HQ',
    coordinate: { latitude: 5.5605, longitude: -0.2009 },
    type: 'fire'
  }
];

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef(null);
  const { incidents, fetchIncidents, isLoading } = useIncidentsStore();
  const { isAuthenticated } = useAuthStore();
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [mapType, setMapType] = useState('standard');
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchIncidents();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        // Get the current location
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        setLocation(currentLocation);

        // Watch position changes
        const locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10
          },
          (newLocation) => {
            setLocation(newLocation);
          }
        );

        return () => {
          locationSubscription.remove();
        };
      } catch (error) {
        setErrorMsg('Error getting location');
      }
    })();
  }, []);
  
  const handleMarkerPress = (incident) => {
    setSelectedIncident(incident);
  };
  
  const handleViewDetails = () => {
    if (selectedIncident) {
      router.push(`/incident/${selectedIncident.id}`);
    }
  };

  const handleDismissIncident = () => {
    setSelectedIncident(null);
  };
  
  const handleReport = () => {
    router.push('/report');
  };
  
  const handleMapTypeChange = () => {
    setMapType(prevType => {
      switch (prevType) {
        case 'standard':
          return 'satellite';
        case 'satellite':
          return 'hybrid';
        case 'hybrid':
          return 'standard';
        default:
          return 'standard';
      }
    });
  };

  const handleCenterOnUser = async () => {
    if (!location) {
      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        setLocation(currentLocation);
        
        mapRef.current?.animateToRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      } catch (error) {
        setErrorMsg('Error getting location');
      }
    } else {
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {(Platform.OS === 'ios' || Platform.OS === 'android') ? (
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          region={{
            latitude: location?.coords.latitude || 5.6037,
            longitude: location?.coords.longitude || -0.1870,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          mapType={mapType}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
        >
          {/* Render incident markers */}
          {incidents.map((incident) => (
            <Marker
              key={incident.id}
              coordinate={{
                latitude: incident.location.latitude,
                longitude: incident.location.longitude,
              }}
              onPress={() => handleMarkerPress(incident)}
              pinColor="red"
            />
          ))}
          
          {/* Render emergency services markers */}
          {emergencyServices.map((service) => (
            <Marker
              key={service.id}
              coordinate={service.coordinate}
              pinColor={service.type === 'police' ? 'blue' : service.type === 'hospital' ? 'green' : 'orange'}
            >
              <MapPin size={24} color={service.type === 'police' ? '#3B82F6' : service.type === 'hospital' ? '#10B981' : '#F59E0B'} />
            </Marker>
          ))}
        </MapView>
      ) : (
        <EmptyState
          icon={<MapPin size={48} color={colors.textSecondary} />}
          title="Map View Unavailable"
          description="The map view is only available on mobile devices."
        />
      )}
      
      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={handleMapTypeChange}
        >
          <Layers size={24} color={colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.mapButton, { marginTop: 8 }]}
          onPress={handleCenterOnUser}
        >
          <Navigation size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      {/* Selected Incident Card */}
      {selectedIncident && (
        <View style={styles.selectedIncidentContainer}>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismissIncident}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <IncidentCard
            incident={selectedIncident}
            onPress={handleViewDetails}
          />
        </View>
      )}
      
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedIncidentContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  dismissButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  reportButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    right: 16,
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 