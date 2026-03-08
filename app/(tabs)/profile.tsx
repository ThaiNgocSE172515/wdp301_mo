import authApi, { UserData } from '@/api/authApi';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileTab() {
  const [user, setUser] = useState<UserData | null>(null);
  const router = useRouter();
  const getData = async () => {
    try {
      const response = await authApi.info();
      const userData = response.data?.data;
      if (userData) {
        setUser(userData);
        await AsyncStorage.setItem('USER_PROFILE', JSON.stringify(userData));
      }
    } catch (e) {
      console.log('Không gọi được API, dùng tạm ảnh cũ trong máy');
      const jsonValue = await AsyncStorage.getItem('USER_PROFILE');
      if (jsonValue != null) {
        setUser(JSON.parse(jsonValue));
      }
    }
  };
  useFocusEffect(
    useCallback(() => {
      getData();
    }, [])
  );

  const fullName = user?.profile?.fullName?.trim() || 'User';
  const firstLetter = fullName.charAt(0).toUpperCase();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đồng ý',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('ACCESS_TOKEN');
            await AsyncStorage.removeItem('USER_PROFILE');
            router.replace('/(auth)/login');
          } catch (error) {
            console.log('Lỗi khi đăng xuất:', error);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          {/* Hiển thị ảnh thật nếu có URL, nếu không hiện chữ cái đầu */}
          {user?.profile?.avatar ? (
            <Image source={{ uri: user.profile.avatar }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{firstLetter}</Text>
          )}
        </View>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => router.push('/edit-profile')}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="person-outline" size={24} color="#1F222A" />
            <Text style={styles.menuText}>Thông tin cá nhân</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
  header: { alignItems: 'center', paddingTop: 60, marginBottom: 30 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#E0E0E0', marginBottom: 15,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden' 
  },
  avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' }, 
  avatarText: { fontSize: 36, fontWeight: '800', color: '#1F222A' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1F222A' },
  email: { fontSize: 14, color: '#888' },
  menuContainer: { width: '100%', marginBottom: 40 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5'
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuText: { fontSize: 16, fontWeight: '500', marginLeft: 15, color: '#1F222A' },
  logoutBtn: { backgroundColor: '#F5F5F5', paddingVertical: 15, borderRadius: 15, alignItems: 'center' },
  logoutText: { color: '#FF4D4D', fontSize: 16, fontWeight: '600' },
});