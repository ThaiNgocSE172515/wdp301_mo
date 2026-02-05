import { UserData } from '@/api/authApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileTab() {
  const [user, setUser] = useState<UserData | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('USER_PROFILE');
        if (jsonValue != null) {
          const userdata = JSON.parse(jsonValue);
          setUser(userdata);
        }
      } catch (e) {
        console.log('Lỗi lấy dữ liệu');
      }
    };
    getData();
  }, []);

  // Avatar initials giống Home
  const fullName = user?.profile?.fullName?.trim() || 'User';
  const firstLetter = fullName.charAt(0).toUpperCase();

  // --- HÀM XỬ LÝ ĐĂNG XUẤT ---
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
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>{firstLetter}</Text>
      </View>

      <Text style={styles.name}>{fullName}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    backgroundColor: '#fff',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E0E0',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1F222A',
    lineHeight: 36, // tránh lệch chữ trên Android
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F222A',
  },
  email: {
    fontSize: 16,
    color: '#888',
    marginBottom: 40,
  },
  logoutBtn: {
    backgroundColor: '#202020',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
