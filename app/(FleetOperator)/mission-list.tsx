// app/(FleetOperator)/mission-list.tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// --- MOCK DATA: DANH SÁCH KẾ HOẠCH ---
const MOCK_MISSIONS = [
  { id: 'm1', title: 'Khảo sát đồi cọ lô A', date: '17/03/2026', location: 'Khu vực Bắc', status: 'Chờ thực hiện', drone: 'Drone-X1' },
  { id: 'm2', title: 'Giám sát vành đai an ninh', date: '18/03/2026', location: 'Khu vực Nam', status: 'Đang bay', drone: 'Drone-D2' },
  { id: 'm3', title: 'Đo đạc diện tích dự án', date: '19/03/2026', location: 'Khu vực Trung tâm', status: 'Hoàn thành', drone: 'Drone-M3' },
];

export default function MissionListScreen() {
  const router = useRouter();
  // Lấy tham số categoryName từ màn Home truyền sang
  const { categoryName } = useLocalSearchParams();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đang bay': return '#2E7D32'; // Xanh lá
      case 'Hoàn thành': return '#1565C0'; // Xanh dương
      default: return '#E65100'; // Cam (Chờ thực hiện)
    }
  };

  const renderMissionItem = ({ item }: { item: typeof MOCK_MISSIONS[0] }) => (
    <TouchableOpacity 
      style={styles.missionCard} 
      activeOpacity={0.8}
      // Chuyển sang màn Detail khi bấm vào
      onPress={() => router.push({ pathname: '/(FleetOperator)/mission-detail', params: { missionId: item.id } })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.missionTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#888" />
          <Text style={styles.infoText}>{item.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#888" />
          <Text style={styles.infoText}>{item.date}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="hardware-chip-outline" size={16} color="#888" />
          <Text style={styles.infoText}>{item.drone}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header có nút Back */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F222A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryName || 'Danh sách Kế hoạch'}</Text>
        <View style={{ width: 40 }} /> {/* Spacer để cân bằng header */}
      </View>

      <FlatList
        data={MOCK_MISSIONS}
        keyExtractor={(item) => item.id}
        renderItem={renderMissionItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
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
  infoText: { fontSize: 14, color: '#555', marginLeft: 8 },
});