import missionApi from '@/api/missionApi';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

const MISSION_CATEGORIES = [
  { id: '1', title: 'Khảo sát địa hình', count: 12, icon: 'map', bgColor: '#E3F2FD', iconColor: '#1565C0' },
  { id: '2', title: 'Giám sát an ninh', count: 5, icon: 'shield-checkmark', bgColor: '#E8F5E9', iconColor: '#2E7D32' },
  { id: '3', title: 'Giao hàng', count: 8, icon: 'cube', bgColor: '#FFF3E0', iconColor: '#E65100' },
  { id: '4', title: 'Phun nông nghiệp', count: 3, icon: 'leaf', bgColor: '#FCE4EC', iconColor: '#C2185B' },
];

// --- MOCK DATA: CÁC CHUYẾN BAY HÔM NAY ---
const TODAY_FLIGHTS = [
  { id: 'f1', title: 'Khảo sát khu A', time: '08:30 AM', status: 'Đang bay', drone: 'Drone-X1' },
  { id: 'f2', title: 'Giao hàng đơn #402', time: '10:00 AM', status: 'Chờ cất cánh', drone: 'Drone-D2' },
];

type Mission = {
  _id: string;
  name: string;
  description: string;
  createdBy: {
    profile: {
      fullName: string;
    };
    _id: string;
    email: string;
    role: "FLEET_OPERATOR" | string;
  };
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | string;
  createdAt: string; // hoặc Date nếu bạn parse
  updatedAt: string; // hoặc Date
  __v: number;
};

export default function FleetHomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('Fleet Operator');
  const [missions, setMissions] = useState<Mission[]>([]);
  const firstLetter = userName.charAt(0).toUpperCase();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('USER_PROFILE');
        if (jsonValue != null) {
          const userObj = JSON.parse(jsonValue);
          if (userObj?.profile?.fullName) {
            setUserName(userObj.profile.fullName);
          }
        }
      } catch (e) {
        console.log("Lỗi lấy dữ liệu", e);
      }
    };

    const fetchAllMission = async () => {
      try {
        const response = await missionApi.getAll();
        setMissions(response);
      } catch (e) {
        console.log("Lỗi lấy dữ liệu missions: ", e)
      }
    }
    fetchAllMission();
    fetchUser();
  }, []);

  // console.log(missions);

  // Hàm xử lý đăng xuất
  const handleLogout = () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc chắn muốn thoát tài khoản?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  const getStatusStyle = (status: any) => {
    switch (status) {
      case 'IN_PROGRESS': return { color: '#2E7D32', bg: '#2E7D3220', text: 'Đang bay' };
      case 'COMPLETED': return { color: '#1565C0', bg: '#1565C020', text: 'Hoàn thành' };
      case 'DRAFT': return { color: '#E65100', bg: '#E6510020', text: 'Bản nháp' };
      default: return { color: '#757575', bg: '#75757520', text: status || 'Không rõ' };
    }
  };

  const formatDate = (isoString: any) => {
    if (!isoString) return 'Chưa có ngày';
    const date = new Date(isoString);
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* --- Header --- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Missions</Text>
          {/* Nút Avatar kèm chức năng Đăng xuất */}
          <TouchableOpacity style={styles.avatar} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.greetingSection}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.welcomeText}>Quản lý kế hoạch bay & Nhiệm vụ</Text>
        </View>

        {/* --- Phần Danh mục kế hoạch bay --- */}
        <Text style={styles.sectionTitle}>Danh mục kế hoạch</Text>
        <View style={styles.categoryGrid}>
          {MISSION_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryCard}
              activeOpacity={0.8}
              // Chuyển hướng sang màn List, truyền theo ID hoặc Tên danh mục
              onPress={() => router.push({ pathname: '/(FleetOperator)/mission-list', params: { categoryId: cat.id, categoryName: cat.title } })}
            >
              <View style={[styles.iconBox, { backgroundColor: cat.bgColor }]}>
                <Ionicons name={cat.icon as any} size={28} color={cat.iconColor} />
              </View>
              <Text style={styles.catTitle} numberOfLines={2}>{cat.title}</Text>
              <Text style={styles.catCount}>{cat.count} kế hoạch</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* --- Phần Danh sách chuyến bay nhanh --- */}
        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Chuyến bay hôm nay</Text>
        <View style={styles.flightListContainer}>
          {missions.map((mission, index) => (
            <View key={index}>
              <TouchableOpacity
                style={styles.flightCard}
                activeOpacity={0.8}
                // Thêm sự kiện chuyển hướng sang màn Detail khi bấm vào chuyến bay
                onPress={() => router.push({ pathname: '/(FleetOperator)/mission-detail', params: { missionId: mission._id } })}
              >
                <View style={styles.flightIconContainer}>
                  <Ionicons name="paper-plane" size={20} color="#1F222A" />
                </View>
                <View style={styles.flightInfo}>
                  <Text style={styles.flightTitle}>{mission.name}</Text>
                  <Text style={styles.flightDesc}>{formatDate(mission.updatedAt)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[
                    styles.flightStatus,
                    getStatusStyle(mission.status),
                  ]}>
                    {mission.status}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#A0A0A0" style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>

              {/* Divider (không hiển thị ở item cuối cùng) */}
              {index < TODAY_FLIGHTS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  scrollContent: { padding: 20, paddingBottom: 50 },

  // Header & Greeting
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  headerTitle: { fontSize: 25, fontWeight: '600', color: '#1F222A', left: '40%' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#ffffff', lineHeight: 16 },
  greetingSection: { marginBottom: 25 },
  userName: { fontSize: 26, fontWeight: 'bold', color: '#1F222A' },
  welcomeText: { fontSize: 14, color: '#A0A0A0', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F222A', marginBottom: 15 },

  // Grid Danh mục
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryCard: {
    width: (width - 60) / 2, // 2 cột, trừ đi padding 2 bên và khoảng cách giữa 2 thẻ
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  catTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F222A',
    marginBottom: 5,
  },
  catCount: {
    fontSize: 12,
    color: '#A0A0A0',
    fontWeight: '500',
  },

  // Danh sách chuyến bay nhanh
  flightListContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  flightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  flightIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  flightInfo: {
    flex: 1,
  },
  flightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F222A',
    marginBottom: 4,
  },
  flightDesc: {
    fontSize: 13,
    color: '#888',
  },
  flightStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 5,
    marginLeft: 60,
  },
});