import { FlightSession, flightSessionApi } from '@/api/flightSessionApi';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FlightSessionDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [detail, setDetail] = useState<FlightSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const response = await flightSessionApi.getSessionDetail(id as string);
      setDetail(response.data || response); 
    } catch (error) {
      console.error('Lỗi lấy chi tiết phiên bay:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1F222A" />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: '#888' }}>Không tìm thấy thông tin.</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
          <Text style={{ color: '#007AFF' }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#34C759';
      case 'IN_PROGRESS': return '#007AFF';
      case 'STARTING': return '#FF9500';
      case 'ABORTED':
      case 'EMERGENCY_LANDED': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F222A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết phiên bay</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin chung</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Loại phiên:</Text>
            <Text style={styles.value}>{detail.sessionType}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Trạng thái:</Text>
            <Text style={[styles.value, { color: getStatusColor(detail.status), fontWeight: 'bold' }]}>
              {detail.status}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Bắt đầu:</Text>
            <Text style={styles.value}>
              {detail.actualStart ? new Date(detail.actualStart).toLocaleString() : 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Kết thúc:</Text>
            <Text style={styles.value}>
              {detail.actualEnd ? new Date(detail.actualEnd).toLocaleString() : 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Drone & Pilot</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Drone Model:</Text>
            <Text style={styles.value}>{detail.drone?.model}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Serial Number:</Text>
            <Text style={styles.value}>{detail.drone?.serialNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Pilot Email:</Text>
            <Text style={styles.value}>{detail.pilot?.email}</Text>
          </View>
        </View>

        {detail.actualRoute?.coordinates && detail.actualRoute.coordinates.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dữ liệu đường bay (Toạ độ)</Text>
            <Text style={{ color: '#666', marginBottom: 12 }}>
              Tổng số điểm lưu: <Text style={{fontWeight: 'bold'}}>{detail.actualRoute.coordinates.length}</Text>
            </Text>
            
            {/* Vùng hiển thị danh sách tọa độ có thể cuộn (Scroll) */}
            <View style={styles.coordinatesContainer}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
                {detail.actualRoute.coordinates.map((coord, index) => (
                  <View key={index} style={styles.coordItem}>
                    <Text style={styles.coordIndex}>#{index + 1}</Text>
                    <Text style={styles.coordText}>
                      <Text style={{color: '#007AFF'}}>Lng:</Text> {coord[0].toFixed(6)}  -  
                      <Text style={{color: '#34C759'}}> Lat:</Text> {coord[1].toFixed(6)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A' },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  content: { padding: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F222A',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 15,
    color: '#666',
  },
  value: {
    fontSize: 15,
    color: '#1F222A',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  
  // Styles mới cho phần danh sách tọa độ
  coordinatesContainer: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    overflow: 'hidden', // Để bo góc hoạt động tốt với ScrollView
  },
  coordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  coordIndex: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    width: 40,
  },
  coordText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
});