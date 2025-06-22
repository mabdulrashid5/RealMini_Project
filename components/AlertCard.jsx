import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Clock } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useAlertsStore } from '@/store/alerts-store';

export const AlertCard = ({ alert }) => {
  const router = useRouter();
  const { markAsRead } = useAlertsStore();
  
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
  
  const handlePress = () => {
    markAsRead(alert.id);
    router.push(`/incident/${alert.incidentId}`);
  };
  
  return (
    <TouchableOpacity 
      style={[styles.container, alert.read ? styles.readContainer : styles.unreadContainer]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Bell size={20} color={alert.read ? colors.textSecondary : colors.primary} />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, alert.read ? styles.readTitle : styles.unreadTitle]}>
          {alert.title}
        </Text>
        
        <Text style={styles.message} numberOfLines={2}>
          {alert.message}
        </Text>
        
        <View style={styles.footer}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={styles.time}>
            {getTimeAgo(alert.createdAt)}
          </Text>
        </View>
      </View>
      
      {!alert.read && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  unreadContainer: {
    backgroundColor: '#F5F7FF',
  },
  readContainer: {
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
    color: colors.text,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  readTitle: {
    fontWeight: '500',
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
    alignSelf: 'center',
  },
}); 