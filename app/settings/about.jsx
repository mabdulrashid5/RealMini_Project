import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';
import { ExternalLink, Heart, Shield, Book, Mail, Navigation } from 'lucide-react-native';

export default function AboutScreen() {
  const appVersion = '1.0.0';

  const links = [
    {
      icon: <Book size={20} color={colors.text} />,
      title: 'Terms of Service',
      onPress: () => Linking.openURL('https://roadwatch.com/terms'),
    },
    {
      icon: <Shield size={20} color={colors.text} />,
      title: 'Privacy Policy',
      onPress: () => Linking.openURL('https://roadwatch.com/privacy'),
    },
    {
      icon: <Mail size={20} color={colors.text} />,
      title: 'Contact Us',
      onPress: () => Linking.openURL('mailto:contact@roadwatch.com'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'About RoadWatch',
          headerShadowVisible: false,
        }}
      />
      
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Navigation size={40} color={colors.primary} />
        </View>
        <Text style={styles.appName}>RoadWatch</Text>
        <Text style={styles.version}>Version {appVersion}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.description}>
          RoadWatch is your trusted companion for road safety and incident reporting. 
          Our mission is to create safer roads through community-driven awareness and 
          real-time incident reporting.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Links</Text>
        {links.map((link, index) => (
          <TouchableOpacity
            key={index}
            style={styles.linkItem}
            onPress={link.onPress}
          >
            <View style={styles.linkIcon}>
              {link.icon}
            </View>
            <Text style={styles.linkText}>{link.title}</Text>
            <ExternalLink size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Heart size={16} color={colors.primary} style={styles.heartIcon} />
        <Text style={styles.footerText}>
          Made with love by the RoadWatch Team
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  description: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  heartIcon: {
    marginRight: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
}); 