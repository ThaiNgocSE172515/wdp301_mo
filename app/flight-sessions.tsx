import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Sửa lại import
import { flightSessionApi, FlightSession, FlightSessionResponse } from '@/api/flightSessionApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FlightSessionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [listData, setListData] = useState<FlightSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await flightSessionApi.getSessions();
      
      setListData(response?.data || response || []);
    } catch (error) {
      console.error('Lỗi gọi API flight-sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

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

  const renderItem = ({ item }: { item: FlightSession }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      activeOpacity={0.8}
      onPress={() =>
        router.push({
          pathname: '/flight-session-detail',
          params: { id: item._id },
        })
      }
    >
      <View style={styles.itemHeader}>
        <Text style={styles.sessionType}>{item.sessionType.replace('_', ' ')}</Text>
        <Text style={[styles.statusTag, { color: getStatusColor(item.status), borderColor: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
      </View>
      
      <View style={styles.itemBody}>
        <View style={styles.infoRow}>
          <Ionicons name="airplane-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.drone?.model || 'Unknown Drone'} ({item.drone?.serialNumber})</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.actualStart ? new Date(item.actualStart).toLocaleString() : 'N/A'}
          </Text>
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#CCC" style={styles.chevron} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F222A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danh sách phiên bay</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1F222A" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 20 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Chưa có phiên bay nào</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#888' },
  listContent: { paddingHorizontal: 20, paddingTop: 5 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    position: 'relative',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F222A',
  },
  statusTag: {
    fontSize: 12,
    fontWeight: 'bold',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -4,
  },
});