import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  Dimensions, 
  Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserData } from '@/api/authApi';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const [user, setUser] = useState<UserData | null>(null);
  const [showTerms, setShowTerms] = useState(false); // 2. State quản lý hiển thị Modal
  const router = useRouter();

  useEffect(() => {
    const initData = async () => {
      try {
        // Lấy User Profile
        const jsonValue = await AsyncStorage.getItem('USER_PROFILE');
        if (jsonValue != null) {
          const userdata = JSON.parse(jsonValue);
          setUser(userdata);
        }

        // 3. Kiểm tra đã đồng ý điều khoản chưa
        const hasAgreed = await AsyncStorage.getItem('HAS_AGREED_TOS');
        if (hasAgreed !== 'true') {
          setShowTerms(true); // Chưa đồng ý thì hiện Modal
        }

      } catch (e) {
        console.log("Lỗi lấy dữ liệu", e);
      }
    };
    initData();
  }, []);

  // 4. Hàm xử lý khi nhấn Đồng ý
  const handleAgreeTerms = async () => {
    try {
      await AsyncStorage.setItem('HAS_AGREED_TOS', 'true');
      setShowTerms(false);
    } catch (e) {
      console.log("Lỗi lưu điều khoản", e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* --- 5. Modal Điều khoản --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTerms}
        onRequestClose={() => {
           // Chặn nút Back trên Android, bắt buộc phải nhấn đồng ý
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Điều Khoản & Dịch Vụ</Text>
            
            <View style={styles.modalBody}>
              <ScrollView showsVerticalScrollIndicator={true}>
                <Text style={styles.modalText}>
                  Chào mừng bạn đến với ứng dụng Manager Drone. {'\n\n'}
                  1. <Text style={{fontWeight: 'bold'}}>Quyền riêng tư:</Text> Chúng tôi thu thập vị trí Drone để hiển thị trên bản đồ...{'\n\n'}
                  2. <Text style={{fontWeight: 'bold'}}>Trách nhiệm:</Text> Bạn chịu trách nhiệm về việc điều khiển thiết bị...{'\n\n'}
                  (Vui lòng đọc kỹ trước khi sử dụng)
                </Text>
              </ScrollView>
            </View>

            <TouchableOpacity 
              style={styles.agreeButton} 
              onPress={handleAgreeTerms}
              activeOpacity={0.8}
            >
              <Text style={styles.agreeButtonText}>Tôi đã đọc và Đồng ý</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* --- Hết Modal --- */}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* --- Header --- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Home</Text>
          <View style={styles.avatar} />
        </View>
        <View style={styles.greetingSection}>
          <Text style={styles.userName}>{user ? user.profile.fullName : 'User'}</Text>
          <Text style={styles.welcomeText}>Welcome</Text>
        </View>

        <TouchableOpacity
          style={styles.droneCard}
          activeOpacity={0.9}
          onPress={() => router.push('/my-drones')}
        >
          <View style={styles.droneInfo}>
            <Text style={styles.droneName}>Manager Drone</Text>
            <Text style={styles.droneType}>View list</Text>
            <View style={styles.startBtn}>
              <Ionicons name="list-circle" size={18} color="#1F222A" style={{ marginRight: 5 }} />
              <Text style={styles.startBtnText}>View All</Text>
            </View>
          </View>

          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1830/1830867.png' }}
            style={styles.droneImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>Drone Location</Text>

          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: 10.762622,
                longitude: 106.660172,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker
                coordinate={{
                  latitude: 10.762622,
                  longitude: 106.660172,
                }}
                title="Drone A"
                description="Active"
              />
            </MapView>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  headerTitle: { fontSize: 25, fontWeight: '600', color: '#1F222A', left: 137 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D9D9D9' },
  greetingSection: { marginBottom: 20 },
  userName: { fontSize: 26, fontWeight: 'bold', color: '#1F222A' },
  welcomeText: { fontSize: 14, color: '#A0A0A0', marginTop: 4 },

  // Drone Card
  droneCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 160,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  droneInfo: { flex: 1 },
  droneName: { fontSize: 18, fontWeight: 'bold', color: '#1F222A' },
  droneType: { fontSize: 14, color: '#A0A0A0', marginBottom: 20, marginTop: 5 },
  startBtn: { backgroundColor: '#F5F7FA', flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-start' },
  startBtnText: { fontSize: 12, fontWeight: '600', color: '#1F222A' },
  droneImage: { width: 100, height: 80 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F222A', marginTop: 15, marginBottom: 20 },
  mapSection: {
    marginTop: 25,
  },
  mapContainer: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  map: {
    width: '100%',
    height: '100%',
  },

  // --- 6. Styles cho Modal ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Nền tối mờ
  },
  modalContent: {
    width: width * 0.85,
    height: height * 0.6,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#1F222A'
  },
  modalBody: {
    flex: 1,
    marginBottom: 15,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 10
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  agreeButton: {
    backgroundColor: '#1F222A', // Cùng màu text chính cho đồng bộ
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
  },
  agreeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  }
});