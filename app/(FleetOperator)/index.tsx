import missionApi from '@/api/missionApi';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Mission = {
  _id: string;
  name: string;
  description: string;
  createdBy: any;
  status: string;
  createdAt: string;
  updatedAt: string;
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
          const arr = Array.isArray(response) ? response : (response.data || []);

          const enriched = await Promise.all(arr.map(async (m: any) => {
            if (m.missionPlans) return m;
            try {
              const detail = await missionApi.getMissionById(m._id);
              return detail;
            } catch {
              return m;
            }
          }));

          setMissions(enriched);
        } catch (e) {
          console.log("Lỗi lấy dữ liệu missions: ", e)
        }
      }
      fetchAllMission();
      fetchUser();
    }, [])
  );

  const stats = useMemo(() => {
    let inProgress = 0;
    let scheduled = 0;
    let completed = 0;

    missions.forEach((m: any) => {
      const plans = m.missionPlans || [];
      if (plans.length > 0) {
        plans.forEach((p: any) => {
          const s = (p.status || '').toUpperCase();
          if (s === 'IN_PROGRESS') inProgress++;
          else if (s === 'SCHEDULED') scheduled++;
          else if (s === 'COMPLETED') completed++;
        });
      } else {
        const missionObj = m.mission || m;
        const s = (missionObj.status || '').toUpperCase();
        if (s === 'IN_PROGRESS') inProgress++;
        else if (s === 'SCHEDULED') scheduled++;
        else if (s === 'COMPLETED') completed++;
      }
    });

    return { inProgress, scheduled, completed };
  }, [missions]);

  const handleLogout = () => {
    Alert.alert(
      "Tùy chọn tài khoản",
      "Bạn muốn thao tác gì tiếp theo?",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Chuyển sang Individual",
          onPress: () => {
            // Chỉ chuyển hướng về trang cá nhân, không xóa dữ liệu
            router.replace('/(tabs)');
          }
        },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: async () => {
            // Xóa dữ liệu và văng ra màn hình login
            await AsyncStorage.clear();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  const getStatusStyle = (status: any) => {
    switch (status) {
      case 'IN_PROGRESS': return { color: '#2E7D32', bg: '#E8F5E9', text: 'Đang hoạt động', border: '#4CAF50' };
      case 'COMPLETED': return { color: '#1565C0', bg: '#E3F2FD', text: 'Hoàn thành', border: '#2196F3' };
      case 'DRAFT': return { color: '#E65100', bg: '#FFF3E0', text: 'Bản nháp', border: '#FF9800' };
      case 'SCHEDULED': return { color: '#8E24AA', bg: '#F3E5F5', text: 'Đã lên lịch', border: '#9C27B0' };
      default: return { color: '#757575', bg: '#F5F5F5', text: status || 'Không rõ', border: '#9E9E9E' };
    }
  };

  const formatDate = (isoString: any) => {
    if (!isoString) return 'Chưa rõ';
    const date = new Date(isoString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.avatar} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.avatarText}>{firstLetter}</Text>
            </TouchableOpacity>
            <View style={styles.greetingBox}>
              <Text style={styles.greetingText}>Xin chào,</Text>
              <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/(FleetOperator)/create-mission')}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Quick Stats Section */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#BBDEFB' }]}>
              <Ionicons name="airplane" size={20} color="#1976D2" />
            </View>
            <Text style={styles.statValue}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>Đang bay</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#E1BEE7' }]}>
              <Ionicons name="calendar" size={20} color="#7B1FA2" />
            </View>
            <Text style={styles.statValue}>{stats.scheduled}</Text>
            <Text style={styles.statLabel}>Đã lên lịch</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#C8E6C9' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#388E3C" />
            </View>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Hoàn thành</Text>
          </View>
        </View>

        {/* Action Grid */}
        <Text style={styles.sectionTitle}>Chức năng chính</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.mainAction, { backgroundColor: '#FFF' }]}
            activeOpacity={0.8}
            onPress={() => router.push('/(FleetOperator)/mission-list')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="albums" size={26} color="#1565C0" />
            </View>
            <Text style={styles.actionTitle}>Tất cả nhiệm vụ</Text>
          </TouchableOpacity>

          <View style={styles.gridRow}>
            <TouchableOpacity
              style={[styles.subAction, { backgroundColor: '#FFF', marginLeft: 0 }]}
              activeOpacity={0.8}
              onPress={() => router.push('/my-drones')}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="hardware-chip" size={26} color="#2E7D32" />
              </View>
              <Text style={styles.actionTitle}>Drones</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subAction, { backgroundColor: '#FFF', marginRight: 0 }]}
              activeOpacity={0.8}
              onPress={() => router.push('/(FleetOperator)/flight-plans')}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="map" size={26} color="#E65100" />
              </View>
              <Text style={styles.actionTitle}>Kế hoạch bay</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Flights Table */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Nhiệm vụ gần đây</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/(FleetOperator)/mission-list', params: { categoryName: 'Tất cả Nhiệm vụ' } })}>
            <Text style={styles.seeAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentListContainer}>
          {missions.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có nhiệm vụ nào</Text>
          ) : (
            missions.slice(0, 5).map((m: any, index) => {
              const missionData = m.mission || m;
              const statusStyle = getStatusStyle(missionData.status);
              return (
                <TouchableOpacity
                  key={missionData._id || index}
                  style={[styles.recentCard, { borderLeftColor: statusStyle.border }]}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/(FleetOperator)/mission-detail', params: { missionId: missionData._id } })}
                >
                  <View style={styles.recentCardContent}>
                    <Text style={styles.recentTitle} numberOfLines={1}>{missionData.name}</Text>
                    <Text style={styles.recentDate}><Ionicons name="time-outline" size={12} /> {formatDate(missionData.updatedAt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.text}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FA', // Soft gray-blue background 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 25
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 50, height: 50,
    borderRadius: 25,
    backgroundColor: '#1E293B',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 4
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  greetingBox: { justifyContent: 'center' },
  greetingText: { fontSize: 13, color: '#64748B', marginBottom: 2 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', maxWidth: 200 },
  addBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30
  },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  statIconBox: {
    width: 40, height: 40,
    borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#475569', fontWeight: '500' },

  // Sections
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 15 },

  // Action Grid
  actionGrid: { marginBottom: 30 },
  mainAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3
  },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  subAction: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3
  },
  actionIconBox: {
    width: 48, height: 48,
    borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15, marginBottom: 10
  },
  actionTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B', flex: 1 },

  // Recent Missions
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  seeAllText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
  recentListContainer: { paddingBottom: 20 },
  emptyText: { textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', marginTop: 10 },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderLeftWidth: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2
  },
  recentCardContent: { flex: 1, marginRight: 10 },
  recentTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  recentDate: { fontSize: 13, color: '#64748B' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' }
});