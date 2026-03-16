import { FlightSession, flightSessionApi } from '@/api/flightSessionApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Mapbox from "@rnmapbox/maps";
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
  
  const [isFullScreen, setIsFullScreen] = useState(false);

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

  const routeCoordinates = detail.actualRoute?.coordinates || [];

  const renderMapbox = () => (
    <Mapbox.MapView 
      style={styles.map} 
      styleURL={Mapbox.StyleURL.SatelliteStreet}
      logoEnabled={false} 
    >
      <Mapbox.Camera
        defaultSettings={{
          centerCoordinate: routeCoordinates[0],
          zoomLevel: 15, 
        }}
      />

      {/* Vẽ đường bay */}
      <Mapbox.ShapeSource
        id="flightRoute"
        shape={{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates,
          },
        }}
      >
        <Mapbox.LineLayer
          id="routeLineLayer"
          style={{
            lineColor: '#00E5FF',
            lineWidth: 4,
            lineJoin: 'round',
            lineCap: 'round',
          }}
        />
      </Mapbox.ShapeSource>
      
      {/* CẬP NHẬT: Dùng MarkerView cho Điểm Đầu */}
      <Mapbox.MarkerView id="startPoint" coordinate={routeCoordinates[0]}>
        <View style={styles.annotationContainer}>
          <MaterialCommunityIcons name="quadcopter" size={32} color="#34C759" />
          <View style={styles.annotationBadge}>
            <Text style={styles.annotationText}>Điểm đầu</Text>
          </View>
        </View>
      </Mapbox.MarkerView>

      {/* CẬP NHẬT: Dùng MarkerView cho Điểm Cuối */}
      <Mapbox.MarkerView id="endPoint" coordinate={routeCoordinates[routeCoordinates.length - 1]}>
        <View style={styles.annotationContainer}>
          <MaterialCommunityIcons name="quadcopter" size={32} color="#FF3B30" />
          <View style={styles.annotationBadge}>
            <Text style={styles.annotationText}>Điểm cuối</Text>
          </View>
        </View>
      </Mapbox.MarkerView>
    </Mapbox.MapView>
  );

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
          <View style={styles.infoRow}><Text style={styles.label}>Loại phiên:</Text><Text style={styles.value}>{detail.sessionType}</Text></View>
          <View style={styles.infoRow}><Text style={styles.label}>Trạng thái:</Text><Text style={[styles.value, { color: getStatusColor(detail.status), fontWeight: 'bold' }]}>{detail.status}</Text></View>
          <View style={styles.infoRow}><Text style={styles.label}>Bắt đầu:</Text><Text style={styles.value}>{detail.actualStart ? new Date(detail.actualStart).toLocaleString() : 'N/A'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.label}>Kết thúc:</Text><Text style={styles.value}>{detail.actualEnd ? new Date(detail.actualEnd).toLocaleString() : 'N/A'}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Drone & Pilot</Text>
          <View style={styles.infoRow}><Text style={styles.label}>Drone Model:</Text><Text style={styles.value}>{detail.drone?.model}</Text></View>
          <View style={styles.infoRow}><Text style={styles.label}>Serial Number:</Text><Text style={styles.value}>{detail.drone?.serialNumber}</Text></View>
          <View style={styles.infoRow}><Text style={styles.label}>Pilot Email:</Text><Text style={styles.value}>{detail.pilot?.email}</Text></View>
        </View>

        {routeCoordinates.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đường bay thực tế</Text>
            
            <View style={styles.mapContainer}>
              {renderMapbox()}
              <TouchableOpacity 
                style={styles.expandBtn} 
                onPress={() => setIsFullScreen(true)}
              >
                <Ionicons name="expand" size={22} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL FULL MÀN HÌNH */}
      <Modal visible={isFullScreen} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {renderMapbox()}
          
          <TouchableOpacity 
            style={[styles.closeFullScreenBtn, { top: insets.top > 0 ? insets.top + 10 : 40 }]} 
            onPress={() => setIsFullScreen(false)}
          >
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A' },
  backBtn: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 10, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  content: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F222A', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 15, color: '#666' },
  value: { fontSize: 15, color: '#1F222A', fontWeight: '500', flex: 1, textAlign: 'right' },
  
  mapContainer: {
    height: 350, 
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    position: 'relative',
  },
  map: {
    flex: 1,
  },

  expandBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  closeFullScreenBtn: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  // Styles cho Icon Drone
  annotationContainer: { alignItems: 'center', justifyContent: 'center' },
  annotationBadge: { backgroundColor: 'rgba(0, 0, 0, 0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: -2, borderWidth: 1, borderColor: '#444' },
  annotationText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
});