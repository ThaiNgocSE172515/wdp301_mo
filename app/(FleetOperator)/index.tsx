import missionApi from '@/api/missionApi';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// --- MOCK DATA: Removed, using real data ---

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

  useFocusEffect(
    useCallback(() => {
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
    }, [])
  );

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
      case 'SCHEDULED': return { color: '#8E24AA', bg: '#8E24AA20', text: 'Đã lên lịch' };
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
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 15}}>
              <TouchableOpacity onPress={() => router.push('/(FleetOperator)/create-mission')}>
                  <View style={styles.addBtn}>
                      <Ionicons name="add" size={24} color="#fff" />
                  </View>
              </TouchableOpacity>
              {/* Nút Avatar kèm chức năng Đăng xuất */}
              <TouchableOpacity style={styles.avatar} onPress={handleLogout} activeOpacity={0.7}>
                <Text style={styles.avatarText}>{firstLetter}</Text>
              </TouchableOpacity>
          </View>
        </View>

        <View style={styles.greetingSection}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.welcomeText}>Quản lý kế hoạch bay & Nhiệm vụ</Text>
        </View>

        {/* --- Phần Nút Truy Cập Nhanh (Thay thế category map) --- */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.mainActionCard}
            activeOpacity={0.8}
            onPress={() => router.push('/(FleetOperator)/mission-list')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="map" size={32} color="#1565C0" />
            </View>
            <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Tất cả Nhiệm vụ</Text>
                <Text style={styles.actionDesc}>Quản lý và theo dõi toàn bộ nhiệm vụ bay</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#1565C0" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            {/* Nút Quản lý Drone */}
            <TouchableOpacity 
                style={styles.subActionCard} 
                activeOpacity={0.8}
                onPress={() => router.push('/my-drones')}
            >
                <View style={[styles.subActionIconBox, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="hardware-chip" size={28} color="#2E7D32" />
                </View>
                <Text style={styles.subActionTitle}>Drones</Text>
            </TouchableOpacity>

            {/* Nút Quản lý Flight Plan */}
            <TouchableOpacity 
                style={styles.subActionCard} 
                activeOpacity={0.8}
                onPress={() => router.push('/(FleetOperator)/flight-plans')}
            >
                <View style={[styles.subActionIconBox, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="earth" size={28} color="#E65100" />
                </View>
                <Text style={styles.subActionTitle}>Mẫu bay</Text>
            </TouchableOpacity>
        </View>

        {/* --- Phần Danh sách chuyến bay nhanh --- */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Chuyến bay gần đây</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/(FleetOperator)/mission-list', params: { categoryName: 'Tất cả Kế hoạch' } })}>
            <Text style={styles.seeAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.flightListContainer}>
          {missions.slice(0, 5).map((mission, index) => (
            <View key={mission._id || index}>
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
              {index < Math.min(missions.length, 5) - 1 && <View style={styles.divider} />}
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
  headerTitle: { fontSize: 25, fontWeight: '600', color: '#1F222A' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#ffffff', lineHeight: 16 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0055FF', justifyContent: 'center', alignItems: 'center', shadowColor: '#0055FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
  greetingSection: { marginBottom: 25 },
  userName: { fontSize: 26, fontWeight: 'bold', color: '#1F222A' },
  welcomeText: { fontSize: 14, color: '#A0A0A0', marginTop: 4 },
  
  // Quick Action Button
  actionGrid: { marginBottom: 15 },
  mainActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  actionIconBox: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F222A', marginBottom: 4 },
  actionDesc: { fontSize: 13, color: '#A0A0A0', lineHeight: 20 },

  subActionCard: {
      flex: 1,
      backgroundColor: '#ffffff',
      padding: 15,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
      marginHorizontal: 5
  },
  subActionIconBox: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  subActionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F222A' },

  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F222A' },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  seeAllText: { fontSize: 14, fontWeight: '600', color: '#1565C0' },

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