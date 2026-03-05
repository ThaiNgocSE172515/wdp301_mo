import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ImageBackground, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import authApi from '../../api/authApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomInput from '@/components/CustomInput';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập Email và Mật khẩu');
      return;
    }
    try {
      setLoading(true);
      const response = await authApi.login({ email, password });
      const resData = response.data;
      console.log('Login Result:', resData);
      if (resData && resData.token) {
          await AsyncStorage.setItem('ACCESS_TOKEN', resData.token);
          await AsyncStorage.setItem('USER_PROFILE', JSON.stringify(resData.user));
          console.log("Đã lưu Token và User Profile thành công!");
          router.replace('/(tabs)');
      } else {
          Alert.alert("Lỗi", "Không tìm thấy token trong phản hồi server.");
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Email hoặc mật khẩu không đúng';
      Alert.alert('Đăng nhập thất bại', msg);
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
        <View style={styles.paddingView}>
          <Text style={styles.title}>Welcome</Text>

          {/* Email*/}
          <CustomInput
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={{ borderWidth: 0 }} 
          />
          {/* Password */}
          <CustomInput
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword} 
            rightIcon={showPassword ? "eye" : "eye-off"} 
            onRightIconPress={() => setShowPassword(!showPassword)}
            containerStyle={{ borderWidth: 0 }}
          />

          <TouchableOpacity style={styles.forgotPass}>
            <Text style={styles.forgotPassText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Button Login */}
          <TouchableOpacity 
            style={styles.mainBtn} 
            onPress={handleLogin}
            disabled={loading}
          >
             {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.mainBtnText}>Login</Text>
            )}
          </TouchableOpacity>
          <View style={styles.dividerContainer}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>Or Login with</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity style={styles.googleBtn}>
            <Ionicons name="logo-google" size={24} color="#DB4437" />
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.linkText}>Register Now</Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  paddingView: { paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 60, marginTop: 30, color: '#1F222A' },
  forgotPass: { alignSelf: 'flex-end', marginBottom: 25 },
  forgotPassText: { color: '#ffffff', fontSize: 14 },
  mainBtn: { backgroundColor: '#1F222A', height: 55, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.5)' },
  dividerText: { marginHorizontal: 10, color: '#ffffff' },
  googleBtn: { backgroundColor: '#fff', alignSelf: 'center', padding: 10, borderRadius: 10, width: 60, alignItems: 'center', marginBottom: 40 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: '#ffffff' },
  linkText: { color: '#0055FF', fontWeight: 'bold' },
});