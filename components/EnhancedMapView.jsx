import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Route, 
  AlertTriangle, 
  Fuel, 
  Coffee, 
  ShoppingBag,
  Hospital,
  Car,
  Layers,
  Settings,
  Shield
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { getNearbyPlaces, getTrafficInfo } from '@/utils/googleMapsHelpers';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const PLACE_CATEGORIES = [
  { id: 'gas_station', name: 'Gas', icon: Fuel, color: '#FF6B6B' },
  { id: 'restaurant', name: 'Food', icon: Coffee, color: '#4ECDC4' },
  { id: 'hospital', name: 'Medical', icon: Hospital, color: '#45B7D1' },
  { id: 'shopping_mall', name: 'Shopping', icon: ShoppingBag, color: '#96CEB4' },
  { id: 'parking', name: 'Parking', icon: Car, color: '#FFEAA7' },
];

const TRAFFIC_COLORS = {
  light: '#4CAF50',
  moderate: '#FF9800', 
  heavy: '#F44336',
  unknown: '#9E9E9E'
};

const getIncidentMarkerStyle = (type) => {
  switch (type) {
    case 'accident':
      return {
        color: '#FF4444',
        icon: <Car size={16} color="white" />
      };
    case 'hazard':
      return {
        color: '#FFB300',
        icon: <AlertTriangle size={16} color="white" />
      };
    case 'violation':
      return {
        color: '#7C4DFF',
        icon: <Shield size={16} color="white" />
      };
    default:
      return {
        color: '#757575',
        icon: <AlertTriangle size={16} color="white" />
      };
  }
};

