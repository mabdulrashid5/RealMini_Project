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
  
  const [type, setType] = useState('hazard');
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permission to access location was denied');
        setIsLoadingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      // Get address for the location
      const [address] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address: address ? 
          [
            address.street,
            address.district,
            address.city,
            address.region
          ].filter(Boolean).join(', ') : 
          'Unknown location'
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
    if (!title || !description) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (!location) {
      Alert.alert('Location Required', 'We need your current location to report an incident. Please enable location services and try again.');
      return;
    }
    
    try {
      // Verify user is still at the reported location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      // Calculate distance between current and initial location (in meters)
      const distance = getDistanceFromLatLonInMeters(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        location.latitude,
        location.longitude
      );

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

      await reportIncident({
        type,
        title,
        description,
        location,
        reportedBy: 'user1',
        images: image ? [image] : undefined,
      });
      
      router.back();
    } catch (error) {
      console.error('Error reporting incident:', error);
      Alert.alert('Error', 'Failed to report incident. Please try again.');
    }
  };
  
  const handleCancel = () => {
    router.back();
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