import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Alert, Platform, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, Settings, Shield, Award, HelpCircle, Bell, MapPin, Camera, X, Edit2 } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/Button';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || 'User');
  const [editedEmail, setEditedEmail] = useState(user?.email || 'user@example.com');
  
  const handleLogout = () => {
    if (Platform.OS === 'web') {
      logout();
      router.replace('/(auth)/login');
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: () => {
              logout();
              router.replace('/(auth)/login');
            },
          },
        ]
      );
    }
  };

  const handleChangeAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0].uri && user) {
        // Update user avatar in the store
        updateUser({
          ...user,
          avatar: result.assets[0].uri
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    }
  };

  const handleSaveProfile = () => {
    if (!user) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Update user info in the store
    updateUser({
      ...user,
      name: editedName,
      email: editedEmail,
    });
    setIsEditingProfile(false);
  };
  
  const menuItems = [
    {
      icon: <MapPin size={20} color={colors.text} />,
      title: 'My Reports',
      subtitle: 'View incidents you have reported',
      onPress: () => router.push('/my-reports'),
    },
    {
      icon: <Bell size={20} color={colors.text} />,
      title: 'Notification Settings',
      subtitle: 'Manage your notification preferences',
      onPress: () => router.push('/modal'),
    },
    {
      icon: <Settings size={20} color={colors.text} />,
      title: 'Account Settings',
      subtitle: 'Update your profile information',
      onPress: () => setIsEditingProfile(true),
    },
    {
      icon: <Shield size={20} color={colors.text} />,
      title: 'Privacy & Security',
      subtitle: 'Manage your privacy settings',
      onPress: () => router.push('/modal'),
    },
    {
      icon: <HelpCircle size={20} color={colors.text} />,
      title: 'Help & Support',
      subtitle: 'Get help with using the app',
      onPress: () => router.push('/modal'),
    },
    {
      icon: <Award size={20} color={colors.text} />,
      title: 'About',
      subtitle: 'Learn more about Road Safety Reporter',
      onPress: () => router.push('/modal'),
    },
  ];
  
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <TouchableOpacity onPress={handleChangeAvatar} style={styles.avatarContainer}>
            <Image
              source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80' }}
              style={styles.avatar}
            />
            <View style={styles.cameraButton}>
              <Camera size={16} color={colors.text} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.userInfo}>
            <Text style={styles.name}>{user?.name || 'User'}</Text>
            <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsEditingProfile(true)}
            >
              <Edit2 size={14} color={colors.primary} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>8</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>45</Text>
            <Text style={styles.statLabel}>Upvotes</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuIcon}>{item.icon}</View>
            
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      
      <Button
        title="Logout"
        onPress={handleLogout}
        variant="outline"
        style={styles.logoutButton}
        icon={<LogOut size={18} color={colors.primary} />}
      />

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditingProfile}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setIsEditingProfile(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter your name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={editedEmail}
                onChangeText={setEditedEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Button
              title="Save Changes"
              onPress={handleSaveProfile}
              style={styles.saveButton}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.card,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: colors.primary,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  menuContainer: {
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    marginTop: 24,
  },
}); 