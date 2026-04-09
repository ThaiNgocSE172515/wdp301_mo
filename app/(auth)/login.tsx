import CustomInput from '@/components/CustomInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import authApi from '../../api/authApi';

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
        await AsyncStorage.setItem('USER_PROFILE_ID', JSON.stringify(resData.user["_id"]));
        console.log("Đã lưu Token và User Profile thành công!");
        console.log(resData.user.role);
        if (resData.user.role === 'FLEET_OPERATOR') {
          router.replace('/(FleetOperator)');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        Alert.alert("Lỗi", "Không tìm thấy token trong phản hồi server.");
      }

    } catch (error: any) {
      const msg = error.response?.data?.message || 'Email hoặc mật khẩu không đúng';
      console.log(error);
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
          <Text style={styles.title}>Chào mừng</Text>

          {/* Email*/}
          <CustomInput
            placeholder="Nhập email của bạn"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={{ borderWidth: 0 }}
          />
          {/* Password */}
          <CustomInput
            placeholder="Nhập mật khẩu của bạn"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? "eye" : "eye-off"}
            onRightIconPress={() => setShowPassword(!showPassword)}
            containerStyle={{ borderWidth: 0 }}
          />

          {/* <TouchableOpacity style={styles.forgotPass}>
            <Text style={styles.forgotPassText}>Quên mật khẩu?</Text>
          </TouchableOpacity> */}

          {/* Button Login */}
          <TouchableOpacity
            style={styles.mainBtn}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.mainBtnText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Bạn chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.linkText}>Đăng ký ngay</Text>
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
  mainBtn: { backgroundColor: '#1F222A', height: 55, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: '#ffffff' },
  linkText: { color: '#000000', fontWeight: 'bold' },
});