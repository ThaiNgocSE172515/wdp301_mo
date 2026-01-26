// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { ImageBackground, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
// 👇 Dùng SafeAreaView của thư viện này để tính toán chuẩn nhất
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthLayout() {
  return (
    <ImageBackground 
      source={require('../../assets/images/bg.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        
        <Stack 
          screenOptions={{ 
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});