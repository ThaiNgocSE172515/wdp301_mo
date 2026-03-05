// app/index.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ImageBackground 
      source={require('../assets/images/bg.png')} 
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.contentContainer}>
        <TouchableOpacity 
          style={styles.loginBtn} 
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.registerBtn}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.registerText}>Register</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end', 
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 80, 
  },
  loginBtn: {
    width: '100%',
    backgroundColor: '#1F222A',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  loginText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  registerBtn: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  registerText: { color: '#000', fontSize: 16, fontWeight: '600' },
});