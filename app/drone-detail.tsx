import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// IMPORT HOOK BẠN VỪA TẠO VÀO ĐÂY
import { useDroneDetail } from './../hooks/Drone/useDroneDetail';

const { width } = Dimensions.get('window');

// Ảnh mặc định cho Drone vì API chưa trả về ảnh Drone
const DEFAULT_DRONE_IMG = "https://cdn-icons-png.flaticon.com/512/1830/1830867.png";

export default function DroneDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Gọi Hook để lấy dữ liệu
  const { drone, loading } = useDroneDetail(id);

  // Loading View
  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1F222A" />
        <Text style={{ marginTop: 10, color: '#888' }}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  // Nếu không có dữ liệu
  if (!drone) return null;

  // Format ngày tháng từ API
  const formattedDate = new Date(drone.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

      {/* --- 1. Header --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F222A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{drone.droneId}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* --- 2. Main Image & Info --- */}
        <View style={styles.imageSection}>
          <Image
            source={{ uri: DEFAULT_DRONE_IMG }}
            style={styles.mainImage}
            resizeMode="contain"
          />
          <Text style={styles.modelName}>{drone.model}</Text>
          <Text style={styles.serialText}>SN: {drone.serialNumber}</Text>
          
          <View style={[
            styles.statusBadge,
            { backgroundColor: drone.status === 'Available' ? '#E0F7FA' : '#FFF3E0' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: drone.status === 'Available' ? '#006064' : '#E65100' }
            ]}>
              • {drone.status}
            </Text>
          </View>
        </View>

        {/* --- 3. Drone Specifications --- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Specifications</Text>
          
          <View style={styles.specRow}>
            <View style={styles.specItem}>
              <View style={[styles.iconBox, { backgroundColor: '#E5F1FF' }]}>
                <MaterialCommunityIcons name="arrow-expand-vertical" size={22} color="#0055FF" />
              </View>
              <View>
                <Text style={styles.specLabel}>Max Altitude</Text>
                <Text style={styles.specValue}>{drone.maxAltitude} <Text style={styles.specUnit}>meters</Text></Text>
              </View>
            </View>

            <View style={styles.specItem}>
              <View style={[styles.iconBox, { backgroundColor: '#F0F4F8' }]}>
                <MaterialCommunityIcons name="calendar-check" size={22} color="#546E7A" />
              </View>
              <View>
                <Text style={styles.specLabel}>Registered On</Text>
                <Text style={styles.specValue}>{formattedDate}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- 4. Owner Info --- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Owner Information</Text>
          
          <View style={styles.ownerCard}>
            {/* Nếu API owner có avatar (theo swagger file của bạn) thì hiển thị, không thì dùng icon */}
            {(drone.owner as any)?.profile?.avatar ? (
              <Image 
                source={{ uri: (drone.owner as any).profile.avatar }} 
                style={styles.avatarImg} 
              />
            ) : (
              <Ionicons name="person-circle" size={50} color="#CBD5E1" />
            )}
            
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>
                {drone.owner?.profile?.fullName || "Unknown User"}
              </Text>
              <Text style={styles.ownerEmail}>
                {drone.owner?.email || "No email provided"}
              </Text>
              
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{drone.owner?.role || drone.ownerType}</Text>
              </View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    height: 50,
    position: 'relative',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F222A' },
  backButton: { position: 'absolute', left: 20, zIndex: 10, padding: 5 },

  // Image & Info
  imageSection: { alignItems: 'center', marginTop: 10, marginBottom: 25 },
  mainImage: { width: width * 0.6, height: 150, marginBottom: 15 },
  modelName: { fontSize: 22, fontWeight: 'bold', color: '#1F222A' },
  serialText: { fontSize: 14, color: '#888', marginTop: 4, marginBottom: 10 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '700' },

  // Section Common
  sectionContainer: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 20, 
    shadowColor: '#000', 
    shadowOpacity: 0.04, 
    shadowRadius: 8, 
    elevation: 2 
  },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: '#1F222A', marginBottom: 15 },

  // Specifications
  specRow: { flexDirection: 'column', gap: 15 },
  specItem: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  specLabel: { fontSize: 13, color: '#888', marginBottom: 2 },
  specValue: { fontSize: 16, fontWeight: 'bold', color: '#1F222A' },
  specUnit: { fontSize: 13, fontWeight: 'normal', color: '#666' },

  // Owner Info
  ownerCard: { flexDirection: 'row', alignItems: 'center' },
  avatarImg: { width: 50, height: 50, borderRadius: 25 },
  ownerInfo: { marginLeft: 15, flex: 1 },
  ownerName: { fontSize: 16, fontWeight: 'bold', color: '#1F222A', marginBottom: 2 },
  ownerEmail: { fontSize: 13, color: '#666', marginBottom: 8 },
  roleBadge: { 
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  roleText: { fontSize: 11, fontWeight: '600', color: '#475569' },
});