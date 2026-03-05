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

