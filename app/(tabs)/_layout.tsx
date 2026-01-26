// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native'; // Import thêm để check hệ điều hành nếu cần

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0055FF',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 5,
          // 👇 Tăng chiều cao lên để chứa đủ padding
          height: Platform.OS === 'android' ? 100 : 60, 
          // 👇 Đẩy icon lên trên một chút để không đụng mép dưới
          paddingBottom: Platform.OS === 'android' ? 15 : 10,
          // (Tùy chọn) Thêm padding trên để icon cân đối hơn
          paddingTop: 10, 
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          // 👇 Thêm margin dưới để chữ không sát đáy quá
          marginBottom: Platform.OS === 'android' ? 5 : 0,
        },
      }}
    >
      {/* Tab 1: Trang chủ (file index.tsx) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* Tab 2: Profile (file home.tsx) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}