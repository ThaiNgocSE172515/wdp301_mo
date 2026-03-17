import droneApi from '@/api/droneApi';
import flightPlanApi from '@/api/flightPlanApi';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from "@rnmapbox/maps";
import * as turf from '@turf/turf';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CreateFlightPlanScreen() {
  const router = useRouter();
  const cameraRef = useRef<Mapbox.Camera>(null);

  const [loading, setLoading] = useState(false);
  const [drones, setDrones] = useState<any[]>([]);
  const [showDronePicker, setShowDronePicker] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    drone: '',
    priority: 1,
  });

  const [selectedDroneName, setSelectedDroneName] = useState('');

  type Waypoint = {
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    action: string;
  };
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  useEffect(() => {
    const fetchDrones = async () => {
      try {
        const res = await droneApi.getAll();
        setDrones(res.data || res);
      } catch (err) {
        console.error("Lỗi lấy danh sách drone", err);
      }
    };
    fetchDrones();
  }, []);

  const handleMapPress = (feature: any) => {
    if (!feature || !feature.geometry || !feature.geometry.coordinates) return;
    const coords = feature.geometry.coordinates; // [lng, lat]
    
    setWaypoints(prev => [
      ...prev,
      {
        longitude: coords[0],
        latitude: coords[1],
        altitude: prev.length === 0 ? 30 : 50, // default takeoff altitude 30, flight alt 50
        speed: 10, // Default speed 10 m/s
        action: prev.length === 0 ? 'TAKEOFF' : 'WAYPOINT'
      }
    ]);
  };

  const undoLastWaypoint = () => {
    setWaypoints(prev => prev.slice(0, -1));
  };

  const clearWaypoints = () => {
    setWaypoints([]);
  };

  const handleCreate = async () => {
    if (waypoints.length < 2) {
      Alert.alert("Lỗi", "Cần ít nhất 2 điểm (TAKEOFF và WAYPOINT/LAND) để tạo kế hoạch bay");
      return;
    }
    if (!formData.drone) {
      Alert.alert("Lỗi", "Vui lòng chọn Drone thực hiện");
      return;
    }
    
    // Prepare waypoints array according to payload requirements
    const formattedWaypoints = waypoints.map((wp, index) => {
        // Automatically make the last point LAND if > 1 points
        let finalAction = wp.action;
        if (index === waypoints.length - 1 && index > 0) {
            finalAction = 'LAND';
        }

        return {
            sequenceNumber: index + 1,
            latitude: wp.latitude,
            longitude: wp.longitude,
            altitude: wp.altitude,
            speed: wp.speed,
            estimatedTime: new Date(Date.now() + index * 10 * 60000).toISOString(), // Stubbed times
            action: finalAction
        };
    });

    const payload = {
      name: formData.name, // Keep name just in case
      notes: formData.notes,
      drone: formData.drone,
      priority: formData.priority,
      waypoints: formattedWaypoints
    };

    try {
      setLoading(true);
      await flightPlanApi.create(payload);
      Alert.alert("Thành công", "Đã tạo mẫu kế hoạch bay mới", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || e.message || "Lỗi không xác định";
      Alert.alert("Lỗi", `Không thể tạo flight plan: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const pointsGeoJSON = useMemo(() => {
    if (waypoints.length === 0) return null;
    return turf.featureCollection(
      waypoints.map((w, index) => turf.point([w.longitude, w.latitude], { index: (index + 1).toString() }))
    );
  }, [waypoints]);

  const lineGeoJSON = useMemo(() => {
    if (waypoints.length < 2) return null;
    return turf.lineString(waypoints.map(w => [w.longitude, w.latitude]));
  }, [waypoints]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F222A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo Route Template</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} nestedScrollEnabled={true}>
        {/* Form Inputs */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Mô tả (*)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Bay tuần tra khu vực Bắc"
            value={formData.name}
            onChangeText={(t) => setFormData({ ...formData, name: t })}
          />
        </View>

        <View style={styles.formGroup}>
            <Text style={styles.label}>Chọn Drone (*)</Text>
            <TouchableOpacity 
                style={styles.pickerInput} 
                onPress={() => setShowDronePicker(true)}
                activeOpacity={0.8}
            >
                <Text style={{ color: selectedDroneName ? '#1F222A' : '#A0A0A0', fontSize: 16 }}>
                    {selectedDroneName || 'Nhấn để chọn Drone...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#888" />
            </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Ghi chú (Notes)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Mô tả chi tiết / lưu ý..."
            multiline
            numberOfLines={2}
            value={formData.notes}
            onChangeText={(t) => setFormData({ ...formData, notes: t })}
          />
        </View>

        {/* Bản đồ vẽ Waypoints */}
        <View style={styles.formGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <Text style={[styles.label, { marginBottom: 0 }]}>Thiết lập lộ trình (Chạm lên bản đồ)</Text>
                <Text style={{ fontSize: 13, color: '#0055FF', fontWeight: 'bold' }}>
                    {waypoints.length} Điểm
                </Text>
            </View>
            
            <View style={styles.mapContainer}>
                <Mapbox.MapView 
                    style={{ flex: 1 }} 
                    styleURL={Mapbox.StyleURL.SatelliteStreet}
                    onPress={handleMapPress}
                    logoEnabled={false}
                    attributionEnabled={false}
                >
                    <Mapbox.Camera
                        ref={cameraRef}
                        defaultSettings={{
                            centerCoordinate: [106.6297, 10.8231], // HCM default
                            zoomLevel: 14,
                        }}
                    />

                    {/* VẼ ĐƯỜNG */}
                    {lineGeoJSON && (
                        <Mapbox.ShapeSource id="routeSource" shape={lineGeoJSON as any}>
                            <Mapbox.LineLayer
                                id="routeLine"
                                style={{
                                    lineColor: '#00D1FF',
                                    lineWidth: 3,
                                    lineJoin: 'round',
                                    lineCap: 'round',
                                    lineDasharray: [2, 2] // Dashed line for plan
                                }}
                            />
                        </Mapbox.ShapeSource>
                    )}

                    {/* VẼ ĐIỂM ĐỂ HIỆN RÕ SỐ THỨ TỰ */}
                    {waypoints.map((wp, index) => (
                        <Mapbox.PointAnnotation
                            key={`wp-${index}`}
                            id={`wp-${index}`}
                            coordinate={[wp.longitude, wp.latitude]}
                        >
                            <View style={styles.markerContainer}>
                                <Text style={styles.markerText}>{index + 1}</Text>
                            </View>
                        </Mapbox.PointAnnotation>
                    ))}
                </Mapbox.MapView>

                {/* Map Control Overlay */}
                <View style={styles.mapControls}>
                    <TouchableOpacity style={styles.mapBtn} onPress={undoLastWaypoint} disabled={waypoints.length === 0}>
                        <Ionicons name="arrow-undo" size={20} color={waypoints.length === 0 ? "#ccc" : "#333"} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.mapBtn, { marginTop: 10 }]} onPress={clearWaypoints} disabled={waypoints.length === 0}>
                        <Ionicons name="trash" size={20} color={waypoints.length === 0 ? "#ccc" : "#D32F2F"} />
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={{ fontSize: 12, color: '#888', marginTop: 5, fontStyle: 'italic' }}>
                * Điểm 1 sẽ tự động set là TAKEOFF, điểm cuối tự động set là LAND.
            </Text>
        </View>

        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleCreate} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{marginRight: 8}}/>
                <Text style={styles.submitBtnText}>TẠO ROUTE TEMPLATE</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL CHỌN DRONE */}
      <Modal visible={showDronePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 20, paddingTop: 20 }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Chọn Drone</Text>
                      <TouchableOpacity onPress={() => setShowDronePicker(false)}>
                          <Ionicons name="close" size={24} color="#333" />
                      </TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: 300, paddingHorizontal: 10 }}>
                      {drones.map((d: any) => (
                          <TouchableOpacity 
                              key={d._id} 
                              style={styles.droneItem}
                              onPress={() => {
                                  setFormData({ ...formData, drone: d._id });
                                  setSelectedDroneName(`${d.model} (${d.droneId})`);
                                  setShowDronePicker(false);
                              }}
                          >
                              <Ionicons name="hardware-chip" size={24} color="#0055FF" />
                              <View style={{ marginLeft: 15 }}>
                                  <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{d.model}</Text>
                                  <Text style={{ fontSize: 13, color: '#888' }}>ID: {d.droneId}  • Trạng thái: {d.status}</Text>
                              </View>
                          </TouchableOpacity>
                      ))}
                      {drones.length === 0 && (
                          <Text style={{ textAlign: 'center', marginVertical: 20, color: '#888' }}>Chưa có drone nào trong đội bay</Text>
                      )}
                  </ScrollView>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9', paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A' },
  
  content: { padding: 20, paddingBottom: 50 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#1F222A', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#1F222A',
  },
  pickerInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  
  mapContainer: {
      height: SCREEN_HEIGHT * 0.45,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#DDD'
  },
  mapControls: {
      position: 'absolute',
      right: 15,
      bottom: 15,
      zIndex: 10
  },
  mapBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
  },
  markerContainer: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#E65100',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#FFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 4,
  },
  markerText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: 'bold',
  },

  submitBtn: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30 },
  droneItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }
});
