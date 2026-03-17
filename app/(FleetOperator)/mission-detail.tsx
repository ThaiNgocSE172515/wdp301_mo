// app/(FleetOperator)/mission-detail.tsx
import missionApi from '@/api/missionApi';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Mission = {
  "mission": {
    "_id": String,
    "name": String,
    "description": String,
    "createdBy": String,
    "status": "DRAFT" | "ACTIVE" | "COMPLETED" | string,
    "createdAt": String,
    "updatedAt": String,
    "__v": 0
  },
}

export default function MissionDetailScreen() {
  const router = useRouter();
  const [mission, setMission] = useState<Mission>();
  const { missionId } = useLocalSearchParams();

  useEffect(() => {
    const fetchMissions = async () => {
      console.log("id", missionId);
      try {
        const response = await missionApi.getMissionById(missionId);
        setMission(response);
      } catch (e) {
        console.log("Đã xảy ra lỗi khi fetch api lấy mission theo id: ", e)
      }
    }
    fetchMissions();
  }, [missionId])

  console.log("mision ", mission)

  // MOCK DATA: Chi tiết của 1 chuyến bay
  const missionDetail = {
    id: missionId || 'M-1029',
    title: 'Khảo sát đồi cọ lô A',
    status: 'Chờ thực hiện',
    date: '17/03/2026',
    time: '08:00 AM - 10:30 AM',
    location: 'Khu vực Bắc, Tọa độ: 10.762, 106.660',
    droneName: 'Phantomm 4 RTK',
    droneId: 'Drone-X1',
    description: 'Bay theo dải (Grid) để chụp ảnh độ phân giải cao phục vụ đo đạc vành đai và kiểm tra tình trạng cây trồng.',
    mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' // Ảnh map demo
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    const dateTime = new Date(date);
    const localDate = dateTime.toLocaleDateString();
    return localDate;
  }
  const formatTime = (date: any) => {
    if (!date) return "-";
    const dateTime = new Date(date);
    const localDate = dateTime.toLocaleTimeString();
    return localDate;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F222A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết Kế hoạch</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Bản đồ khu vực bay (Dùng ảnh giả lập) */}
        <View style={styles.mapContainer}>
          <Image source={{ uri: missionDetail.mapImage }} style={styles.mapImage} />
          <View style={styles.statusOverlay}>
            <Text style={styles.statusOverlayText}>{missionDetail.status}</Text>
          </View>
        </View>

        {/* Thông tin chung */}
        <View style={styles.section}>
          <Text style={styles.missionTitle}>{mission?.mission.name}</Text>
          <Text style={styles.missionId}>Mã nhiệm vụ: {mission?.mission._id}</Text>
          <Text style={styles.description}>{mission?.mission.description}</Text>
        </View>

        {/* Bảng thông số chi tiết */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}><Ionicons name="calendar" size={20} color="#1565C0" /></View>
            <View>
              <Text style={styles.detailLabel}>Thời gian</Text>
              <Text style={styles.detailValue}>{formatDate(mission?.mission.updatedAt)} | {formatTime(mission?.mission.createdAt)}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: '#E8F5E9' }]}><Ionicons name="location" size={20} color="#2E7D32" /></View>
            <View>
              <Text style={styles.detailLabel}>Địa điểm</Text>
              <Text style={styles.detailValue}>{missionDetail.location}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: '#FFF3E0' }]}><Ionicons name="hardware-chip" size={20} color="#E65100" /></View>
            <View>
              <Text style={styles.detailLabel}>Thiết bị chỉ định</Text>
              <Text style={styles.detailValue}>{missionDetail.droneName} ({missionDetail.droneId})</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Nút Hành động cố định ở dưới */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.startBtn} activeOpacity={0.8}>
          <Ionicons name="paper-plane" size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.startBtnText}>BẮT ĐẦU NHIỆM VỤ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9', paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A' },
  scrollContent: { paddingBottom: 100 }, // Chừa chỗ cho Bottom Bar

  mapContainer: { width: '100%', height: 200, backgroundColor: '#ddd', position: 'relative' },
  mapImage: { width: '100%', height: '100%' },
  statusOverlay: { position: 'absolute', top: 15, right: 15, backgroundColor: '#FF9800', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusOverlayText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  section: { padding: 20 },
  missionTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F222A', marginBottom: 5 },
  missionId: { fontSize: 14, color: '#888', marginBottom: 15, fontWeight: '600' },
  description: { fontSize: 15, color: '#555', lineHeight: 22 },

  detailsCard: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  detailIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  detailLabel: { fontSize: 13, color: '#888', marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#1F222A' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 55 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#eee' },
  startBtn: { backgroundColor: '#0055FF', flexDirection: 'row', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#0055FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});