const EnhancedMapView = ({ 
  location, 
  selectedRoute, 
  incidents,
  onRouteSelect,
  onPlaceSelect,
  apiKey,
  mapRef,
  ...mapProps 
}) => {
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showTraffic, setShowTraffic] = useState(true);
  const [trafficInfo, setTrafficInfo] = useState(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  // Fetch nearby places when category is selected
  useEffect(() => {
    if (selectedCategory && location) {
      fetchNearbyPlaces(selectedCategory);
    }
  }, [selectedCategory, location]);

  // Get traffic info for current route
  useEffect(() => {
    if (selectedRoute && selectedRoute.length > 0) {
      fetchTrafficInfo();
    }
  }, [selectedRoute]);

  const fetchNearbyPlaces = async (category) => {
    setLoadingPlaces(true);
    try {
      const result = await getNearbyPlaces(location, apiKey, {
        type: category,
        radius: 5000
      });
      
      if (result.results) {
        setNearbyPlaces(result.results.slice(0, 10)); // Limit to 10 results
      }
    } catch (error) {
      console.error('Error fetching nearby places:', error);
    } finally {
      setLoadingPlaces(false);
    }
  };

  const fetchTrafficInfo = async () => {
    try {
      const traffic = await getTrafficInfo(selectedRoute, apiKey);
      setTrafficInfo(traffic);
    } catch (error) {
      console.error('Error fetching traffic info:', error);
    }
  };

  const handleCategoryPress = (categoryId) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      setNearbyPlaces([]);
    } else {
      setSelectedCategory(categoryId);
    }
  };

  const handlePlacePress = (place) => {
    const placeLocation = {
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      name: place.name
    };
    onPlaceSelect?.(placeLocation);
  };

  const getRouteColor = (routeIndex) => {
    const colors = ['#2196F3', '#4CAF50', '#FF9800'];
    return colors[routeIndex % colors.length];
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsTraffic={showTraffic}
        showsBuildings={true}
        showsIndoors={true}
        showsPointsOfInterest={true}
        showsCompass={true}
        showsScale={true}
        {...mapProps}
      >
        {/* Current location marker */}
        {location && (
          <Marker
            coordinate={location}
            title="Your Location"
            pinColor={colors.primary}
          />
        )}

        {/* Route polylines */}
        {selectedRoute && selectedRoute.length > 0 && (
          <Polyline
            coordinates={selectedRoute}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}

        {/* Alternative routes */}
        {alternativeRoutes.map((route, index) => (
          <Polyline
            key={`alt-route-${index}`}
            coordinates={route.coordinates}
            strokeColor={getRouteColor(index + 1)}
            strokeWidth={3}
            strokeOpacity={0.7}
            onPress={() => onRouteSelect?.(route)}
          />
        ))}

        {/* Incident markers */}
        {incidents?.map((incident) => {
          // Get marker color and icon based on incident type
          const markerStyle = getIncidentMarkerStyle(incident.type);
          
          return (
            <Marker
              key={incident.id}
              coordinate={{
                latitude: incident.location.latitude,
                longitude: incident.location.longitude
              }}
              title={incident.title}
              description={incident.description}
              onCalloutPress={() => {
                Alert.alert(
                  incident.title,
                  `Type: ${incident.type}\nStatus: ${incident.status}\n\n${incident.description}`,
                  [
                    { text: 'Close', style: 'cancel' },
                    { text: 'View Details', onPress: () => router.push(`/incident/${incident.id}`) }
                  ]
                );
              }}
            >
              <View style={[styles.incidentMarker, { backgroundColor: markerStyle.color }]}>
                {markerStyle.icon}
              </View>
            </Marker>
          );
        })}

        {/* Nearby places markers */}
        {nearbyPlaces.map((place) => (
          <Marker
            key={place.place_id}
            coordinate={{
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng
            }}
            title={place.name}
            description={place.vicinity}
            onPress={() => handlePlacePress(place)}
          >
            <View style={[
              styles.placeMarker, 
              { backgroundColor: PLACE_CATEGORIES.find(c => c.id === selectedCategory)?.color || colors.primary }
            ]}>
              <MapPin size={12} color="white" />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Category selector */}
      <View style={styles.categoryContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {PLACE_CATEGORIES.map((category) => {
            const IconComponent = category.icon;
            const isSelected = selectedCategory === category.id;
            
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  { backgroundColor: isSelected ? category.color : 'white' }
                ]}
                onPress={() => handleCategoryPress(category.id)}
              >
                <IconComponent 
                  size={20} 
                  color={isSelected ? 'white' : category.color} 
                />
                <Text style={[
                  styles.categoryText,
                  { color: isSelected ? 'white' : category.color }
                ]}>
                  {category.name}
                </Text>
                {loadingPlaces && selectedCategory === category.id && (
                  <ActivityIndicator size="small" color={isSelected ? 'white' : category.color} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Traffic info overlay */}
      {trafficInfo && (
        <View style={styles.trafficInfo}>
          <View style={styles.trafficHeader}>
            <Clock size={16} color={colors.text} />
            <Text style={styles.trafficText}>
              {trafficInfo.durationInTraffic}
            </Text>
            <View style={[
              styles.trafficIndicator,
              { backgroundColor: TRAFFIC_COLORS[trafficInfo.trafficConditions] }
            ]} />
          </View>
          <Text style={styles.trafficSubtext}>
            Normal: {trafficInfo.duration} • Traffic: {trafficInfo.trafficConditions}
          </Text>
        </View>
      )}

      {/* Map controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: showTraffic ? colors.primary : 'white' }]}
          onPress={() => setShowTraffic(!showTraffic)}
        >
          <Route size={20} color={showTraffic ? 'white' : colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            // Toggle map type or show settings
            Alert.alert('Map Settings', 'Map type and layer options');
          }}
        >
          <Layers size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Nearby places list */}
      {nearbyPlaces.length > 0 && (
        <View style={styles.placesList}>
          <Text style={styles.placesTitle}>
            Nearby {PLACE_CATEGORIES.find(c => c.id === selectedCategory)?.name}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {nearbyPlaces.slice(0, 5).map((place) => (
              <TouchableOpacity
                key={place.place_id}
                style={styles.placeCard}
                onPress={() => handlePlacePress(place)}
              >
                <Text style={styles.placeName} numberOfLines={1}>
                  {place.name}
                </Text>
                <Text style={styles.placeAddress} numberOfLines={1}>
                  {place.vicinity}
                </Text>
                <View style={styles.placeRating}>
                  <Text style={styles.ratingText}>
                    ⭐ {place.rating || 'N/A'}
                  </Text>
                  <Text style={styles.priceText}>
                    {place.price_level ? '$'.repeat(place.price_level) : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

import { router } from 'expo-router';

},
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  incidentMarker: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  categoryContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 80,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoryText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },

  placeMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  trafficInfo: {
    position: 'absolute',
    top: 150,
    right: 16,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  trafficHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trafficText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  trafficIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  trafficSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mapControls: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    gap: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  placesList: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: 160,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  placesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  placeCard: {
    width: 140,
    marginRight: 12,
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  placeAddress: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  placeRating: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  ratingText: {
    fontSize: 11,
    color: colors.text
  },
  priceText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600'
  }
});

export default EnhancedMapView;
