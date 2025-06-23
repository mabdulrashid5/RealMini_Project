import React from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import { Phone, Ambulance, Shield, AlertTriangle, Flame, LifeBuoy, MapPin } from 'lucide-react-native';
import { colors } from '@/constants/colors';

const emergencyContacts = [
  {
    id: '1',
    name: 'Police Emergency',
    number: '191',
    description: 'For reporting crimes, accidents, and emergencies',
    icon: <Shield size={24} color="#FFFFFF" />,
    color: '#3B82F6',
  },
  {
    id: '2',
    name: 'Ambulance Service',
    number: '193',
    description: 'For medical emergencies and ambulance requests',
    icon: <Ambulance size={24} color="#FFFFFF" />,
    color: '#EF4444',
  },
  {
    id: '3',
    name: 'Fire Service',
    number: '192',
    description: 'For fire emergencies and rescue operations',
    icon: <Flame size={24} color="#FFFFFF" />,
    color: '#F59E0B',
  },
  {
    id: '4',
    name: 'National Disaster',
    number: '112',
    description: 'National emergency response center',
    icon: <AlertTriangle size={24} color="#FFFFFF" />,
    color: '#8B5CF6',
  },
  {
    id: '5',
    name: 'Highway Patrol',
    number: '194',
    description: 'For highway emergencies and assistance',
    icon: <MapPin size={24} color="#FFFFFF" />,
    color: '#10B981',
  },
  {
    id: '6',
    name: 'Coast Guard',
    number: '196',
    description: 'For maritime emergencies and rescue',
    icon: <LifeBuoy size={24} color="#FFFFFF" />,
    color: '#0EA5E9',
  },
];

export default function EmergencyScreen() {
  const handleCall = (number, name) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Emergency Call',
        `In a real mobile app, this would call ${name} at ${number}.`
      );
      return;
    }
    
    const phoneNumber = `tel:${number}`;
    Linking.canOpenURL(phoneNumber)
      .then(supported => {
        if (supported) {
          return Linking.openURL(phoneNumber);
        }
        Alert.alert('Phone number is not available');
      })
      .catch(error => console.error('Error making call', error));
  };

  const renderEmergencyContact = ({ item }) => (
    <View style={styles.contactCard}>
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        {item.icon}
      </View>
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactDescription}>{item.description}</Text>
      </View>
      
      <TouchableOpacity
        style={styles.callContainer}
        onPress={() => handleCall(item.number, item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.numberContainer}>
          <Text style={styles.contactNumber}>{item.number}</Text>
        </View>
        <Phone size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Contacts</Text>
        <Text style={styles.subtitle}>
          Tap on a contact to call immediately in case of emergency
        </Text>
      </View>
      
      <View style={styles.emergencyNote}>
        <AlertTriangle size={20} color={colors.danger} />
        <Text style={styles.emergencyNoteText}>
          For immediate assistance in life-threatening situations
        </Text>
      </View>
      
      <FlatList
        data={emergencyContacts}
        renderItem={renderEmergencyContact}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.contactsList}
        showsVerticalScrollIndicator={false}
      />
      
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          These emergency numbers are for Ghana. Always verify the correct emergency numbers for your location.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  header: {
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emergencyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEEEE',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  emergencyNoteText: {
    fontSize: 14,
    color: colors.danger,
    marginLeft: 8,
    flex: 1,
  },
  contactsList: {
    padding: 16,
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 16,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  callContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    backgroundColor: colors.success,
    borderRadius: 26,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  numberContainer: {
    position: 'absolute',
    top: -24,
  },
  contactNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  disclaimer: {
    padding: 16,
    backgroundColor: colors.background,
  },
  disclaimerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
}); 