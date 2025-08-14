import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { 
  MapPin, 
  Star, 
  Clock, 
  Phone, 
  Navigation,
  X,
  Fuel,
  Coffee,
  ShoppingBag,
  Hospital,
  Car,
  Utensils,
  Hotel
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { getNearbyPlaces } from '@/utils/googleMapsHelpers';

const PLACE_CATEGORIES = [
  { 
    id: 'gas_station', 
    name: 'Gas Stations', 
    icon: Fuel, 
    color: '#FF6B6B',
    searchType: 'gas_station'
  },
  { 
    id: 'restaurant', 
    name: 'Restaurants', 
    icon: Utensils, 
    color: '#4ECDC4',
    searchType: 'restaurant'
  },
  { 
    id: 'hospital', 
    name: 'Hospitals', 
    icon: Hospital, 
    color: '#45B7D1',
    searchType: 'hospital'
  },
  { 
    id: 'lodging', 
    name: 'Hotels', 
    icon: Hotel, 
    color: '#96CEB4',
    searchType: 'lodging'
  },
  { 
    id: 'shopping_mall', 
    name: 'Shopping', 
    icon: ShoppingBag, 
    color: '#FFEAA7',
    searchType: 'shopping_mall'
  },
  { 
    id: 'parking', 
    name: 'Parking', 
    icon: Car, 
    color: '#DDA0DD',
    searchType: 'parking'
  },
];

const NearbyPlacesPanel = ({ 
  location, 
  apiKey, 
  onPlaceSelect, 
  onClose,
  visible = false 
}) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPlaces = async (category) => {
    if (!location || !category) return;
    
    setLoading(true);
    try {
      const result = await getNearbyPlaces(location, apiKey, {
        type: category.searchType,
        radius: 5000, // 5km
        keyword: category.name
      });
      
      if (result.results) {
        // Sort by rating and distance
        const sortedPlaces = result.results
          .filter(place => place.rating && place.rating > 3.0) // Filter decent places
          .sort((a, b) => {
            // Prioritize higher rated places
            if (b.rating !== a.rating) {
              return b.rating - a.rating;
            }
            // Then by proximity if available
            return 0;
          })
          .slice(0, 10); // Limit to top 10
        
        setPlaces(sortedPlaces);
      }
    } catch (error) {
      console.error('Error fetching nearby places:', error);
      Alert.alert('Error', 'Failed to fetch nearby places');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category) => {
    if (selectedCategory?.id === category.id) {
      setSelectedCategory(null);
      setPlaces([]);
    } else {
      setSelectedCategory(category);
      fetchPlaces(category);
    }
  };

  const handlePlaceSelect = (place) => {
    const placeData = {
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      name: place.name,
      address: place.vicinity,
      rating: place.rating,
      placeId: place.place_id
    };
    onPlaceSelect(placeData);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} size={12} color="#FFD700" fill="#FFD700" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" size={12} color="#FFD700" fill="#FFD700" opacity={0.5} />);
    }
    
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} size={12} color="#E0E0E0" />);
    }
    
    return stars;
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Places</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Category Selection */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {PLACE_CATEGORIES.map((category) => {
          const IconComponent = category.icon;
          const isSelected = selectedCategory?.id === category.id;
          
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                { 
                  backgroundColor: isSelected ? category.color : 'white',
                  borderColor: category.color
                }
              ]}
              onPress={() => handleCategorySelect(category)}
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
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Places List */}
      <ScrollView style={styles.placesContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Finding nearby places...</Text>
          </View>
        ) : places.length > 0 ? (
          places.map((place) => (
            <TouchableOpacity
              key={place.place_id}
              style={styles.placeCard}
              onPress={() => handlePlaceSelect(place)}
            >
              <View style={styles.placeInfo}>
                <Text style={styles.placeName} numberOfLines={1}>
                  {place.name}
                </Text>
                <Text style={styles.placeAddress} numberOfLines={1}>
                  {place.vicinity}
                </Text>
                
                <View style={styles.placeDetails}>
                  <View style={styles.ratingContainer}>
                    <View style={styles.starsContainer}>
                      {renderStars(place.rating)}
                    </View>
                    <Text style={styles.ratingText}>
                      {place.rating} ({place.user_ratings_total || 0})
                    </Text>
                  </View>
                  
                  {place.price_level && (
                    <Text style={styles.priceLevel}>
                      {'$'.repeat(place.price_level)}
                    </Text>
                  )}
                </View>

                <View style={styles.placeStatus}>
                  {place.opening_hours?.open_now !== undefined && (
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: place.opening_hours.open_now ? '#4CAF50' : '#F44336' }
                    ]}>
                      <Clock size={10} color="white" />
                      <Text style={styles.statusText}>
                        {place.opening_hours.open_now ? 'Open' : 'Closed'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity 
                style={styles.navigateButton}
                onPress={() => handlePlaceSelect(place)}
              >
                <Navigation size={16} color={colors.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        ) : selectedCategory ? (
          <View style={styles.emptyContainer}>
            <MapPin size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              No {selectedCategory.name.toLowerCase()} found nearby
            </Text>
            <Text style={styles.emptySubtext}>
              Try selecting a different category or location
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MapPin size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              Select a category to find nearby places
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120, // Higher up to avoid buttons
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    maxHeight: '60%', // Smaller to fit better
    elevation: 15, // Higher elevation to stay above buttons
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    zIndex: 1000, // Ensure it's above everything
    marginHorizontal: 16, // Add margins so it doesn't touch edges
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  categoriesContainer: {
    maxHeight: 80,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 70,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  placesContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  placeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 12,
    color: colors.text,
  },
  priceLevel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  placeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
    marginLeft: 2,
  },
  navigateButton: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default NearbyPlacesPanel;
