import React from 'react';
import { Tabs } from 'expo-router';
import { MapPin, Phone, Plus, User, Bell } from 'lucide-react-native';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TabLayout() {
  const router = useRouter();
  
  const handleReportPress = () => {
    router.push('/report');
  };
  
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarStyle: {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              height: 75,
              paddingTop: -2,
              paddingBottom: 12,
              backgroundColor: colors.background,
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: -2,
              },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 8,
            },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Map",
            tabBarIcon: ({ color }) => <MapPin size={24} color={color} />,
            headerShown: false,
          }}
        />
        
        <Tabs.Screen
          name="emergency"
          options={{
            title: "Emergency",
            tabBarIcon: ({ color }) => <Phone size={24} color={color} />,
            headerShown: false,
          }}
        />
        
        <Tabs.Screen
          name="report-tab"
          options={{
            title: "Report",
            tabBarButton: (props) => (
              <TouchableOpacity
                style={styles.reportButton}
                onPress={handleReportPress}
                activeOpacity={0.8}
              >
                <View style={styles.reportButtonInner}>
                  <Plus size={24} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ),
            headerShown: false,
          }}
        />
        
        <Tabs.Screen
          name="incidents"
          options={{
            title: "Alerts",
            tabBarIcon: ({ color }) => <Bell size={24} color={color} />,
            headerShown: false,
          }}
        />
        
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <User size={24} color={color} />,
            headerShown: false,
          }}
        />
      </Tabs>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  reportButton: {
    top: -25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
}); 