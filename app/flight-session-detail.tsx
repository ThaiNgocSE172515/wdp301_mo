import { FlightSession, flightSessionApi } from '@/api/flightSessionApi';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from "@rnmapbox/maps";
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

  const routeCoordinates = detail.actualRoute?.coordinates || [];

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

        {routeCoordinates.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đường bay thực tế</Text>
            
            <View style={styles.mapContainer}>
              <Mapbox.MapView 
                style={styles.map} 
                styleURL={Mapbox.StyleURL.SatelliteStreet}
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
                  shape = {{
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
                
                {/* Đánh dấu và ghi chú Điểm Đầu / Điểm Cuối */}
                <Mapbox.ShapeSource
                  id="startEndPoints"
                  shape={{
                    type: 'FeatureCollection',
                    features: [
                      {
                        type: 'Feature',
                        properties: { type: 'start', label: 'Điểm đầu' },
                        geometry: { type: 'Point', coordinates: routeCoordinates[0] }
                      },
                      {
                        type: 'Feature',
                        properties: { type: 'end', label: 'Điểm cuối' },
                        geometry: { type: 'Point', coordinates: routeCoordinates[routeCoordinates.length - 1] }
                      }
                    ]
                  }}
                >
                  {/* Vẽ dấu chấm */}
                  <Mapbox.CircleLayer
                    id="pointsCircle"
                    style={{
                      circleRadius: 8,
                      circleColor: ['match', ['get', 'type'], 'start', '#34C759', 'end', '#FF3B30', '#000'],
                      circleStrokeWidth: 2,
                      circleStrokeColor: '#FFFFFF'
                    }}
                  />
                  {/* Vẽ text ghi chú ngay dưới dấu chấm */}
                  <Mapbox.SymbolLayer
                    id="pointsText"
                    style={{
                      textField: ['get', 'label'], // Lấy giá trị label từ properties
                      textSize: 13,
                      textColor: '#FFFFFF',
                      textHaloColor: '#000000', // Viền đen để chữ nổi bật trên nền bản đồ
                      textHaloWidth: 1.5,
                      textAnchor: 'top',
                      textOffset: [0, 0.8], // Đẩy chữ xuống dưới chấm tròn 1 chút
                      textAllowOverlap: true,
                    }}
                  />
                </Mapbox.ShapeSource>

              </Mapbox.MapView>
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
  mapContainer: {
    height: 350, 
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  map: {
    flex: 1,
  },
});