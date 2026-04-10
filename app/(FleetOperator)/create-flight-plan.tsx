import droneApi from '@/api/droneApi';
import flightPlanApi from '@/api/flightPlanApi';
import zoneApi from '@/api/zoneApi';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from "@rnmapbox/maps";
import * as turf from '@turf/turf';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CreateFlightPlanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isEditing = !!id;
  const cameraRef = useRef<Mapbox.Camera>(null);

  const [loading, setLoading] = useState(false);
  const [drones, setDrones] = useState<any[]>([]);
  const [showDronePicker, setShowDronePicker] = useState(false);

  const [formData, setFormData] = useState({
    notes: '',
    drone: '',
    priority: 1,
  });

  const [zones, setZones] = useState<any[]>([]);

  const [selectedDroneName, setSelectedDroneName] = useState('');
  const [activeTab, setActiveTab] = useState<'MAP' | 'LIST'>('MAP');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  type Waypoint = {
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    action: string;
  };
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  const [editingWaypointIndex, setEditingWaypointIndex] = useState<number | null>(null);
  const [editingWaypointAltitude, setEditingWaypointAltitude] = useState<string>('');
  const [pendingWaypointCoords, setPendingWaypointCoords] = useState<number[] | null>(null);

  const handleCloseModal = () => {
    setEditingWaypointIndex(null);
    setPendingWaypointCoords(null);
    setEditingWaypointAltitude('');
  };

  const handleWaypointPress = (index: number) => {
    setEditingWaypointIndex(index);
    setEditingWaypointAltitude(waypoints[index].altitude.toString());
  };

  const handleSaveWaypointAltitude = () => {
    const parsedAltitude = parseFloat(editingWaypointAltitude.toString());
    if (isNaN(parsedAltitude) || parsedAltitude <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập độ cao hợp lệ (lớn hơn 0).");
      return;
    }

    let tentativeWaypoints = [...waypoints];
    if (editingWaypointIndex !== null) {
      tentativeWaypoints[editingWaypointIndex] = { ...tentativeWaypoints[editingWaypointIndex], altitude: parsedAltitude };
    } else if (pendingWaypointCoords !== null) {
      tentativeWaypoints.push({
        longitude: pendingWaypointCoords[0],
        latitude: pendingWaypointCoords[1],
        altitude: parsedAltitude,
        speed: 22,
        action: tentativeWaypoints.length === 0 ? 'TAKEOFF' : 'WAYPOINT'
      });
    }

    let hasError = false;
    let warningMsg = null;

    for (const z of zones) {
      if (z.geometry && !hasError) {
        // 1. Kiểm tra từng waypoint
        for (let i = 0; i < tentativeWaypoints.length; i++) {
          const wp = tentativeWaypoints[i];
          const point = turf.point([wp.longitude, wp.latitude]);
          let isInside = false;
          try {
             isInside = turf.booleanPointInPolygon(point, z.geometry as any);
          } catch(e) {}
          
          if (isInside) {
             const zoneAltText = z.maxAltitude || z.altitude;
             const zoneAlt = zoneAltText ? parseFloat(zoneAltText.toString()) : 0;
             if (zoneAlt > 0 && wp.altitude < zoneAlt) {
                 Alert.alert("Không thể đặt điểm", `Độ cao (${wp.altitude}m) thấp hơn quy định của vùng "${z.name}" (${zoneAlt}m).`);
                 hasError = true;
                 break;
             } else {
                 warningMsg = `Điểm bay nằm trong hoặc đi qua vùng giới hạn: ${z.name}. Bạn phải tự chịu trách nhiệm bay!`;
             }
          }
        }

        if (hasError) break;
        
        // 2. Kiểm tra đoạn đường cắt ngang vùng
        for (let i = 1; i < tentativeWaypoints.length; i++) {
          const prevWp = tentativeWaypoints[i - 1];
          const currWp = tentativeWaypoints[i];
          const lineSegment = turf.lineString([
            [prevWp.longitude, prevWp.latitude],
            [currWp.longitude, currWp.latitude]
          ]);
          let isIntersecting = false;
          try {
             isIntersecting = turf.booleanIntersects(lineSegment, z.geometry as any);
          } catch(e) {}

          if (isIntersecting) {
             const zoneAltText = z.maxAltitude || z.altitude;
             const zoneAlt = zoneAltText ? parseFloat(zoneAltText.toString()) : 0;
             if (zoneAlt > 0 && Math.min(prevWp.altitude, currWp.altitude) < zoneAlt) {
                 Alert.alert("Không thể nối điểm", `Đường bay đi qua vùng "${z.name}" với độ cao thấp hơn quy định (${zoneAlt}m).`);
                 hasError = true;
                 break;
             } else {
                 warningMsg = `Lộ trình cắt vùng cấm/hạn chế: ${z.name}. Bạn tự chịu trách nhiệm về quyết định bay này.`;
             }
          }
        }
      }
    }

    if (hasError) return; // Ngăn chặn việc thêm điểm hoặc sửa độ cao sai luật

    if (warningMsg && pendingWaypointCoords !== null) {
      Alert.alert("Lưu ý an toàn", warningMsg);
    }

    setWaypoints(tentativeWaypoints);
    handleCloseModal();
  };

  useEffect(() => {
    const fetchDrones = async () => {
      try {
        const res = await droneApi.getAll();
        setDrones(res.data || res);
      } catch (err) {
        console.error("Lỗi lấy danh sách drone", err);
      }
    };
    const fetchZones = async () => {
      try {
        const zRes = await zoneApi.getAll({ limit: 100 });
        const zoneList = zRes.data?.data || zRes.data || [];
        if (Array.isArray(zoneList)) {
          setZones(zoneList);
        }
      } catch (err) {
        console.error("Lỗi tải zone:", err);
      }
    };

    const fetchFlightPlanDetails = async () => {
      if (!id) return;
      try {
        const res = await flightPlanApi.getById(id as string);
        const data = res.data || res;
        setFormData({
          notes: data.notes || '',
          drone: data.drone?._id || data.drone || '',
          priority: data.priority || 1,
        });
        if (data.drone && typeof data.drone === 'object') {
          setSelectedDroneName(`${data.drone.model || ''} (${data.drone.droneId || ''})`);
        }
        if (data.waypoints && data.waypoints.length > 0) {
          setWaypoints(data.waypoints.map((wp: any) => ({
            latitude: wp.latitude,
            longitude: wp.longitude,
            altitude: wp.altitude,
            speed: wp.speed,
            action: wp.action
          })));
        }
      } catch (err) {
        console.error("Lỗi tải chi tiết kế hoạch bay:", err);
      }
    };

    fetchDrones();
    fetchZones();
    if (isEditing) {
      fetchFlightPlanDetails();
    }
  }, [id, isEditing]);

  const handleMapPress = (feature: any) => {
    if (!feature || !feature.geometry || !feature.geometry.coordinates) return;
    const coords = feature.geometry.coordinates; // [lng, lat]
    setPendingWaypointCoords(coords);
    setEditingWaypointAltitude('');
    setEditingWaypointIndex(null);
  };

  const undoLastWaypoint = () => {
    setWaypoints(prev => prev.slice(0, -1));
  };

  const clearWaypoints = () => {
    setWaypoints([]);
  };


  const flightEstimates = useMemo(() => {
    if (waypoints.length < 2) return { time: 0, battery: 0 };

    let totalTimeSeconds = 0;
    let distance = 0;

    for (let i = 1; i < waypoints.length; i++) {
      const prevWp = waypoints[i - 1];
      const currWp = waypoints[i];

      const fromPoint = turf.point([prevWp.longitude, prevWp.latitude]);
      const toPoint = turf.point([currWp.longitude, currWp.latitude]);
      const horizontalDist = turf.distance(fromPoint, toPoint, { units: 'kilometers' }) * 1000;

      const verticalDist = Math.abs(currWp.altitude - prevWp.altitude);

      const segmentDistance = Math.sqrt(Math.pow(horizontalDist, 2) + Math.pow(verticalDist, 2));

      const speed = currWp.speed > 0 ? currWp.speed : 22;

      totalTimeSeconds += segmentDistance / speed;
      distance += horizontalDist;
    }

    totalTimeSeconds += 30;

    const timeMinutes = Math.ceil(totalTimeSeconds / 60);

    const MAX_DRONE_FLIGHT_TIME = 30; 


    const batteryPercent = Math.ceil((timeMinutes / MAX_DRONE_FLIGHT_TIME) * 100);

    return {
      time: timeMinutes,
      battery: batteryPercent,
      distance: distance
    };
  }, [waypoints]);

  const handleCreate = async () => {
    if (waypoints.length < 2) {
      Alert.alert("Lỗi", "Cần ít nhất 2 điểm (TAKEOFF và WAYPOINT/LAND) để tạo kế hoạch bay");
      return;
    }
    if (!formData.drone) {
      Alert.alert("Lỗi", "Vui lòng chọn Drone thực hiện")
      return;
    }

    if (flightEstimates.battery > 100) {
      Alert.alert(
        "Cảnh báo an toàn",
        `Lộ trình này quá dài! Ước tính tiêu thụ ${flightEstimates.battery}% pin. Vui lòng rút ngắn lộ trình.`
      );
      return;
    }

    let hasAlerted = false;
    for (const z of zones) {
      if (z.geometry && !hasAlerted) {
        for (let i = 0; i < waypoints.length; i++) {
          const wp = waypoints[i];
          const point = turf.point([wp.longitude, wp.latitude]);
          let isInside = false;
          try {
            isInside = turf.booleanPointInPolygon(point, z.geometry as any);
          } catch (e) { }

          if (isInside) {
            const zoneAltText = z.maxAltitude || z.altitude;
            const zoneAlt = zoneAltText ? parseFloat(zoneAltText.toString()) : 0;
            if (zoneAlt > 0 && wp.altitude < zoneAlt) {
              Alert.alert("Cảnh báo vùng bay", `Độ cao của điểm ${i + 1} (${wp.altitude}m) thấp hơn giới hạn của vùng "${z.name}" (${zoneAlt}m). Không được phép tạo kế hoạch bay! Vui lòng chạm vào điểm trên bản đồ để sửa lại độ cao.`);
              hasAlerted = true;
              break;
            }
          }
        }

        if (hasAlerted) break;

        for (let i = 1; i < waypoints.length; i++) {
          const prevWp = waypoints[i - 1];
          const currWp = waypoints[i];
          const lineSegment = turf.lineString([
            [prevWp.longitude, prevWp.latitude],
            [currWp.longitude, currWp.latitude]
          ]);
          let isIntersecting = false;
          try {
            isIntersecting = turf.booleanIntersects(lineSegment, z.geometry as any);
          } catch (e) { }

          if (isIntersecting) {
            const zoneAltText = z.maxAltitude || z.altitude;
            const zoneAlt = zoneAltText ? parseFloat(zoneAltText.toString()) : 0;
            if (zoneAlt > 0 && Math.min(prevWp.altitude, currWp.altitude) < zoneAlt) {
              Alert.alert("Cảnh báo vùng bay", `Lộ trình từ điểm ${i} đến ${i + 1} đi qua vùng "${z.name}" với độ cao thấp hơn quy định (${zoneAlt}m). Không được phép tạo kế hoạch bay! Vui lòng chạm vào điểm trên bản đồ để sửa lại độ cao.`);
              hasAlerted = true;
              break;
            }
          }
        }
      }
      if (hasAlerted) break;
    }

    if (hasAlerted) return;

    const formattedWaypoints = waypoints.map((wp, index) => {

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
        estimatedTime: new Date(Date.now() + index * 10 * 60000).toISOString(),
        action: finalAction
      };
    });

    const payload = {
      notes: formData.notes,
      drone: formData.drone,
      priority: formData.priority,
      waypoints: formattedWaypoints,
      batteryPercentageUsed: flightEstimates.battery,
      estimatedFlightTime: flightEstimates.time
    };

    try {
      setLoading(true);
      if (isEditing) {
        await flightPlanApi.update(id as string, payload);
        Alert.alert("Thành công", "Đã cập nhật kế hoạch bay", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        await flightPlanApi.create(payload);
        Alert.alert("Thành công", "Đã tạo mẫu kế hoạch bay mới", [
          { text: "OK", onPress: () => router.back() }
        ]);
      }
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || e.message || "Lỗi không xác định";
      Alert.alert("Lỗi", `Không thể lưu flight plan: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const defaultCameraSettings = useMemo(() => {
    if (waypoints.length > 0) {
      if (waypoints.length === 1) {
        return { centerCoordinate: [waypoints[0].longitude, waypoints[0].latitude], zoomLevel: 14 };
      }
      try {
        const line = turf.lineString(waypoints.map(w => [w.longitude, w.latitude]));
        const bbox = turf.bbox(line);
        return {
          bounds: {
            ne: [bbox[2], bbox[3]],
            sw: [bbox[0], bbox[1]],
            paddingTop: 50, paddingBottom: 50, paddingLeft: 50, paddingRight: 50
          }
        };
      } catch (e) {
        return { centerCoordinate: [waypoints[0].longitude, waypoints[0].latitude], zoomLevel: 14 };
      }
    }

    if (zones.length > 0) {
      try {
        const firstZone = zones[0];
        if (firstZone.geometry) {
          const center = turf.center(firstZone.geometry as any);
          return { centerCoordinate: center.geometry.coordinates, zoomLevel: 11 };
        }
      } catch (e) {
        // ignore
      }
    }

    return { centerCoordinate: [106.6297, 10.8231], zoomLevel: 14 };
  }, [waypoints, zones]);

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.setCamera({ ...defaultCameraSettings, animationDuration: 500 } as any);
    }
  }, [defaultCameraSettings]);

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

  const zonesGeoJSON = useMemo(() => {
    if (zones.length === 0) return null;
    return turf.featureCollection(
      zones.map(z => {
        const altInfo = z.maxAltitude || z.altitude || '--';
        return turf.feature(z.geometry, {
          type: z.type,
          name: z.name,
          label: `${z.name}\nĐộ cao: ${altInfo}m`
        });
      })
    );
  }, [zones]);

  const renderMapBox = (isFullscreen: boolean) => (
    <View style={isFullscreen ? { flex: 1 } : styles.mapContainer}>
      <Mapbox.MapView
        style={{ flex: 1 }}
        styleURL={Mapbox.StyleURL.SatelliteStreet}
        onPress={handleMapPress}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={defaultCameraSettings as any}
        />


        {zonesGeoJSON && (
          <Mapbox.ShapeSource id="zones-source" shape={zonesGeoJSON as any}>
            <Mapbox.FillLayer
              id="zones-fill"
              style={{
                fillColor: [
                  "match",
                  ["get", "type"],
                  "no_fly", "rgba(255, 59, 48, 0.4)",
                  "restricted", "rgba(255, 204, 0, 0.4)",
                  "rgba(0,0,0,0.1)"
                ],
                fillOutlineColor: [
                  "match",
                  ["get", "type"],
                  "no_fly", "#FF3B30",
                  "restricted", "#FFCC00",
                  "#000"
                ]
              }}
            />

            <Mapbox.SymbolLayer
              id="zones-labels"
              style={{
                textField: ['get', 'label'],
                textSize: 12,
                textColor: '#000000',
                textHaloColor: '#FFFFFF',
                textHaloWidth: 2,
                textAnchor: 'center',
                textJustify: 'center'
              }}
            />

          </Mapbox.ShapeSource>
        )}

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
            key={`wp-${index}-${wp.altitude}`}
            id={`wp-${index}`}
            coordinate={[wp.longitude, wp.latitude]}
            onSelected={() => handleWaypointPress(index)}
          >
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => handleWaypointPress(index)} 
              style={{ padding: 4 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E65100', borderRadius: 15, paddingRight: 6, paddingLeft: 2, paddingVertical: 2, borderWidth: 2, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#E65100', fontSize: 12, fontWeight: 'bold' }}>{index + 1}</Text>
                </View>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 4, marginRight: 2 }}>{wp.altitude}m</Text>
              </View>
            </TouchableOpacity>
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

      {!isFullscreen && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2 }}
          onPress={() => setIsMapFullscreen(true)}
        >
          <Ionicons name="expand" size={20} color="#333" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F222A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Sửa kế hoạch bay' : 'Tạo kế hoạch bay'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} nestedScrollEnabled={true}>
        {/* Form Inputs */}

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

        {/* Bản đồ vẽ Waypoints hoặc Danh sách chi tiết */}
        <View style={styles.formGroup}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
            <Text style={[styles.label, { marginBottom: 0 }]}>Thiết lập lộ trình</Text>
            <Text style={{ fontSize: 13, color: '#0055FF', fontWeight: 'bold' }}>
              {waypoints.length} Điểm
            </Text>
          </View>

          {/* TAB SWITCHER */}
          <View>
            <View style={{ flexDirection: 'row', borderRadius: 8, backgroundColor: '#E0E0E0', padding: 4, marginBottom: 15 }}>
              <TouchableOpacity
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 6, backgroundColor: activeTab === 'MAP' ? '#fff' : 'transparent', shadowColor: activeTab === 'MAP' ? '#000' : 'transparent', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: activeTab === 'MAP' ? 2 : 0 }}
                onPress={() => setActiveTab('MAP')}
              >
                <Text style={{ fontWeight: 'bold', color: activeTab === 'MAP' ? '#0055FF' : '#666' }}>Bản Đồ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 6, backgroundColor: activeTab === 'LIST' ? '#fff' : 'transparent', shadowColor: activeTab === 'LIST' ? '#000' : 'transparent', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: activeTab === 'LIST' ? 2 : 0 }}
                onPress={() => setActiveTab('LIST')}
              >
                <Text style={{ fontWeight: 'bold', color: activeTab === 'LIST' ? '#0055FF' : '#666' }}>Danh sách điểm</Text>
              </TouchableOpacity>
            </View>
            <View>
              {flightEstimates.battery >= 48 && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFEBEE',
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 15
                }}>
                  <Ionicons name="warning" size={20} color="#D32F2F" style={{ marginRight: 8 }} />
                  <Text style={{ color: "#D32F2F", fontWeight: '600', fontSize: 14 }}>
                    Cảnh báo: Khả năng không đủ pin khi quay đầu!
                  </Text>
                </View>
              )}
            </View>
          </View>

          {activeTab === 'MAP' ? (
            <>
              {!isMapFullscreen && renderMapBox(false)}
              <View style={styles.flightEstimatesList}>
                <View style={styles.flightEstimatesItem}>
                  <Text style={styles.flightEstimatesTitle}>Thời gian dự kiên</Text>
                  <Text style={styles.flightEstimatesInfo}>{flightEstimates.time} phút</Text>
                </View>
                <View style={styles.flightEstimatesItem}>
                  <Text style={styles.flightEstimatesTitle}>pin dự kiên</Text>
                  <Text style={styles.flightEstimatesInfo}>{flightEstimates.battery} %</Text>
                </View>
                <View style={styles.flightEstimatesItem}>
                  <Text style={styles.flightEstimatesTitle}>Khoảng cách</Text>
                  <Text style={styles.flightEstimatesInfo}>{(flightEstimates.distance! / 1000).toFixed(2)} km</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={{ minHeight: SCREEN_HEIGHT * 0.45, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#DDD', padding: 15 }}>
              {waypoints.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="map-outline" size={48} color="#ccc" />
                  <Text style={{ textAlign: 'center', color: '#888', marginTop: 10 }}>Chưa có điểm nào. Hãy sang tab Bản đồ để thêm điểm.</Text>
                </View>
              ) : (
                waypoints.map((wp, index) => {
                  let finalAction = wp.action;
                  if (index === waypoints.length - 1 && index > 0) {
                    finalAction = 'LAND';
                  }
                  return (
                    <View key={`list-wp-${index}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: index === waypoints.length - 1 ? 0 : 1, borderBottomColor: '#EEE' }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E65100', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1F222A', marginBottom: 2 }}>{finalAction}</Text>
                        <Text style={{ color: '#555', fontSize: 13, marginBottom: 2 }}>
                          Vĩ độ: {wp.latitude.toFixed(5)}   Kinh độ: {wp.longitude.toFixed(5)}
                        </Text>
                        <Text style={{ color: '#888', fontSize: 13 }}>
                          Độ cao (mặc định): {wp.altitude}m  •  Tốc độ: {wp.speed}m/s
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
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
              <Ionicons name={isEditing ? "save-outline" : "cloud-upload-outline"} size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>{isEditing ? 'CẬP NHẬT KẾ HOẠCH BÀY' : 'TẠO KẾ HOẠCH BÀY'}</Text>
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
      {/* MODAL FULL SCREEN MAP */}
      <Modal visible={isMapFullscreen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F222A' }}>Chạm để đặt điểm bay</Text>
                <View style={{ display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "space-around" }}>
                  <View style={{ display: "flex", flexDirection: "row", gap: 5 }}>
                    <Text>Pin cần thiết để bay: </Text>
                    <Text style={{ fontSize: 13, color: '#0055FF', fontWeight: 'bold' }}>{flightEstimates.battery} %</Text>
                  </View>
                  <View style={{ display: "flex", flexDirection: "row", gap: 5 }}>
                    <Text>Khoảng cách dự kiến: </Text>
                    <Text style={{ fontSize: 13, color: '#0055FF', fontWeight: 'bold' }}>{((flightEstimates.distance ?? 0) / 1000).toFixed(2)} km</Text>
                  </View>
                  <View style={{ display: "flex", flexDirection: "row", gap: 5 }}>
                    <Text>Thời gian bay dự kiên: </Text>
                    <Text style={{ fontSize: 13, color: '#0055FF', fontWeight: 'bold' }}>{flightEstimates.time} phút bay</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsMapFullscreen(false)}>
                <Ionicons name="contract" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <View>
              {flightEstimates.battery >= 48 && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFEBEE',
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 15
                }}>
                  <Ionicons name="warning" size={20} color="#D32F2F" style={{ marginRight: 8 }} />
                  <Text style={{ color: "#D32F2F", fontWeight: '600', fontSize: 14 }}>
                    Cảnh báo: Khả năng không đủ pin khi quay đầu!
                  </Text>
                </View>
              )}
            </View>
            {isMapFullscreen && renderMapBox(true)}
          </SafeAreaView>
        </View>
      </Modal>

      {/* MODAL EDIT/ADD WAYPOINT */}
      <Modal visible={editingWaypointIndex !== null || pendingWaypointCoords !== null} transparent animationType="fade">
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[styles.modalContent, { borderRadius: 16, margin: 20, paddingBottom: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 20, paddingTop: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{editingWaypointIndex !== null ? `Điều chỉnh Điểm ${editingWaypointIndex + 1}` : 'Nhập độ cao cho điểm mới'}</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={styles.label}>Độ cao bay (m):</Text>
              <TextInput
                style={[styles.input, { marginBottom: 15 }]}
                keyboardType="numeric"
                value={editingWaypointAltitude}
                onChangeText={setEditingWaypointAltitude}
              />
              <TouchableOpacity style={[styles.submitBtn, { height: 45, marginTop: 0 }]} onPress={handleSaveWaypointAltitude}>
                <Text style={styles.submitBtnText}>XÁC NHẬN</Text>
              </TouchableOpacity>
            </View>
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
  droneItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  flightEstimatesList: { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "stretch", marginTop: 20, marginHorizontal: 10 },
  flightEstimatesItem: { display: "flex", alignItems: "center" },
  flightEstimatesTitle: { fontStyle: "italic", fontWeight: "500", fontSize: 15 },
  flightEstimatesInfo: { fontWeight: "400", fontSize: 15 },
});
