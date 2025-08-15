import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Share, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MapPin, Clock, ThumbsUp, Share2, Flag, CheckCircle } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useIncidentsStore } from '@/store/incidents-store';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/Button';

// Mock map component for web compatibility
const MapView = ({ children, style, ...props }) => {
  return (
    <View style={[styles.mapFallback, style]} {...props}>
      <Text style={styles.mapFallbackText}>
        Map View
      </Text>
      <Text style={styles.mapFallbackSubtext}>
        Interactive map would display here on a mobile device
      </Text>
      {children}
    </View>
  );
};

const Marker = ({ coordinate, ...props }) => {
  return (
    <View {...props} style={styles.marker}>
      <MapPin size={24} color={colors.primary} />
    </View>
  );
};

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams();
  const { incidents, upvoteIncident, resolveIncident, isLoading } = useIncidentsStore();
  const { user } = useAuthStore();
  const [incident, setIncident] = useState(null);
  const canResolve = user?.permissions?.includes('resolve');
  
  useEffect(() => {
    if (incidents.length > 0 && id) {
      const foundIncident = incidents.find(inc => inc.id === id);
      if (foundIncident) {
        setIncident(foundIncident);
      }
    }
  }, [incidents, id]);
  
  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#F5A623';
      case 'verified':
        return '#4CD964';
      case 'resolved':
        return '#8E8E93';
      default:
        return '#F5A623';
    }
  };
  
  const handleUpvote = () => {
    if (incident) {
      upvoteIncident(incident.id);
    }
  };
  
  const handleResolve = () => {
    if (incident) {
      resolveIncident(incident.id);
    }
  };
  
  const handleShare = async () => {
    if (!incident) return;
    
    try {
      await Share.share({
        message: `Check out this ${incident.type} report: ${incident.title} at ${incident.location.address}`,
        title: `Road Safety Report: ${incident.title}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  if (isLoading || !incident) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incident.status) }]}>
            <Text style={styles.statusText}>
              {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
            </Text>
          </View>
          
          <Text style={styles.type}>
            {incident.type.charAt(0).toUpperCase() + incident.type.slice(1)}
          </Text>
        </View>
        
        <Text style={styles.title}>{incident.title}</Text>
        
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {getTimeAgo(incident.reportedAt)}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <MapPin size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {incident.location.address || 'Unknown location'}
            </Text>
          </View>
        </View>
      </View>
      
      {incident.images && incident.images.length > 0 && (
        <Image 
          source={{ uri: incident.images[0] }} 
          style={styles.image}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{incident.description}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: incident.location.latitude,
            longitude: incident.location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{
              latitude: incident.location.latitude,
              longitude: incident.location.longitude,
            }}
          />
        </MapView>
        
        <Text style={styles.address}>
          {incident.location.address || 'Unknown location'}
        </Text>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleUpvote}
        >
          <ThumbsUp 
            size={20} 
            color={colors.text} 
          />
          <Text style={styles.actionText}>
            {incident.upvotes} Upvotes
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
        >
          <Share2 size={20} color={colors.text} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
        >
          <Flag size={20} color={colors.text} />
          <Text style={styles.actionText}>Report</Text>
        </TouchableOpacity>
      </View>
      
      {canResolve && incident.status !== 'resolved' && (
        <Button
          title="Mark as Resolved"
          onPress={handleResolve}
          icon={<CheckCircle size={18} color="#FFFFFF" />}
          style={styles.resolveButton}
        />
      )}
    </ScrollView>
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
  header: {
    padding: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  type: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },
  image: {
    width: '100%',
    height: 200,
  },
  section: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  map: {
    width: '100%',
    height: 200,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapFallback: {
    width: '100%',
    height: 200,
    backgroundColor: colors.card,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapFallbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  mapFallbackSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  marker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12,
    marginTop: -24,
  },
  address: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text,
  },
  resolveButton: {
    margin: 16,
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
  },
}); 