import { UserData } from '@/api/authApi';
import droneApi, { Drone } from '@/api/droneApi'; // IMPORT DRONE API
import { flightSessionApi } from '@/api/flightSessionApi';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList // Thêm FlatList để render danh sách mượt mà
  ,





  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');
const droneImage = "https://cdn-icons-png.flaticon.com/512/1830/1830867.png";

export default function HomeScreen() {
  const [user, setUser] = useState<UserData | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const router = useRouter();

  const fullName = user?.profile?.fullName?.trim() || 'User';
  const firstLetter = fullName.charAt(0).toUpperCase();

  // --- STATE CHO MODAL CHỌN DRONE ---
  const [showDroneModal, setShowDroneModal] = useState(false);
  const [isStartingFlight, setIsStartingFlight] = useState(false);
  
  // STATE LƯU LIST DRONE TỪ API
  const [drones, setDrones] = useState<Drone[]>([]);
  const [isLoadingDrones, setIsLoadingDrones] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('USER_PROFILE');
        if (jsonValue != null) {
          setUser(JSON.parse(jsonValue));
        }
        const hasAgreed = await AsyncStorage.getItem('HAS_AGREED_TOS');
        if (hasAgreed !== 'true') {
          setShowTerms(true);
        }
      } catch (e) {
        console.log("Lỗi lấy dữ liệu", e);
      }
    };
    initData();
  }, []);

  const handleAgreeTerms = async () => {
    try {
      await AsyncStorage.setItem('HAS_AGREED_TOS', 'true');
      setShowTerms(false);
    } catch (e) {
      console.log("Lỗi lưu điều khoản", e);
    }
  };

  // --- HÀM 1: MỞ MODAL & GỌI API LẤY DANH SÁCH DRONE ---
  const handleOpenDroneSelection = async () => {
    setShowDroneModal(true); // Mở modal ngay lập tức
    setIsLoadingDrones(true); // Bật loading
    try {
      // GỌI API GIỐNG NHƯ BÊN MÀN HÌNH MyDronesScreen
      const response = await droneApi.getAll();
      setDrones(response.data); // Lưu data vào state
    } catch (error) {
      console.error('Lỗi gọi API danh sách drone:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách drone. Vui lòng thử lại!');
    } finally {
      setIsLoadingDrones(false); // Tắt loading
    }
  };

  // --- HÀM 2: GỌI API BẮT ĐẦU BAY KHI CHỌN XONG DRONE ---
  const handleSelectDroneToFly = async (droneId: string) => {
    try {
      setIsStartingFlight(true);

      // Gọi API POST /api/flight-sessions/free-flight
      const response = await flightSessionApi.startFreeFlight(droneId);

      setShowDroneModal(false); // Đóng modal

      const sessionId = response._id || response.data?._id;
      router.push({
        pathname: '/map',
        params: { sessionId: sessionId, droneId: droneId }
      });

    } catch (error: any) {
      console.log("Lỗi bắt đầu bay:", error);
      Alert.alert("Lỗi", "Không thể bắt đầu phiên bay. Vui lòng thử lại!");
    } finally {
      setIsStartingFlight(false);
    }
  };

  // --- COMPONENT RENDER TỪNG ITEM TRONG MODAL ---
  const renderDroneItem = ({ item }: { item: Drone }) => {
    // Chỉ những drone có status 'IDLE' hoặc 'Available' mới được chọn
    const isAvailable = item.status === 'IDLE' || item.status === 'Available';

    return (
      <TouchableOpacity
        style={[styles.droneItemBtn, !isAvailable && { opacity: 0.5, backgroundColor: '#f0f0f0' }]}
        disabled={!isAvailable}
        onPress={() => handleSelectDroneToFly(item._id)}
      >
        <Image source={{ uri: droneImage }} style={styles.droneItemImg} resizeMode="contain" />
        <View style={styles.droneItemInfo}>
          <Text style={styles.droneItemName}>{item.model}</Text>
          <Text style={styles.droneItemSN}>SN: {item.serialNumber}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.droneItemStatus, { color: isAvailable ? '#2E7D32' : '#FF3B30' }]}>
            {item.status}
          </Text>
          {isAvailable && <Ionicons name="chevron-forward" size={16} color="#A0A0A0" style={{ marginTop: 5 }} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ... [Modal Điều Khoản giữ nguyên] ... */}

      {/* --- MODAL CHỌN DRONE --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDroneModal}
        onRequestClose={() => setShowDroneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.droneModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Chọn thiết bị cất cánh</Text>
              <TouchableOpacity onPress={() => setShowDroneModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {isStartingFlight ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <Text style={styles.loadingText}>Đang khởi tạo phiên bay...</Text>
              </View>
            ) : isLoadingDrones ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#1F222A" />
                <Text style={styles.loadingText}>Đang tải danh sách thiết bị...</Text>
              </View>
            ) : (
              <FlatList
                data={drones}
                keyExtractor={(item) => item._id}
                renderItem={renderDroneItem}
                style={{ maxHeight: height * 0.5 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', marginVertical: 20, color: '#888' }}>
                    Bạn chưa có thiết bị nào.
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* --- Header --- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Home</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </View>
        </View>
        <View style={styles.greetingSection}>
          <Text style={styles.userName}>{fullName}</Text>
          <Text style={styles.welcomeText}>Welcome</Text>
        </View>

        {/* --- Phần Thiết bị của tôi --- */}
        <Text style={styles.sectionTitle}>Thiết bị của tôi</Text>
        <TouchableOpacity style={styles.droneCard} activeOpacity={0.9} onPress={() => router.push('/my-drones')}>
          <View style={styles.droneInfo}>
            <Text style={styles.droneName}>Manager Drone</Text>
            <Text style={styles.droneType}>View list</Text>
            <View style={styles.startBtn}>
              <Ionicons name="list-circle" size={18} color="#1F222A" style={{ marginRight: 5 }} />
              <Text style={styles.startBtnText}>View All</Text>
            </View>
          </View>
          <Image source={{ uri: droneImage }} style={styles.droneImage} resizeMode="contain" />
        </TouchableOpacity>

        {/* --- Quản lý Phiên Bay --- */}
        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Quản lý phiên bay</Text>
        <View style={styles.flightSessionContainer}>

          {/* NÚT BẮT ĐẦU BAY - GỌI HÀM MỞ MODAL */}
          <TouchableOpacity style={styles.sessionCard} activeOpacity={0.8} onPress={handleOpenDroneSelection}>
            <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="paper-plane" size={24} color="#2E7D32" />
            </View>
            <View style={styles.sessionTextContainer}>
              <Text style={styles.sessionTitle}>Bắt đầu phiên bay</Text>
              <Text style={styles.sessionDesc}>Chọn thiết bị và cất cánh</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A0A0A0" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.sessionCard} activeOpacity={0.8} onPress={() => router.push('/flight-sessions')}>
            <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="time" size={24} color="#1565C0" />
            </View>
            <View style={styles.sessionTextContainer}>
              <Text style={styles.sessionTitle}>Danh sách phiên bay</Text>
              <Text style={styles.sessionDesc}>Xem lại lịch sử hoạt động</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A0A0A0" />
          </TouchableOpacity>

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
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#ffffff', lineHeight: 16 },
  greetingSection: { marginBottom: 20 },
  userName: { fontSize: 26, fontWeight: 'bold', color: '#1F222A' },
  welcomeText: { fontSize: 14, color: '#A0A0A0', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F222A', marginTop: 15, marginBottom: 15 },
  droneCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 160, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  droneInfo: { flex: 1 },
  droneName: { fontSize: 18, fontWeight: 'bold', color: '#1F222A' },
  droneType: { fontSize: 14, color: '#A0A0A0', marginBottom: 20, marginTop: 5 },
  startBtn: { backgroundColor: '#F5F7FA', flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-start' },
  startBtnText: { fontSize: 12, fontWeight: '600', color: '#1F222A' },
  droneImage: { width: 100, height: 80 },
  flightSessionContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  iconContainer: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  sessionTextContainer: { flex: 1 },
  sessionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F222A', marginBottom: 4 },
  sessionDesc: { fontSize: 13, color: '#A0A0A0' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10, marginLeft: 65 },
  
  // --- STYLE CHO MODAL CHỌN DRONE ---
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  droneModalContent: { width: width * 0.9, backgroundColor: 'white', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F222A' },
  loadingContainer: { padding: 30, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#555' },
  droneItemBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#F5F7FA', borderRadius: 12, marginBottom: 10 },
  droneItemImg: { width: 40, height: 40, marginRight: 15 },
  droneItemInfo: { flex: 1 },
  droneItemName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 },
  droneItemSN: { fontSize: 12, color: '#888' },
  droneItemStatus: { fontSize: 12, fontWeight: 'bold' }
});