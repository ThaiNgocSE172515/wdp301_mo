import droneApi from '@/api/droneApi';
import { flightSessionApi } from '@/api/flightSessionApi';
import zoneApi from '@/api/zoneApi';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Mapbox from "@rnmapbox/maps";
import * as turf from '@turf/turf';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { io, Socket } from "socket.io-client";

const SIMULATOR_URL = "http://10.139.229.139:3001";
const REAL_BE_URL = "http://10.139.229.139:3000";

type DroneState = {
  droneId: string;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  heading: number;
  batteryLevel: number;
};

export default function MapViewerScreen() {
  const router = useRouter();
  const cameraRef = useRef<Mapbox.Camera>(null);

  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string;
  const connectedMongoId = (params.connectedDroneId || params.droneId) as string;

  const [drones, setDrones] = useState<Record<string, DroneState>>({});
  const [isEnding, setIsEnding] = useState(false);

  const [simulatorDroneId, setSimulatorDroneId] = useState<string>('');
  const [droneModel, setDroneModel] = useState<string>('Đang kết nối...');

  // State quản lý Zones và cảnh báo
  const [zones, setZones] = useState<any[]>([]);
  const zonesRef = useRef<any[]>([]);
  const [warningZone, setWarningZone] = useState<{ name: string, type: string } | null>(null);
  
  // 🔥 Dùng để nhớ xem đã bật Alert cho zone này chưa (tránh spam Alert liên tục)
  const lastWarningZoneRef = useRef<string | null>(null);

  // Lưu 2 Refs để dọn dẹp khi thoát màn hình
  const simSocketRef = useRef<Socket | null>(null);
  const beSocketRef = useRef<Socket | null>(null);

  // 1. TẢI DATA BAN ĐẦU
  useEffect(() => {
    const initData = async () => {
      try {
        // Lấy thông tin Drone
        const dRes = await droneApi.getAll();
        const myDrone = dRes.data.find((d: any) => d._id === connectedMongoId);

        if (myDrone) {
          setSimulatorDroneId(myDrone.droneId);
          setDroneModel(myDrone.model);
          console.log("\n=======================================================");
          console.log(`👉 DRONE ID:    ${myDrone.droneId}`);
          console.log(`👉 SESSION ID:  ${sessionId}`);
          console.log("=======================================================\n");
        }

        const zRes = await zoneApi.getAll({ limit: 100 });
        // Lấy data an toàn đề phòng API trả về cấu trúc bọc 2 lớp data
        const zoneList = zRes.data?.data || zRes.data || []; 
        if (Array.isArray(zoneList)) {
          setZones(zoneList);
          zonesRef.current = zoneList;
        }

      } catch (e) {
        console.log("Lỗi tải data:", e);
      }
    };

    if (connectedMongoId && sessionId) {
      initData();
    }
  }, [connectedMongoId, sessionId]);

  useEffect(() => {
    let simSocket: Socket;
    let beSocket: Socket;

    const connectSockets = async () => {
      const JWT_TOKEN = await AsyncStorage.getItem('ACCESS_TOKEN');

      simSocket = io(SIMULATOR_URL, { transports: ["websocket"] });
      simSocketRef.current = simSocket;

      simSocket.on("drone:position", (data) => {
        if (!data) return;
        const dId = data.droneId || simulatorDroneId;
        const droneLng = parseFloat(data.lng);
        const droneLat = parseFloat(data.lat);

        setDrones(prev => {
          const prevDrone = prev[dId];
          return {
            ...prev,
            [dId]: {
              droneId: dId,
              lat: droneLat,
              lng: droneLng,
              altitude: parseFloat(data.altitude ?? prevDrone?.altitude ?? 0),
              speed: parseFloat(data.speed ?? prevDrone?.speed ?? 0),
              heading: parseFloat(data.heading ?? prevDrone?.heading ?? 0),
              batteryLevel: parseFloat(data.batteryLevel ?? prevDrone?.batteryLevel ?? 100),
            }
          };
        });

        if (dId === simulatorDroneId) {
          const dronePoint = turf.point([droneLng, droneLat]);
          let currentWarning = null;

          for (const zone of zonesRef.current) {
            try {
              if (zone.geometry && zone.geometry.coordinates) {
                // Dùng turf.polygon thay vì feature để tránh lỗi ép kiểu
                const polygon = turf.polygon(zone.geometry.coordinates);
                const isInside = turf.booleanPointInPolygon(dronePoint, polygon as any);

                if (isInside) {
                  currentWarning = { name: zone.name, type: zone.type };
                  break; // Báo động vùng đầu tiên chạm phải
                }
              }
            } catch (err) {
              console.log("Turf parse error for zone:", zone.name, err);
            }
          }
          
          setWarningZone(currentWarning);

          // // HIỆN POPUP ALERT (Chỉ hiện 1 lần duy nhất khi vừa bay vào)
          // if (currentWarning) {
          //   if (lastWarningZoneRef.current !== currentWarning.name) {
          //     Alert.alert(
          //       currentWarning.type === 'no_fly' ? "CẢNH BÁO: VÙNG CẤM BAY" : "⚠️ CHÚ Ý: VÙNG HẠN CHẾ",
          //       `Drone của bạn đang đi vào khu vực: ${currentWarning.name}. Yêu cầu chuyển hướng ngay!`,
          //       [{ text: "Đã hiểu", style: "cancel" }]
          //     );
          //     lastWarningZoneRef.current = currentWarning.name; // Ghi nhớ là đã cảnh báo
          //   }
          // } else {
          //   // Khi bay ra khỏi vùng, reset lại để lần sau bay vào còn báo tiếp
          //   lastWarningZoneRef.current = null;
          // }

          // Cập nhật camera đi theo drone
          if (cameraRef.current) {
            cameraRef.current.setCamera({
              centerCoordinate: [droneLng, droneLat],
              animationDuration: 500,
            });
          }
        }
      });

      beSocket = io(REAL_BE_URL, {
        path: "/ws",
        auth: { token: JWT_TOKEN },
        transports: ["websocket"]
      });
      beSocketRef.current = beSocket;

      beSocket.on("connect", () => {
        if (sessionId) beSocket.emit("watch_session", { sessionId: sessionId });
      });

      beSocket.on("alert", (alertData) => {
        Alert.alert("🚨 CẢNH BÁO", alertData.message);
      });
    };

    if (sessionId && simulatorDroneId) connectSockets();

    return () => {
      if (simSocketRef.current) simSocketRef.current.disconnect();
      if (beSocketRef.current) beSocketRef.current.disconnect();
    };
  }, [sessionId, simulatorDroneId]);

  const handleEndFlight = async () => {
    if (!sessionId) return;
    Alert.alert("Xác nhận", "Kết thúc chuyến bay này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Kết thúc", style: "destructive", onPress: async () => {
          try {
            setIsEnding(true);
            await flightSessionApi.endSession(sessionId);
            router.back();
          } catch (error) {
            console.log("Lỗi End Session:", error);
            router.back();
          }
        }
      }
    ]);
  };

  const dronesGeoJSON = useMemo(() => {
    const list = Object.values(drones);
    if (list.length === 0) return null;
    return turf.featureCollection(
      list.map(d => turf.point([d.lng, d.lat], { ...d, isConnected: d.droneId === simulatorDroneId }))
    );
  }, [drones, simulatorDroneId]);

  const zonesGeoJSON = useMemo(() => {
    if (zones.length === 0) return null;
    return turf.featureCollection(
      zones.map(z => turf.feature(z.geometry, { type: z.type, name: z.name }))
    );
  }, [zones]);

  const currentDrone = drones[simulatorDroneId] || { speed: 0, altitude: 0, heading: 0, batteryLevel: 100 };

  return (
    <View style={styles.container}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      {warningZone && (
        <View style={[styles.warningBanner, { backgroundColor: warningZone.type === 'no_fly' ? 'rgba(255,59,48,0.95)' : 'rgba(255,204,0,0.95)' }]}>
          <Ionicons name="warning" size={26} color={warningZone.type === 'no_fly' ? '#FFF' : '#333'} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[styles.warningTitle, { color: warningZone.type === 'no_fly' ? '#FFF' : '#333' }]}>
              {warningZone.type === 'no_fly' ? 'CẢNH BÁO: VÙNG CẤM BAY' : 'CHÚ Ý: VÙNG HẠN CHẾ'}
            </Text>
            <Text style={[styles.warningText, { color: warningZone.type === 'no_fly' ? '#FFF' : '#333' }]}>
              Drone đang trong khu vực {warningZone.name}
            </Text>
          </View>
        </View>
      )}

      <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.SatelliteStreet}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [106.81809, 10.82615],
            zoomLevel: 16,
            pitch: 65, 
          }}
          heading={currentDrone.heading || 0}
        />

        <Mapbox.VectorSource id="composite" url="mapbox://mapbox.mapbox-streets-v8">
          <Mapbox.FillExtrusionLayer
            maxZoomLevel={20}
            id="3d-buildings"
            sourceLayerID="building"
            minZoomLevel={15}
            style={{
              fillExtrusionColor: '#aaa',
              fillExtrusionHeight: ['get', 'height'],
              fillExtrusionBase: ['get', 'min_height'],
              fillExtrusionOpacity: 1,
            }}
          />
        </Mapbox.VectorSource>

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

        {dronesGeoJSON && (
          <Mapbox.ShapeSource id="drones" shape={dronesGeoJSON as any}>
            <Mapbox.CircleLayer
              id="drone-circle"
              style={{
                circleRadius: 10,
                circleColor: "#69F0AE",
                circleStrokeColor: ["case", ["==", ["get", "isConnected"], true], "#00E5FF", "#ffffff"],
                circleStrokeWidth: 3,
                circlePitchAlignment: "map", 
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      <View style={styles.bottomPanel}>
        <Text style={styles.droneModelName}>{droneModel}</Text>
        
        <View style={styles.subHeaderPanel}>
          <View>
            <Text style={styles.infoText}>
              Drone ID: <Text style={{ fontWeight: 'bold', color: '#333' }}>{simulatorDroneId || connectedMongoId}</Text>
            </Text>
            <Text style={styles.infoText}>
              Session ID: <Text style={{ fontWeight: 'bold', color: '#333' }}>{sessionId}</Text>
            </Text>
          </View>
          <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>{currentDrone.batteryLevel}% 🔋</Text>
        </View>

        <View style={styles.telemetryRow}>
          <View style={styles.telemetryBox}><Text style={styles.telemetryValue}>{currentDrone.speed}</Text><Text style={styles.telemetryLabel}>Tốc độ</Text></View>
          <View style={styles.telemetryBox}><Text style={styles.telemetryValue}>{currentDrone.altitude}</Text><Text style={styles.telemetryLabel}>Độ cao</Text></View>
          <View style={styles.telemetryBox}><Text style={styles.telemetryValue}>{currentDrone.heading}°</Text><Text style={styles.telemetryLabel}>Hướng</Text></View>
        </View>
        <TouchableOpacity style={styles.endBtn} onPress={handleEndFlight} disabled={isEnding}>
          {isEnding ? <ActivityIndicator color="white" /> : <Text style={styles.endBtnText}>KẾT THÚC BAY</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  map: { flex: 1 },
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'white', padding: 10, borderRadius: 20, elevation: 5 },
  warningBanner: { position: 'absolute', top: 110, left: 20, right: 20, zIndex: 10, flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  warningTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  warningText: { fontSize: 13, fontWeight: '500' },
  bottomPanel: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 10 },
  droneModelName: { fontSize: 18, fontWeight: 'bold', color: '#1F222A', marginBottom: 5 },
  subHeaderPanel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  infoText: { fontSize: 13, color: '#888' },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  telemetryBox: { alignItems: 'center', flex: 1 },
  telemetryValue: { fontSize: 16, fontWeight: 'bold' },
  telemetryLabel: { fontSize: 10, color: '#AAA' },
  endBtn: { backgroundColor: '#FF3B30', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  endBtnText: { color: 'white', fontWeight: 'bold' }
});