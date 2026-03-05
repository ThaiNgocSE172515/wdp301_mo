import droneApi, { Drone } from '@/api/droneApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DroneDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 1. Chỉ lấy ID từ params
  const { id } = useLocalSearchParams<{ id: string }>();

  // 2. State lưu dữ liệu từ API
  const [drone, setDrone] = useState<Drone | null>(null);
  const [loading, setLoading] = useState(true);

  // 3. Hàm gọi API lấy chi tiết
  useEffect(() => {
    const fetchDroneDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await droneApi.getDetail(id);
        console.log("Detail Data:", response.data);
        setDrone(response.data);
      } catch (error) {
        console.error(error);
        Alert.alert("Lỗi", "Không thể tải thông tin Drone");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchDroneDetail();
  }, [id]);

  // Loading View
  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1F222A" />
      </View>
    );
  }

  // Nếu không có dữ liệu
  if (!drone) return null;

  // Dữ liệu giả lập cho UI (vì API chưa có)
  const batteryLevel = 85;
  const speed = 45;
  const wind = 12;
  const recordTime = 1.5;
  const droneImage = "data:image/jpeg;base64,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";

  const handleNavigation = () => {
    router.push({
      pathname: "/map",
      params: { connectedDroneId: drone.droneId }
    })
  }
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

      {/* --- 1. Header (Đã sửa) --- */}
      <View style={styles.header}>
        {/* Nút Back dùng Absolute Positioning */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F222A" />
        </TouchableOpacity>

        {/* Text sẽ tự động nằm giữa do header có justifyContent: center */}
        <Text style={styles.headerTitle}>{drone.droneId}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* --- 2. Main Image & Info --- */}
        <View style={styles.imageSection}>
          <Image
            source={{ uri: droneImage }}
            style={styles.mainImage}
            resizeMode="contain"
          />
          {/* Hiển thị Serial Number & Status từ API */}
          <Text style={styles.modelName}>{drone.model}</Text>
          <Text style={styles.serialText}>SN: {drone.serialNumber}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: drone.status === 'Available' ? '#E0F7FA' : '#FFF3E0' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: drone.status === 'Available' ? '#006064' : '#E65100' }
            ]}>{drone.status}</Text>
          </View>
        </View>

        {/* --- 3. Battery Section --- */}
        <View style={styles.sectionContainer}>
          <View style={styles.batteryHeader}>
            <Text style={styles.sectionLabel}>Battery Level</Text>
            <Text style={styles.batteryPercent}>{batteryLevel}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${batteryLevel}%` }]} />
          </View>
        </View>

        {/* --- 4. Grid Stats --- */}
        <View style={styles.statsRow}>
          {/* Max Altitude (DỮ LIỆU THẬT TỪ API) */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#E5F1FF' }]}>
              <MaterialCommunityIcons name="arrow-expand-vertical" size={24} color="#0055FF" />
            </View>
            <Text style={styles.statLabel}>Max Alt</Text>
            <Text style={styles.statValue}>{drone.maxAltitude}</Text>
            <Text style={styles.statUnit}>meters</Text>
          </View>

          {/* Speed (Giả lập) */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FFECE5' }]}>
              <MaterialCommunityIcons name="speedometer" size={24} color="#FF6B6B" />
            </View>
            <Text style={styles.statLabel}>Speed</Text>
            <Text style={styles.statValue}>{speed}</Text>
            <Text style={styles.statUnit}>km/h</Text>
          </View>

          {/* Wind (Giả lập) */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FFF5E5' }]}>
              <MaterialCommunityIcons name="weather-windy" size={24} color="#FF9500" />
            </View>
            <Text style={styles.statLabel}>Wind Res</Text>
            <Text style={styles.statValue}>{wind}</Text>
            <Text style={styles.statUnit}>Level</Text>
          </View>
        </View>

        {/* --- 5. Recording Time (Giả lập) --- */}
        <View style={styles.recordCard}>
          <View style={styles.recordHeader}>
            <View style={[styles.statIconBox, { backgroundColor: '#FFECE5', width: 40, height: 40 }]}>
              <Ionicons name="videocam" size={20} color="#FF6B6B" />
            </View>
            <View style={{ marginLeft: 15 }}>
              <Text style={styles.recordLabel}>Flight Time Left</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={styles.recordTime}>{recordTime}</Text>
                <Text style={styles.recordUnit}> hrs</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.connectButton}
          activeOpacity={0.8}
          onPress={() => handleNavigation()}
        >
          <Ionicons name="wifi" size={24} color="#FFF" />
          <Text style={styles.connectButtonText}>Connect</Text>
        </TouchableOpacity>


        {/* --- 6. Chủ sở hữu--- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Owner Info</Text>
          <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="person-circle-outline" size={40} color="#666" />
            <View style={{ marginLeft: 10 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                {drone.owner?.profile?.fullName || "Unknown User"}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },

  // --- Header Styles (Đã cập nhật) ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Căn giữa nội dung (Text)
    paddingVertical: 10,
    paddingHorizontal: 20,
    height: 50,              // Chiều cao cố định
    position: 'relative',    // Mốc tọa độ
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F222A'
  },

  // Style cho nút Back (Neo sang trái)
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    padding: 5,
  },

  // Image & Info
  imageSection: { alignItems: 'center', marginTop: 10, marginBottom: 30 },
  mainImage: { width: width * 0.8, height: 180, marginBottom: 15 },
  modelName: { fontSize: 22, fontWeight: 'bold', color: '#1F222A' },
  serialText: { fontSize: 14, color: '#888', marginTop: 4, marginBottom: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },

  // Section Common
  sectionContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#1F222A' },

  // Battery
  batteryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  batteryPercent: { fontSize: 14, color: '#1F222A', fontWeight: 'bold' },
  progressBarBg: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#00C2E0', borderRadius: 4 },

  // Stats Grid
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: {
    backgroundColor: '#fff', width: (width - 60) / 3, padding: 15, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 2
  },
  statIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statLabel: { fontSize: 12, color: '#A0A0A0', marginBottom: 5 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#1F222A' },
  statUnit: { fontSize: 10, color: '#A0A0A0', marginTop: 2 },

  // Record Card
  recordCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
  recordHeader: { flexDirection: 'row', alignItems: 'center' },
  recordLabel: { fontSize: 14, fontWeight: '600', color: '#1F222A', marginBottom: 4 },
  recordTime: { fontSize: 24, fontWeight: 'bold', color: '#1F222A' },
  recordUnit: { fontSize: 14, color: '#A0A0A0' },
  connectButton: {
    backgroundColor: '#0055FF', // Màu xanh lam nổi bật
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#0055FF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  connectButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8, // Tạo khoảng cách với icon wifi
  },
});