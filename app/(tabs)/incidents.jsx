import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { Filter, Bell, MapPin } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useIncidentsStore } from '@/store/incidents-store';
import { IncidentCard } from '@/components/IncidentCard';
import { EmptyState } from '@/components/EmptyState';
import * as Location from 'expo-location';

// Function to calculate distance between two coordinates in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const NEARBY_DISTANCE = 5; // 5 kilometers radius

export default function IncidentsScreen() {
  const { incidents, fetchIncidents, isLoading } = useIncidentsStore();
  const [location, setLocation] = useState(null);
  const [nearbyIncidents, setNearbyIncidents] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  
  useEffect(() => {
    fetchIncidents();
    
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        setLocation(currentLocation);

        // Watch position changes
        const locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,
            distanceInterval: 100
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

  // Filter nearby incidents whenever location or incidents change
  useEffect(() => {
    if (location && incidents.length > 0) {
      const nearby = incidents.filter(incident => {
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          incident.location.latitude,
          incident.location.longitude
        );
        return distance <= NEARBY_DISTANCE;
      });
      setNearbyIncidents(nearby);
    }
  }, [location, incidents]);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nearby Alerts</Text>
          <Text style={styles.subtitle}>Within {NEARBY_DISTANCE}km radius</Text>
        </View>
        
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color={colors.text} />
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {location ? (
        nearbyIncidents.length > 0 ? (
          <>
            <View style={styles.notificationBanner}>
              <Bell size={20} color={colors.danger} />
              <Text style={styles.notificationText}>
                {nearbyIncidents.length} alert{nearbyIncidents.length > 1 ? 's' : ''} reported nearby
              </Text>
            </View>
            
            <FlatList
              data={nearbyIncidents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.incidentContainer}>
                  <IncidentCard incident={item} />
                  <View style={styles.distanceTag}>
                    <MapPin size={14} color={colors.primary} />
                    <Text style={styles.distanceText}>
                      {location ? 
                        `${calculateDistance(
                          location.coords.latitude,
                          location.coords.longitude,
                          item.location.latitude,
                          item.location.longitude
                        ).toFixed(1)}km away` : 
                        'Calculating...'}
                    </Text>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : (
          <EmptyState
            title="No Nearby Alerts"
            message={`There are no alerts reported within ${NEARBY_DISTANCE}km of your location.`}
          />
        )
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {errorMsg || 'Getting your location...'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
  },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEEEE',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  notificationText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.danger,
  },
  listContent: {
    padding: 16,
  },
  incidentContainer: {
    marginBottom: 16,
  },
  distanceTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  distanceText: {
    marginLeft: 4,
    fontSize: 12,
    color: colors.primary,
  },
}); 