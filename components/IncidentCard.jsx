import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Clock, ThumbsUp, AlertTriangle, Car, Shield } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useIncidentsStore } from '@/store/incidents-store';

export const IncidentCard = ({ 
  incident,
  compact = false,
  onPress
}) => {
  const router = useRouter();
  const { upvoteIncident } = useIncidentsStore();
  
  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };
  
  const getIncidentIcon = (type) => {
    switch (type) {
      case 'accident':
        return <Car size={20} color={colors.incident.accident} />;
      case 'hazard':
        return <AlertTriangle size={20} color={colors.incident.hazard} />;
      case 'others':
        return <Shield size={20} color={colors.incident.others} />;
      default:
        return <AlertTriangle size={20} color={colors.incident.hazard} />;
    }
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
    upvoteIncident(incident.id);
  };
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/incident/${incident.id}`);
    }
  };
  
  if (compact) {
    return (
      <TouchableOpacity 
        style={styles.compactContainer}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.compactHeader}>
          {getIncidentIcon(incident.type)}
          <Text style={styles.compactTitle} numberOfLines={1}>
            {incident.title}
          </Text>
        </View>
        
        <View style={styles.compactFooter}>
          <View style={styles.compactLocation}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={styles.compactLocationText} numberOfLines={1}>
              {incident.location.address || 'Unknown location'}
            </Text>
          </View>
          
          <View style={styles.compactTime}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={styles.compactTimeText}>
              {getTimeAgo(incident.reportedAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          {getIncidentIcon(incident.type)}
          <Text style={styles.type}>
            {incident.type.charAt(0).toUpperCase() + incident.type.slice(1)}
          </Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incident.status) }]}>
          <Text style={styles.statusText}>
            {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.title}>{incident.title}</Text>
      
      {incident.images && incident.images.length > 0 && (
        <Image 
          source={{ uri: incident.images[0] }} 
          style={styles.image}
          resizeMode="cover"
        />
      )}
      
      <Text style={styles.description} numberOfLines={2}>
        {incident.description}
      </Text>
      
      <View style={styles.footer}>
        <View style={styles.locationContainer}>
          <MapPin size={16} color={colors.textSecondary} />
          <Text style={styles.location} numberOfLines={1}>
            {incident.location.address || 'Unknown location'}
          </Text>
        </View>
        
        <View style={styles.timeContainer}>
          <Clock size={16} color={colors.textSecondary} />
          <Text style={styles.time}>
            {getTimeAgo(incident.reportedAt)}
          </Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.upvoteButton}
          onPress={handleUpvote}
        >
          <ThumbsUp size={16} color={colors.primary} />
          <Text style={styles.upvoteCount}>
            {Array.isArray(incident.upvotes) ? incident.upvotes.length : 0}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  type: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  upvoteCount: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 4,
  },
  compactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactLocation: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  compactLocationText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  compactTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactTimeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
}); 