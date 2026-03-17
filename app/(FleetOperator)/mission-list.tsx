import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import missionApi from "../../api/missionApi";

export default function MissionListScreen() {
  const router = useRouter();
  const { categoryName } = useLocalSearchParams();

  // 1. Khai báo state để quản lý dữ liệu và trạng thái loading
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. Dùng useEffect để gọi API khi màn hình vừa render
  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const data: any = await missionApi.getAll();
        setMissions(data);
      } catch (error) {
        console.error("Lỗi khi tải danh sách mission:", error);
      } finally {
        setLoading(false); // Tắt loading dù thành công hay thất bại
      }
    };

    fetchMissions();
  }, []);


  const getStatusStyle = (status: any) => {
    switch (status) {
      case 'IN_PROGRESS': return { color: '#2E7D32', bg: '#2E7D3220', text: 'Đang bay' };
      case 'COMPLETED': return { color: '#1565C0', bg: '#1565C020', text: 'Hoàn thành' };
      case 'DRAFT': return { color: '#E65100', bg: '#E6510020', text: 'Bản nháp' };
      default: return { color: '#757575', bg: '#75757520', text: status || 'Không rõ' };
    }
  };

  // Hàm format ngày từ ISO string (2026-03-17T09:21:29) sang DD/MM/YYYY
  const formatDate = (isoString: any) => {
    if (!isoString) return 'Chưa có ngày';
    const date = new Date(isoString);
    return date.toLocaleDateString('vi-VN');
  };

  const renderMissionItem = ({ item }: { item: any }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        style={styles.missionCard}
        activeOpacity={0.8}
        // Đã sửa lại thành item._id
        onPress={() => router.push({ pathname: '/(FleetOperator)/mission-detail', params: { missionId: item._id } })}
      >
        <View style={styles.cardHeader}>
          {/* Đã sửa thành item.name */}
          <Text style={styles.missionTitle} numberOfLines={2}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.text}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color="#888" />
            <Text style={styles.infoText} numberOfLines={1}>{item.description || 'Không có mô tả'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#888" />
            <Text style={styles.infoText}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#888" />
            <Text style={styles.infoText}>{item.createdBy?.profile?.fullName || 'Chưa rõ'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F222A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryName || 'Danh sách Kế hoạch'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hiển thị Loading khi đang gọi API */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={{ marginTop: 10, color: '#555' }}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <FlatList
          data={missions}
          keyExtractor={(item) => item._id}
          renderItem={renderMissionItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: '#888', marginTop: 50 }}>Không có kế hoạch nào.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 30 },
  missionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  missionTitle: { fontSize: 18, fontWeight: '700', color: '#1F222A', flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  cardBody: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 14, color: '#555', marginLeft: 8, flex: 1 },
});