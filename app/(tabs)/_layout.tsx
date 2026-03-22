// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import Mapbox from "@rnmapbox/maps";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
const token = process.env.EXPO_PUBLIC_TOKEN
console.log("🔑 Token lấy từ .env là:", token);
Mapbox.setAccessToken(
  token || ""
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0055FF",
        tabBarInactiveTintColor: "#888",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 0,
          elevation: 5,
          height: Platform.OS === "android" ? 100 : 60,
          paddingBottom: Platform.OS === "android" ? 15 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: Platform.OS === "android" ? 5 : 0,
        },
      }}
    >
      {/* Tab 1: Trang chủ (file index.tsx) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      {/* Tab 2: Trang chủ (file index.tsx) */}
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "map" : "map-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* Tab 3: Favourites */}
      <Tabs.Screen
        name="favourite"
        options={{
          title: "Yêu thích",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "heart" : "heart-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* Tab 4: Profile (file profile.tsx) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
