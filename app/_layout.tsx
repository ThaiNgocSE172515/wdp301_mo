// app/_layout.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet } from "react-native";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const checktoken = async () => {
      try {
        const token = await AsyncStorage.getItem("ACCESS_TOKEN");
        if (token) {
          try {
            const userProfile = await AsyncStorage.getItem("USER_PROFILE");
            if (userProfile) {
              const user = JSON.parse(userProfile);
              if (user.role === 'FLEET_OPERATOR') {
                router.replace("/(FleetOperator)");
                return;
              }
            }
          } catch (e) {
            console.log("Lỗi parse user profile:", e);
          }
          router.replace("/(tabs)");
        } else {
          router.replace("/(auth)/login");
        }
      } catch (error) {
        console.log("Lỗi check token: ", error);
        router.replace("/(auth)/login");
      }
    };
    checktoken();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

