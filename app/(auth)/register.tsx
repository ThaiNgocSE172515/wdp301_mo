import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ImageBackground, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import authApi from '../../api/authApi'; 
import CustomInput from '../../components/CustomInput'; 

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); 

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setLoading(true); 
      await authApi.register({ 
        email, 
        password, 
        fullName: username 
      });
      
      Alert.alert('Thành công', 'Đăng ký tài khoản thành công!', [
        { text: 'Đăng nhập ngay', onPress: () => router.push('/(auth)/login') }
      ]);

    } catch (error: any) {
      const msg = error.response?.data?.message || 'Đăng ký thất bại, vui lòng thử lại';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false); 
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/bg.png')} 
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.paddingView}>
          
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="black" />
          </TouchableOpacity>
          
          {/* 1. Username */}
          <CustomInput 
            placeholder="Username" 
            value={username}
            onChangeText={setUsername}
            containerStyle={styles.inputStyle} 
          />

          {/* 2. Email */}
          <CustomInput 
            placeholder="Email" 
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={styles.inputStyle}
          />

          {/* 3. Password (Có thêm icon mắt) */}
          <CustomInput 
            placeholder="Password" 
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? "eye" : "eye-off"}
            onRightIconPress={() => setShowPassword(!showPassword)}
            containerStyle={styles.inputStyle}
          />

          {/* 4. Confirm Password (Có thêm icon mắt) */}
          <CustomInput 
            placeholder="Confirm password" 
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword} 
            rightIcon={showConfirmPassword ? "eye" : "eye-off"}
            onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
            containerStyle={styles.inputStyle}
          />

          {/* Button Register */}
          <TouchableOpacity 
            style={styles.mainBtn} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.mainBtnText}>Register</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.linkText}>Login Now</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  paddingView: { paddingHorizontal: 20, paddingTop: 20 },
  backButton: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 50 },
    inputStyle: { 
    borderRadius: 8, 
    borderWidth: 0,  
    marginBottom: 15 
  },  
  mainBtn: { backgroundColor: '#1F222A', height: 55, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 30 },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: '#1F222A' },
  linkText: { color: '#0055FF', fontWeight: 'bold' },
});