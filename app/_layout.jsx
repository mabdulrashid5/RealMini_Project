import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/colors";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CustomSplashScreen from '@/components/CustomSplashScreen';

export const unstable_settings = {
  initialRouteName: "(auth)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });
  const [isCustomSplashVisible, setIsCustomSplashVisible] = useState(true);
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    if (error) {
      console.error(error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Initialize auth state when app loads
  useEffect(() => {
    if (loaded) {
      const { initializeAuth, isAuthenticated } = require('@/store/auth-store').useAuthStore.getState();
      initializeAuth()
        .then(() => {
          // If user is authenticated, go to tabs, otherwise auth flow
          setInitialRoute(isAuthenticated ? "(tabs)" : "(auth)");
        })
        .catch(console.error);
    }
  }, [loaded]);

  if (!loaded || !initialRoute) {
    return null;
  }

  if (isCustomSplashVisible) {
    return <CustomSplashScreen onComplete={() => setIsCustomSplashVisible(false)} />;
  }

  return <RootLayoutNav initialRoute={initialRoute} />;
}

function RootLayoutNav({ initialRoute }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack initialRouteName={initialRoute}
        screenOptions={{
          headerBackTitle: "Back",
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: colors.card,
          },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="incident/[id]" 
          options={{ 
            title: "Incident Details",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="report" 
          options={{ 
            title: "Report Incident",
            presentation: "modal",
          }} 
        />
        <Stack.Screen 
          name="my-reports" 
          options={{ 
            title: "My Reports",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="settings/notifications" 
          options={{ 
            title: "Notifications",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="settings/privacy" 
          options={{ 
            title: "Privacy & Security",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="settings/help" 
          options={{ 
            title: "Help & Support",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="settings/about" 
          options={{ 
            title: "About",
            presentation: "card",
          }} 
        />
      </Stack>
    </GestureHandlerRootView>
  );
} 