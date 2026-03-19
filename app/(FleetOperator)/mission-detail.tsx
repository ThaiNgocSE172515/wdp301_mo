// app/(FleetOperator)/mission-detail.tsx
import droneApi from '@/api/droneApi';
import flightPlanApi from '@/api/flightPlanApi';
import missionApi from '@/api/missionApi';
import zoneApi from '@/api/zoneApi';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from "@rnmapbox/maps";
import * as turf from '@turf/turf';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Mission = {
  "mission": {
    "_id": string,
    "name": string,
    "description": string,
    "createdBy": any,
    "status": "DRAFT" | "ACTIVE" | "COMPLETED" | string,
    "createdAt": string,
    "updatedAt": string,
    "__v": number
  },
  "missionPlans": any[];
}

export default function MissionDetailScreen() {
  const router = useRouter();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [mission, setMission] = useState<Mission>();
  const [zones, setZones] = useState<any[]>([]);
  const [dronesMap, setDronesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMissionModalVisible, setEditMissionModalVisible] = useState(false);
  const [editMissionData, setEditMissionData] = useState({ name: '', description: '', status: '' });
  const [availableFlightPlans, setAvailableFlightPlans] = useState<any[]>([]);
  const [selectedForAdd, setSelectedForAdd] = useState<string | null>(null);
  const [plannedStartInput, setPlannedStartInput] = useState<string>('');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const { missionId } = useLocalSearchParams();

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        setLoading(true);
        const response = await missionApi.getMissionById(missionId);
        setMission(response.data || response);

        try {
          const droneRes = await droneApi.getAll();
          const droneList = droneRes.data || droneRes;
          const dMap: Record<string, any> = {};
          droneList.forEach((d: any) => {
            dMap[d._id] = d;
          });
          setDronesMap(dMap);
        } catch (e) {
          console.log("Could not fetch drones", e);
        }

        try {
          const zRes = await zoneApi.getAll({ limit: 100 });
          const zoneList = zRes.data?.data || zRes.data || [];
          if (Array.isArray(zoneList)) {
            setZones(zoneList);
          }
        } catch (err) {
          console.error("Lỗi tải zone:", err);
        }
      } catch (e) {
        console.log("Đã xảy ra lỗi khi fetch api lấy mission theo id: ", e)
        Alert.alert("Lỗi", "Không thể tải thông tin nhiệm vụ");
      } finally {
        setLoading(false);
      }
    }
    if (missionId) {
      fetchMissions();
    }
  }, [missionId])

  const handleDeleteMission = () => {
    Alert.alert(
      "Xóa Nhiệm vụ",
      "Bạn có chắc chắn muốn xóa nhiệm vụ này cùng toàn bộ kế hoạch bay bên trong không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await missionApi.deleteMission(missionId);
              Alert.alert("Thành công", "Đã xóa nhiệm vụ");
              router.back();
            } catch (err: any) {
              Alert.alert("Lỗi", "Không thể xóa nhiệm vụ");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    )
  };

  const handleUpdateMission = async () => {
    try {
      if (!editMissionData.name) {
        Alert.alert("Lỗi", "Vui lòng nhập tên nhiệm vụ");
        return;
      }
      setLoading(true);
      await missionApi.updateMission(missionId, {
        name: editMissionData.name,
        description: editMissionData.description,
        status: editMissionData.status || 'DRAFT'
      });
      Alert.alert("Thành công", "Cập nhật thành công");
      setEditMissionModalVisible(false);
      const response = await missionApi.getMissionById(missionId);
      setMission(response);
    } catch (e) {
      Alert.alert("Lỗi", "Không thể cập nhật nhiệm vụ");
    } finally {
      setLoading(false);
    }
  };

  const openEditMission = () => {
    if (mission?.mission) {
      setEditMissionData({
        name: mission.mission.name,
        description: mission.mission.description,
        status: mission.mission.status
      });
      setEditMissionModalVisible(true);
    }
  };

  const handleRemoveMissionPlan = (planId: string) => {
    Alert.alert(
      "Xóa Kế hoạch bay",
      "Bạn có chắc muốn xóa kế hoạch này khỏi nhiệm vụ?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await missionApi.deleteMissionPlan(missionId, planId);
              Alert.alert("Thành công", "Đã xóa kế hoạch bay");
              const response = await missionApi.getMissionById(missionId);
              setMission(response);
            } catch (e) {
              Alert.alert("Lỗi", "Không thể xóa kế hoạch bay");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    )
  };

  const handleStartMission = () => {
    if (!missionId) return;
    if (!mission?.missionPlans || mission.missionPlans.length === 0) {
      Alert.alert("Lỗi", "Cần thêm ít nhất một Kế hoạch bay (Flight Plan) trước khi bắt đầu nhiệm vụ!");
      return;
    }
    Alert.alert(
      "Bắt đầu nhiệm vụ",
      "Bạn có chắc chắn muốn bắt đầu nhiệm vụ này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Bắt đầu",
          onPress: async () => {
            try {
              setLoading(true);
              await missionApi.startMission(missionId);
              Alert.alert("Thành công", "Nhiệm vụ đã được bắt đầu");
              const response = await missionApi.getMissionById(missionId);
              setMission(response);
            } catch (err: any) {
              const errorMsg = err.response?.data?.message || err.message || "Không thể bắt đầu nhiệm vụ";
              Alert.alert("Lỗi", "Không thể bắt đầu: " + errorMsg);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleOpenAddPlan = async () => {
    try {
      setLoading(true);
      const response = await flightPlanApi.getAll();
      setAvailableFlightPlans(response.data || response);
      setSelectedForAdd(null);
      setModalVisible(true);
    } catch (e) {
      Alert.alert("Lỗi", "Không thể tải danh sách flight plans available");
    } finally {
      setLoading(false);
    }
  };

  const initAddPlan = (flightPlanId: string) => {
    setSelectedForAdd(flightPlanId);
    const now = new Date();
    const formatted = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    setPlannedStartInput(formatted);
  };

  const confirmAddPlan = async () => {
    if (!selectedForAdd) return;
    try {
      setLoading(true);
      let startDateStr = plannedStartInput.replace(' ', 'T');
      if (startDateStr.length === 16) startDateStr += ':00';
      const startDate = new Date(startDateStr);
      if (isNaN(startDate.getTime())) {
        Alert.alert("Lỗi", "Định dạng thời gian không hợp lệ. Vui lòng nhập YYYY-MM-DD HH:mm");
        return;
      }

      const endDate = new Date(startDate.getTime() + 2 * 3600000); // Tự động + 2 giờ

      const data = {
        flightPlanId: selectedForAdd,
        plannedStart: startDate.toISOString(),
        plannedEnd: endDate.toISOString(),
        order: (mission?.missionPlans?.length || 0) + 1,
        notes: "Thêm từ Dashboard"
      };
      await missionApi.addMissionPlan(missionId, data);
      Alert.alert("Thành công", "Đã gán kế hoạch bay vào nhiệm vụ");
      setModalVisible(false);
      setSelectedForAdd(null);
      const response = await missionApi.getMissionById(missionId);
      setMission(response);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Không thể thêm flight plan";
      Alert.alert("Lỗi", "Không thể thêm: " + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFlightPlan = (flightPlanId: string) => {
    Alert.alert(
      "Xóa Mẫu Kế hoạch",
      "Bạn có chắc chắn muốn xóa mẫu kế hoạch bay này khỏi hệ thống không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await flightPlanApi.delete(flightPlanId);
              Alert.alert("Thành công", "Đã xóa mẫu kế hoạch bay");
              // Refresh list
              const response = await flightPlanApi.getAll();
              setAvailableFlightPlans(response.data || response);
            } catch (err: any) {
              Alert.alert("Lỗi", "Không thể xóa mẫu kế hoạch");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    )
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    const dateTime = new Date(date);
    return dateTime.toLocaleDateString('vi-VN');
  }
  const formatTime = (date: any) => {
    if (!date) return "-";
    const dateTime = new Date(date);
    return dateTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  const formatId = (id: string) => {
    if (!id || id.length <= 12) return id;
    return `${id.substring(0, 10)}...${id.substring(id.length - 4)}`;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'Đã lên lịch';
      case 'IN_PROGRESS': return 'Đang thực hiện';
      case 'COMPLETED': return 'Hoàn thành';
      default: return status || 'Không rõ';
    }
  }

  const getDroneInfo = (droneData: any) => {
    if (!droneData) return 'Chưa định danh Drone';

    if (typeof droneData === 'object' && droneData.model) {
      return `${droneData.model} (${droneData.droneId})`;
    }

    const droneIdStr = typeof droneData === 'string' ? droneData : droneData._id;
    const foundDrone = dronesMap[droneIdStr];
    if (foundDrone) {
      return `${foundDrone.model} (${formatId(foundDrone.droneId || droneIdStr)})`;
    }

    return `Drone ID: ${droneIdStr ? formatId(droneIdStr) : 'Unknown'}`;
  };

  const zonesGeoJSON = useMemo(() => {
    if (zones.length === 0) return null;
    return turf.featureCollection(
      zones.map(z => turf.feature(z.geometry, { type: z.type, name: z.name }))
    );
  }, [zones]);

  const defaultCameraSettings = useMemo(() => {
    if (!mission?.missionPlans || mission.missionPlans.length === 0) {
      if (zones.length > 0) {
        try {
          const firstZone = zones[0];
          if (firstZone.geometry) {
            const center = turf.center(firstZone.geometry as any);
            return { centerCoordinate: center.geometry.coordinates, zoomLevel: 11 };
          }
        } catch (e) {}
      }
      return { centerCoordinate: [106.6297, 10.8231], zoomLevel: 14 };
    }
    const allCoords: any[] = [];
    mission.missionPlans.forEach((plan: any) => {
      if (plan.flightPlan?.routeGeometry?.coordinates) {
        // handle multi format
        const coords = plan.flightPlan.routeGeometry.coordinates;
        // Check if nested or flat
        if (coords.length > 0 && Array.isArray(coords[0])) {
          allCoords.push(...coords);
        }
      } else if (plan.flightPlan?.waypoints) {
        plan.flightPlan.waypoints.forEach((wp: any) => {
          if (wp.longitude && wp.latitude) {
            allCoords.push([wp.longitude, wp.latitude]);
          }
        });
      }
    });

    if (allCoords.length === 0) {
      return { centerCoordinate: [106.6297, 10.8231], zoomLevel: 14 };
    }

    if (allCoords.length === 1) {
      return { centerCoordinate: allCoords[0], zoomLevel: 16 };
    }

    try {
      const line = turf.lineString(allCoords);
      const bbox = turf.bbox(line); // [minX, minY, maxX, maxY]
      return {
        bounds: {
          ne: [bbox[2], bbox[3]],
          sw: [bbox[0], bbox[1]],
          paddingTop: 50,
          paddingBottom: 50,
          paddingLeft: 50,
          paddingRight: 50
        }
      };
    } catch {
      return { centerCoordinate: allCoords[0], zoomLevel: 14 };
    }
  }, [mission?.missionPlans, zones]);

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.setCamera({ ...defaultCameraSettings, animationDuration: 500 } as any);
    }
  }, [defaultCameraSettings]);

  const renderMapBox = (isFullscreen: boolean) => (
        <View style={isFullscreen ? { flex: 1 } : styles.mapContainer}>
          <Mapbox.MapView
            style={{ flex: 1 }}
            styleURL={Mapbox.StyleURL.SatelliteStreet}
            logoEnabled={false}
            attributionEnabled={false}
            scrollEnabled={true}
            zoomEnabled={true}
          >
            <Mapbox.Camera ref={cameraRef} defaultSettings={defaultCameraSettings as any} />

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
              </Mapbox.ShapeSource>
            )}

            {/* RENDER LINES */}
            {mission?.missionPlans?.map((plan: any, index: number) => {
              let geometry = plan.flightPlan?.routeGeometry;
              if (!geometry && plan.flightPlan?.waypoints?.length > 1) {
                geometry = turf.lineString(plan.flightPlan.waypoints.map((w: any) => [w.longitude, w.latitude])).geometry;
              }
              if (!geometry) return null;

              return (
                <Mapbox.ShapeSource key={`route-${index}`} id={`routeSource-${index}`} shape={geometry as any}>
                  <Mapbox.LineLayer
                    id={`routeLine-${index}`}
                    style={{
                      lineColor: ['#00D1FF', '#E65100', '#2E7D32', '#8E24AA'][index % 4],
                      lineWidth: 3,
                      lineJoin: 'round',
                      lineCap: 'round',
                      lineDasharray: [2, 2]
                    }}
                  />
                </Mapbox.ShapeSource>
              );
            })}

            {/* RENDER POINTS */}
            {mission?.missionPlans?.map((plan: any, planIndex: number) => (
              plan.flightPlan?.waypoints?.map((wp: any, wpIndex: number) => (
                <Mapbox.PointAnnotation
                  key={`wp-${planIndex}-${wpIndex}`}
                  id={`wp-${planIndex}-${wpIndex}`}
                  coordinate={[wp.longitude, wp.latitude]}
                >
                  <View style={[styles.markerContainer, { backgroundColor: ['#00D1FF', '#E65100', '#2E7D32', '#8E24AA'][planIndex % 4] }]}>
                    <Text style={styles.markerText}>{wp.sequenceNumber || wpIndex + 1}</Text>
                  </View>
                </Mapbox.PointAnnotation>
              ))
            ))}
          </Mapbox.MapView>

          {!isFullscreen && (
            <View style={styles.statusOverlay}>
              <Text style={styles.statusOverlayText}>{getStatusText(mission?.mission?.status || '')}</Text>
            </View>
          )}

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F222A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết Kế hoạch</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {mission?.mission?.status === 'DRAFT' && (
            <TouchableOpacity style={styles.actionBtn} onPress={openEditMission}>
              <Ionicons name="create-outline" size={22} color="#1565C0" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={handleDeleteMission}>
            <Ionicons name="trash-outline" size={22} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Bản đồ khu vực bay */}
        {!isMapFullscreen && renderMapBox(false)}

        {/* Thông tin chung */}
        <View style={styles.section}>
          <Text style={styles.missionTitle}>{mission?.mission?.name}</Text>
          <Text style={styles.missionId}>Mã nhiệm vụ: {formatId(mission?.mission?._id || '')}</Text>
          <Text style={styles.description}>{mission?.mission?.description}</Text>

          {/* {mission?.mission?.createdBy && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }}>
              <Image source={{ uri: mission.mission.createdBy.profile?.avatar || 'https://ui-avatars.com/api/?name=' + (mission.mission.createdBy.profile?.fullName || 'User') }} style={{ width: 34, height: 34, borderRadius: 17, marginRight: 10, backgroundColor: '#eee' }} />
              <Text style={{ fontSize: 13, color: '#666' }}>Tạo bởi: <Text style={{ fontWeight: 'bold', color: '#1F222A' }}>{mission.mission.createdBy.profile?.fullName || mission.mission.createdBy.email}</Text></Text>
            </View>
          )} */}
        </View>

        {/* Bảng thông số chi tiết của Mission Plans */}
        <View style={styles.sectionHeadingContainer}>
          <Text style={styles.sectionHeading}>Danh sách Kế hoạch Bay</Text>
          {mission?.mission?.status === 'DRAFT' && (
            <TouchableOpacity style={styles.addPlanBtn} onPress={handleOpenAddPlan}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addPlanBtnText}>Thêm</Text>
            </TouchableOpacity>
          )}
        </View>
        {mission?.missionPlans && mission.missionPlans.length > 0 ? (
          mission.missionPlans.map((plan: any, index: number) => (
            <View key={plan._id || index} style={styles.detailsCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>Kế hoạch {index + 1}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={styles.planBadge}>{getStatusText(plan.status)}</Text>
                  {mission?.mission?.status === 'DRAFT' && (
                    <TouchableOpacity onPress={() => handleRemoveMissionPlan(plan._id)}>
                      <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}><Ionicons name="time" size={20} color="#1565C0" /></View>
                <View>
                  <Text style={styles.detailLabel}>Thời gian dự kiến</Text>
                  <Text style={styles.detailValue}>
                    {formatTime(plan.plannedStart)} ({formatDate(plan.plannedStart)}) - {formatTime(plan.plannedEnd)} ({formatDate(plan.plannedEnd)})
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={[styles.detailIconBox, { backgroundColor: '#E8F5E9' }]}><Ionicons name="location" size={20} color="#2E7D32" /></View>
                <View>
                  <Text style={styles.detailLabel}>Ghi chú</Text>
                  <Text style={styles.detailValue}>{plan.notes || 'Không có ghi chú'}</Text>
                </View>
              </View>
              {(plan.flightPlan?.drone || plan.flightPlan?.pilot) && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIconBox, { backgroundColor: '#FFF3E0' }]}><Ionicons name="hardware-chip" size={20} color="#E65100" /></View>
                    <View>
                      <Text style={styles.detailLabel}>Drone</Text>
                      <Text style={styles.detailValue}>
                        {getDroneInfo(plan.flightPlan?.drone)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          ))
        ) : (
          <Text style={{ marginHorizontal: 20, color: '#888', fontStyle: 'italic' }}>Chưa có kế hoạch bay nào được gán cho nhiệm vụ này.</Text>
        )}

      </ScrollView>

      {/* Nút Hành động cố định ở dưới */}
      {mission?.mission?.status === 'DRAFT' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.startBtn} activeOpacity={0.8} onPress={handleStartMission}>
            <Ionicons name="paper-plane" size={20} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.startBtnText}>BẮT ĐẦU NHIỆM VỤ</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0055FF" />
        </View>
      )}

      {/* Modal chọn Flight Plan */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Kế hoạch bay</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => { setModalVisible(false); router.push('/(FleetOperator)/create-flight-plan'); }}>
                  <Ionicons name="add-circle" size={28} color="#2E7D32" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#1F222A" />
                </TouchableOpacity>
              </View>
            </View>
            <FlatList
              data={availableFlightPlans}
              keyExtractor={(item: any) => item._id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={[styles.flightPlanItem, { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => initAddPlan(item._id)}>
                    <View style={styles.flightPlanItemIcon}>
                      <Ionicons name="map" size={20} color="#1565C0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.flightPlanItemTitle}>FP-{item._id.slice(-6).toUpperCase()}</Text>
                      {item.notes ? (
                        <Text style={[styles.flightPlanItemDesc, { color: '#444', marginBottom: 2 }]} numberOfLines={2}>
                          {item.notes}
                        </Text>
                      ) : null}
                      <Text style={styles.flightPlanItemDesc} numberOfLines={1}>
                        <Ionicons name="hardware-chip-outline" size={12} /> {getDroneInfo(item.drone)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {selectedForAdd === item._id && (
                    <View style={{ marginTop: 15, borderTopWidth: 1, borderColor: '#EEE', paddingTop: 15 }}>
                      <Text style={[styles.inputLabel, { marginTop: 0 }]}>Giờ bắt đầu (YYYY-MM-DD HH:mm):</Text>
                      <TextInput
                        style={[styles.textInput, { paddingVertical: 10, fontSize: 15 }]}
                        value={plannedStartInput}
                        onChangeText={setPlannedStartInput}
                        placeholder="Ví dụ: 2026-03-20 08:30"
                      />
                      <TouchableOpacity style={[styles.primaryBtn, { height: 45, marginTop: 15 }]} onPress={confirmAddPlan}>
                        <Text style={styles.primaryBtnText}>Xác nhận thêm</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>Không có kế hoạch bay nào sẵn sàng.</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL FULL SCREEN MAP */}
      <Modal visible={isMapFullscreen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F222A' }}>Bản đồ lộ trình bay</Text>
                <Text style={{ fontSize: 13, color: '#0055FF', fontWeight: 'bold' }}>{mission?.missionPlans?.length || 0} kế hoạch</Text>
              </View>
              <TouchableOpacity onPress={() => setIsMapFullscreen(false)}>
                <Ionicons name="contract" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            {isMapFullscreen && renderMapBox(true)}
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal Edit Mission */}
      <Modal visible={editMissionModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật Nhiệm vụ</Text>
              <TouchableOpacity onPress={() => setEditMissionModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1F222A" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tên nhiệm vụ (*)</Text>
              <TextInput
                style={styles.textInput}
                value={editMissionData.name}
                onChangeText={(t) => setEditMissionData({ ...editMissionData, name: t })}
                placeholder="Nhập tên nhiệm vụ"
              />
              <Text style={styles.inputLabel}>Mô tả</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                value={editMissionData.description}
                onChangeText={(t) => setEditMissionData({ ...editMissionData, description: t })}
                placeholder="Mô tả chi tiết nhiệm vụ"
                multiline
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdateMission}>
                <Text style={styles.primaryBtnText}>CẬP NHẬT</Text>
              </TouchableOpacity>
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
  actionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A' },
  scrollContent: { paddingBottom: 100 }, // Chừa chỗ cho Bottom Bar

  mapContainer: { width: '100%', height: 250, backgroundColor: '#ddd', position: 'relative' },
  statusOverlay: { position: 'absolute', top: 15, right: 15, backgroundColor: '#FF9800', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusOverlayText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  markerContainer: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
  markerText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  section: { padding: 20 },
  missionTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F222A', marginBottom: 5 },
  missionId: { fontSize: 14, color: '#888', marginBottom: 15, fontWeight: '600' },
  description: { fontSize: 15, color: '#555', lineHeight: 22 },

  detailsCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 15, borderRadius: 16, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  planTitle: { fontSize: 16, fontWeight: '700', color: '#1F222A' },
  planBadge: { fontSize: 12, fontWeight: '600', color: '#E65100', backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  detailIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  detailLabel: { fontSize: 13, color: '#888', marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1F222A', flexShrink: 1 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 55 },

  sectionHeadingContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 10, marginBottom: 15 },
  sectionHeading: { fontSize: 18, fontWeight: 'bold', color: '#1F222A' },
  addPlanBtn: { backgroundColor: '#FF9800', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addPlanBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#eee' },
  startBtn: { backgroundColor: '#0055FF', flexDirection: 'row', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#0055FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A' },
  flightPlanItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  flightPlanItemIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  flightPlanItemTitle: { fontSize: 15, fontWeight: 'bold', color: '#1F222A', marginBottom: 4 },
  flightPlanItemDesc: { fontSize: 13, color: '#888' },

  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#1F222A', marginBottom: 8, marginTop: 10 },
  textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 15, fontSize: 16, color: '#1F222A', backgroundColor: '#F9F9F9' },
  primaryBtn: { backgroundColor: '#0055FF', borderRadius: 12, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});