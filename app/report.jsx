import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Image,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Camera, X, AlertTriangle, Car, Shield } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { colors } from '@/constants/colors';
import { Button } from '@/components/Button';
import { useIncidentsStore } from '@/store/incidents-store';

export default function ReportScreen() {
  const router = useRouter();
  const { reportIncident, isLoading } = useIncidentsStore();
  
  // Valid incident types from the backend model
  const validIncidentTypes = {
    accident: 'accident',
    hazard: 'hazard',
    others: 'violation' // Map 'others' to 'violation' type
  };
  const [type, setType] = useState('accident'); // Default to accident
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState(null);

  // Get current location when screen loads
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    
    try {
      console.log('Requesting location permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permission to access location was denied');
        setIsLoadingLocation(false);
        return;
      }

      console.log('Getting current position...');
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      console.log('Current position:', currentLocation);

      // Get address for the location
      const [address] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      });

      // Format and validate the address
      const addressParts = address ? 
        [
          address.street,
          address.district,
          address.city,
          address.region
        ].filter(Boolean) : [];

      const formattedAddress = addressParts.length > 0 ? 
        addressParts.join(', ') : 
        'Unknown location';

      // Log the location data for debugging
      console.log('Location data:', {
        coords: {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy
        },
        address: formattedAddress,
        raw: address
      });

      console.log('Setting location with:', {
        coords: currentLocation.coords,
        address: formattedAddress
      });

      // Store coordinates in the correct format
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        coords: currentLocation.coords,
        address: formattedAddress
      });
    } catch (error) {
      setLocationError('Could not get your current location');
      console.error('Location error:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleTypeSelect = (selectedType) => {
    setType(selectedType);
  };
  
  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert('Permission to access camera roll is required!');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };
  
  const handleRemoveImage = () => {
    setImage(null);
  };
  
  const handleSubmit = async () => {
    // Validate all required fields
    if (!title.trim()) {
      Alert.alert('Missing Information', 'Please enter a title for the incident');
      return;
    }

    if (title.trim().length > 100) {
      Alert.alert('Invalid Title', 'Title cannot exceed 100 characters');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please enter a description of the incident');
      return;
    }

    if (description.trim().length > 1000) {
      Alert.alert('Invalid Description', 'Description cannot exceed 1000 characters');
      return;
    }

    if (!location || !location.latitude || !location.longitude) {
      Alert.alert('Location Required', 'We need your current location to report an incident. Please enable location services and try again.');
      return;
    }

    console.log('Current location:', location); // Debug log

    // Map the selected type to backend type
    const backendType = validIncidentTypes[type];
    if (!backendType) {
      Alert.alert('Invalid Type', 'Please select a valid incident type');
      return;
    }

    // Validate minimum lengths
    if (title.trim().length < 5) {
      Alert.alert('Invalid Title', 'Title must be at least 5 characters long');
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert('Invalid Description', 'Description must be at least 10 characters long');
      return;
    }
    
    try {
      // Verify user is still at the reported location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      console.log('Verifying location:', { current: currentLocation.coords, saved: location });

      // Calculate distance between current and initial location (in meters)
      const distance = getDistanceFromLatLonInMeters(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        location.latitude,
        location.longitude
      );
      
      console.log('Distance from original location:', distance, 'meters');

      // If user has moved more than 100 meters from the initial location
      if (distance > 100) {
        Alert.alert(
          'Location Mismatch',
          'You appear to have moved from the incident location. Please only report incidents at your current location.',
          [
            {
              text: 'Update Location',
              onPress: getCurrentLocation
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
        return;
      }

      // Validate coordinates
      if (!location || typeof location.longitude !== 'number' || typeof location.latitude !== 'number') {
        console.error('Invalid location format:', location);
        Alert.alert('Error', 'Invalid location data. Please try refreshing your location.');
        return;
      }

      console.log('Current location data:', location);

      // Get coordinates as numbers
      const longitude = parseFloat(location.longitude);
      const latitude = parseFloat(location.latitude);

      // Validate coordinates
      if (isNaN(longitude) || isNaN(latitude) ||
          longitude < -180 || longitude > 180 ||
          latitude < -90 || latitude > 90) {
        console.error('Invalid coordinates:', { longitude, latitude });
        Alert.alert('Error', 'Invalid location coordinates. Please try refreshing your location.');
        return;
      }

      // Prepare incident data in GeoJSON format
      const incidentData = {
        type: backendType,
        title: title.trim(),
        description: description.trim(),
        location: {
          type: 'Point',
          coordinates: [longitude, latitude], // GeoJSON uses [longitude, latitude]
          address: location.address || 'Unknown location'
        }
      };

      console.log('Prepared incident data:', JSON.stringify(incidentData, null, 2));

      console.log('Prepared incident data:', JSON.stringify(incidentData, null, 2));

      console.log('Submitting incident data:', incidentData);
      
      // Submit the incident
      let createdIncident;
      try {
        createdIncident = await reportIncident(incidentData);
        console.log('New incident created:', createdIncident);
      } catch (error) {
        console.error('Failed to create incident:', error);
        Alert.alert(
          'Error',
          error.message || 'Failed to create incident. Please try again.'
        );
        return;
      }

      if (createdIncident && createdIncident.id) {
        Alert.alert(
          'Success',
          'Report submitted successfully',
          [{ 
            text: 'View on Map',
            onPress: () => {
              const params = {
                focusIncident: createdIncident.id,
                lat: location.latitude,
                lng: location.longitude
              };
              console.log('Navigating with params:', params);
              router.push({
                pathname: '/(tabs)/',
                params
              });
            }
          }]
        );
      } else {
        // If we don't have a valid incident object, show a generic success but log the error
        console.error('Invalid incident response:', createdIncident);
        Alert.alert(
          'Success',
          'Report submitted successfully',
          [{ 
            text: 'OK',
            onPress: () => router.push('/(tabs)/')
          }]
        );
      }
    } catch (error) {
      console.error('Error reporting incident:', error);
      Alert.alert('Error', 'Failed to report incident. Please try again.');
    }
  };
  
  const handleCancel = () => {
    router.push('/(tabs)');
  };
  
  const getTypeIcon = (incidentType, selected) => {
    const color = selected ? '#FFFFFF' : colors.text;
    
    switch (incidentType) {
      case 'accident':
        return <Car size={24} color={color} />;
      case 'hazard':
        return <AlertTriangle size={24} color={color} />;
      case 'others':
        return <Shield size={24} color={color} />;
      default:
        return <AlertTriangle size={24} color={color} />;
    }
  };
  
  const getTypeColor = (incidentType) => {
    switch (incidentType) {
      case 'accident':
        return colors.incident.accident;
      case 'hazard':
        return colors.incident.hazard;
      case 'others':
        return colors.incident.others;
      default:
        return colors.incident.hazard;
    }
  };

  const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Report an Incident</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Type of Incident</Text>
            <View style={styles.typeButtons}>
              {['accident', 'hazard', 'others'].map((incidentType) => (
                <TouchableOpacity
                  key={incidentType}
                  style={[
                    styles.typeButton,
                    type === incidentType && { backgroundColor: getTypeColor(incidentType) }
                  ]}
                  onPress={() => handleTypeSelect(incidentType)}
                >
                  {getTypeIcon(incidentType, type === incidentType)}
                  <Text style={[
                    styles.typeButtonText,
                    type === incidentType && styles.typeButtonTextSelected
                  ]}>
                    {incidentType.charAt(0).toUpperCase() + incidentType.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief description of the incident"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide more details about the incident"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            {isLoadingLocation ? (
              <View style={styles.locationLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.locationLoadingText}>Getting your location...</Text>
              </View>
            ) : locationError ? (
              <View style={styles.locationError}>
                <Text style={styles.locationErrorText}>{locationError}</Text>
                <Button
                  title="Retry"
                  onPress={getCurrentLocation}
                  variant="secondary"
                />
              </View>
            ) : location ? (
              <View style={styles.locationContainer}>
                <MapPin size={20} color={colors.primary} />
                <Text style={styles.locationText}>
                  {location.address}
                </Text>
              </View>
            ) : null}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photo</Text>
            {image ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                >
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handleImagePick}
              >
                <Camera size={24} color={colors.primary} />
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <Button
          title="Cancel"
          onPress={handleCancel}
          variant="secondary"
          style={styles.footerButton}
        />
        <Button
          title="Submit Report"
          onPress={handleSubmit}
          loading={isLoading}
          style={[styles.footerButton, styles.submitButton]}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  typeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  typeButtonTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
  },
  locationLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  locationError: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
  },
  locationErrorText: {
    fontSize: 14,
    color: colors.danger,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
  },
  locationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addImageText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  submitButton: {
    flex: 2,
  },
}); 