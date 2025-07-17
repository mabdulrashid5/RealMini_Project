import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  TextInput, 
  Alert, 
  Image, 
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { ChevronRight, Lock, Shield, Eye, MapPin, Bell, X, AlertTriangle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/Button';

const PRIVACY_SETTINGS_KEY = '@privacy_settings';

export default function PrivacyScreen() {
  const { deleteAccount, changePassword, setup2FA, verify2FA } = useAuthStore();
  const router = useRouter();
  const [settings, setSettings] = useState({
    locationSharing: true,
    profileVisibility: true,
    dataCollection: true,
    anonymousReporting: false,
  });
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorQR, setTwoFactorQR] = useState(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(PRIVACY_SETTINGS_KEY);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const toggleSetting = async (key) => {
    try {
      const newSettings = {
        ...settings,
        [key]: !settings[key]
      };
      setSettings(newSettings);
      await AsyncStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsLoading(true);
      const success = await deleteAccount(deletePassword);
      if (success) {
        Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
        router.replace('/(auth)');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setDeletePassword('');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      const success = await changePassword(currentPassword, newPassword);
      if (success) {
        Alert.alert('Success', 'Password changed successfully');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      setIsLoading(true);
      const result = await setup2FA();
      if (result) {
        setTwoFactorQR(result.qrCode);
        setTwoFactorSecret(result.secret);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    try {
      setIsLoading(true);
      const success = await verify2FA(twoFactorCode);
      if (success) {
        Alert.alert('Success', '2FA has been enabled for your account');
        setShow2FAModal(false);
        setTwoFactorCode('');
        setTwoFactorQR(null);
        setTwoFactorSecret(null);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const privacyItems = [
    {
      key: 'locationSharing',
      title: 'Location Sharing',
      description: 'Share your location when reporting incidents',
      icon: <MapPin size={20} color={colors.text} />,
    },
    {
      key: 'profileVisibility',
      title: 'Profile Visibility',
      description: 'Make your profile visible to other users',
      icon: <Eye size={20} color={colors.text} />,
    },
    {
      key: 'dataCollection',
      title: 'Data Collection',
      description: 'Allow data collection to improve app experience',
      icon: <Shield size={20} color={colors.text} />,
    },
    {
      key: 'anonymousReporting',
      title: 'Anonymous Reporting',
      description: 'Report incidents without showing your identity',
      icon: <Bell size={20} color={colors.text} />,
    },
  ];

  const securityItems = [
    {
      title: 'Change Password',
      description: 'Update your account password',
      icon: <Lock size={20} color={colors.text} />,
      onPress: () => setShowPasswordModal(true),
    },
    {
      title: 'Two-Factor Authentication',
      description: 'Add an extra layer of security',
      icon: <Shield size={20} color={colors.text} />,
      onPress: () => {
        setShow2FAModal(true);
        handleSetup2FA();
      },
    },
    {
      title: 'Delete Account',
      description: 'Permanently delete your account',
      icon: <AlertTriangle size={20} color={colors.danger} />,
      onPress: () => setShowDeleteModal(true),
      danger: true,
    },
  ];

  return (
    <>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen 
          options={{
            title: 'Privacy & Security',
            headerShadowVisible: false,
          }}
        />
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          <Text style={styles.sectionDescription}>
            Control how your information is shared and used
          </Text>
        </View>

        <View style={styles.settingsList}>
          {privacyItems.map((item) => (
            <View key={item.key} style={styles.settingItem}>
              <View style={styles.settingIcon}>
                {item.icon}
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingDescription}>
                  {item.description}
                </Text>
              </View>
              <Switch
                trackColor={{ 
                  false: colors.border, 
                  true: colors.primary + '40'
                }}
                thumbColor={settings[item.key] ? colors.primary : '#f4f3f4'}
                ios_backgroundColor="#eee"
                onValueChange={() => toggleSetting(item.key)}
                value={settings[item.key]}
                style={styles.switch}
              />
            </View>
          ))}
        </View>

        <View style={[styles.section, styles.securitySection]}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Text style={styles.sectionDescription}>
            Manage your account security settings
          </Text>
        </View>

        <View style={styles.settingsList}>
          {securityItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.settingItem, item.danger ? styles.dangerItem : {}]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.settingIcon, item.danger ? styles.dangerIcon : {}]}>
                {item.icon}
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingDescription}>
                  {item.description}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.footer}>
          Your privacy and security are our top priority
        </Text>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="slide"
        transparent={true}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Delete Account</Text>
                <TouchableOpacity
                  onPress={() => setShowDeleteModal(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDescription}>
                This action cannot be undone. Please enter your password to confirm.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
              />

              <Button
                title="Delete Account"
                onPress={handleDeleteAccount}
                variant="danger"
                loading={isLoading}
                style={styles.deleteButton}
              />
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                  }}
                  style={styles.closeButton}
                >
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDescription}>
                Enter your current password and choose a new one
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Current Password"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
                returnKeyType="next"
              />

              <TextInput
                style={styles.input}
                placeholder="New Password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                returnKeyType="next"
              />

              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                secureTextEntry
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleChangePassword}
              />

              <Button
                title="Change Password"
                onPress={handleChangePassword}
                variant="primary"
                loading={isLoading}
                style={styles.actionButton}
              />
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal
        visible={show2FAModal}
        animationType="slide"
        transparent={true}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Setup 2FA</Text>
                <TouchableOpacity
                  onPress={() => setShow2FAModal(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {twoFactorQR && (
                <>
                  <Text style={styles.modalDescription}>
                    Scan this QR code with your authenticator app
                  </Text>
                  <Image
                    source={{ uri: twoFactorQR }}
                    style={styles.qrCode}
                  />
                  <Text style={styles.secretText}>
                    Manual entry code: {twoFactorSecret}
                  </Text>
                </>
              )}

              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                value={twoFactorCode}
                onChangeText={setTwoFactorCode}
              />

              <Button
                title="Verify and Enable 2FA"
                onPress={handleVerify2FA}
                variant="primary"
                loading={isLoading}
                style={styles.actionButton}
              />
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </>
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
  securitySection: {
    marginTop: 24,
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
  settingsList: {
    paddingTop: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 20,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
    backgroundColor: '#fff',
  },
  dangerItem: {
    backgroundColor: colors.dangerLight,
    borderBottomColor: colors.dangerExtraLight,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerIcon: {
    backgroundColor: colors.dangerExtraLight,
  },
  settingInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  settingDescription: {
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
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
  modalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteButton: {
    marginTop: 8,
  },
  actionButton: {
    marginTop: 8,
  },
  qrCode: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginVertical: 16,
    borderRadius: 8,
  },
  secretText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
}); 