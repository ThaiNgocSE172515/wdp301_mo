import authApi, { UpdateInfo } from '@/api/authApi';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// BẮT BUỘC: Phải có export default
export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<UpdateInfo>({
    fullName: '',
    avatar: '',
    phone: ''
  });

  useEffect(() => {
    const loadData = async () => {
      const jsonValue = await AsyncStorage.getItem('USER_PROFILE');
      if (jsonValue) {
        const user = JSON.parse(jsonValue);
        setForm({
          fullName: user.profile?.fullName || '',
          avatar: user.profile?.avatar || '',
          phone: user.profile?.phone || ''
        });
      }
    };
    loadData();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setForm({ ...form, avatar: result.assets[0].uri });
    }
  };

  const handleUpdate = async () => {
    if (!form.fullName) return Alert.alert('Lỗi', 'Họ tên là bắt buộc');
    
    try {
      setLoading(true);
      const payload: UpdateInfo = {
        fullName: form.fullName,
        phone: form.phone,
      };
      if (form.avatar && form.avatar !== '') {
         payload.avatar = form.avatar;
      }
      const response = await authApi.updateInfo(payload);
      const updatedUser = response.data?.data?.user;
      if (updatedUser) {
        await AsyncStorage.setItem('USER_PROFILE', JSON.stringify(updatedUser));
      } else {
        const jsonValue = await AsyncStorage.getItem('USER_PROFILE');
        if (jsonValue) {
          let user = JSON.parse(jsonValue);
          user.profile = { 
            ...user.profile, 
            fullName: form.fullName, 
            phone: form.phone 
          };
          if (payload.avatar) user.profile.avatar = payload.avatar;
          
          await AsyncStorage.setItem('USER_PROFILE', JSON.stringify(user));
        }
      }
      Alert.alert('Thành công', 'Hồ sơ đã được cập nhật', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.log('Lỗi API PATCH:', error.response?.data || error.message);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin. Hãy thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Chỉnh sửa hồ sơ</Text>
      </View>
      
      <View style={styles.avatarSection}>
        <View style={styles.avatarWrapper}>
          {form.avatar ? (
            <Image source={{ uri: form.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={50} color="#888" />
            </View>
          )}
          <TouchableOpacity style={styles.cameraIcon} onPress={pickImage}>
            <Ionicons name="camera" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Họ và tên</Text>
        <TextInput 
          style={styles.input}
          value={form.fullName}
          onChangeText={(txt) => setForm({...form, fullName: txt})}
          placeholder="Tên của bạn"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Số điện thoại</Text>
        <TextInput 
          style={styles.input}
          value={form.phone}
          onChangeText={(txt) => setForm({...form, phone: txt})}
          placeholder="Số điện thoại"
          keyboardType="phone-pad"
        />
      </View>

      <TouchableOpacity 
        style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
        onPress={handleUpdate}
        disabled={loading}
      >
        <Text style={styles.saveText}>{loading ? 'Đang lưu...' : 'Lưu thay đổi'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 30 },
  title: { fontSize: 20, fontWeight: 'bold', marginLeft: 15 },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarWrapper: { position: 'relative' },
  avatarImage: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 5, backgroundColor: '#1F222A', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: '#888', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#EEE', borderRadius: 12, padding: 15, fontSize: 16, backgroundColor: '#F9F9F9' },
  saveBtn: { backgroundColor: '#1F222A', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});