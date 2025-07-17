import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Animated } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState({
    newIncidents: true,
    nearbyAlerts: true,
    statusUpdates: true,
    communityMessages: false,
    emailNotifications: true,
    emergencyAlerts: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (savedSettings) {
        setNotifications(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const toggleSwitch = async (key) => {
    try {
      const newSettings = {
        ...notifications,
        [key]: !notifications[key]
      };
      setNotifications(newSettings);
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const notificationItems = [
    {
      key: 'newIncidents',
      title: 'New Incidents',
      description: 'Get notified when new incidents are reported in your area',
    },
    {
      key: 'nearbyAlerts',
      title: 'Nearby Alerts',
      description: 'Receive alerts about incidents near your current location',
    },
    {
      key: 'statusUpdates',
      title: 'Status Updates',
      description: 'Get updates when the status of your reported incidents changes',
    },
    {
      key: 'communityMessages',
      title: 'Community Messages',
      description: 'Receive messages and updates from your local community',
    },
    {
      key: 'emailNotifications',
      title: 'Email Notifications',
      description: 'Receive important updates via email',
    },
    {
      key: 'emergencyAlerts',
      title: 'Emergency Alerts',
      description: 'High-priority alerts for emergency situations',
    },
  ];

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen 
        options={{
          title: 'Notification Settings',
          headerShadowVisible: false,
        }}
      />
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>
        <Text style={styles.sectionDescription}>
          Configure which notifications you'd like to receive
        </Text>
      </View>

      <View style={styles.notificationList}>
        {notificationItems.map((item) => (
          <View key={item.key} style={styles.notificationItem}>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationDescription}>
                {item.description}
              </Text>
            </View>
            <Switch
              trackColor={{ 
                false: colors.border, 
                true: colors.primary + '40'
              }}
              thumbColor={notifications[item.key] ? colors.primary : '#f4f3f4'}
              ios_backgroundColor="#eee"
              onValueChange={() => toggleSwitch(item.key)}
              value={notifications[item.key]}
              style={styles.switch}
            />
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        You can change these settings at any time
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  section: {
    padding: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  notificationList: {
    paddingTop: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingVertical: 20,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
    backgroundColor: '#fff',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  notificationDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  switch: {
    transform: [{ scale: 0.9 }],
  },
  footer: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
    letterSpacing: -0.2,
  },
}); 