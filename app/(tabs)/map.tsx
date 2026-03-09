import droneApi from '@/api/droneApi';
import { flightSessionApi } from '@/api/flightSessionApi';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Mapbox from "@rnmapbox/maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { io, Socket } from "socket.io-client";

// 🔥 CẤU HÌNH 2 IP CHO 2 SOCKET KHÁC NHAU
const SIMULATOR_URL = "http://192.168.1.12:3001"; // Nguồn 1: Giả lập (Lấy tọa độ bay real-time)
const REAL_BE_URL = "http://192.168.1.12:3000";   // Nguồn 2: Backend Sếp Duy (Nhận cảnh báo, kết thúc)

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

  // Lưu 2 Refs để dọn dẹp khi thoát màn hình
  const simSocketRef = useRef<Socket | null>(null);
  const beSocketRef = useRef<Socket | null>(null);

  // 1. TẢI DATA BAN ĐẦU VÀ IN LOG CHO SẾP COPY
  useEffect(() => {
    const initData = async () => {
      try {
        const dRes = await droneApi.getAll();
        const myDrone = dRes.data.find((d: any) => d._id === connectedMongoId);
        
        if (myDrone) {
          setSimulatorDroneId(myDrone.droneId);
          setDroneModel(myDrone.model);
          
          // 🔥 ĐOẠN NÀY IN LOG RA TERMINAL CHO SẾP COPY ĐÂY Ạ 🔥
          console.log("\n=======================================================");
          console.log("🚀 LẤY MÃ NÀY DÁN VÀO WEB GIẢ LẬP NHÉ SẾP NGỌC:");
          console.log(`👉 DRONE ID:    ${myDrone.droneId}`);
          console.log(`👉 SESSION ID:  ${sessionId}`);
          console.log("=======================================================\n");
        }
      } catch (e) { 
        console.log("Lỗi tải data:", e); 
      }
    };
    
    if (connectedMongoId && sessionId) {
      initData();
    }
  }, [connectedMongoId, sessionId]);

  // 2. CHẠY SONG SONG 2 SOCKET
  useEffect(() => {
    let simSocket: Socket;
    let beSocket: Socket;

    const connectSockets = async () => {
      const JWT_TOKEN = await AsyncStorage.getItem('ACCESS_TOKEN');

      // ========================================================
      // 🟢 VÒI 1: KẾT NỐI VÀO GIẢ LẬP (PORT 3001) ĐỂ VẼ BẢN ĐỒ
      // ========================================================
      simSocket = io(SIMULATOR_URL, { transports: ["websocket"] });
      simSocketRef.current = simSocket;

      simSocket.on("connect", () => console.log("🚀 Vòi 1: Đã thông ống với Giả lập!"));

      simSocket.on("drone:position", (data) => {
        if (!data) return;
        const dId = data.droneId || simulatorDroneId;

        setDrones(prev => {
          const prevDrone = prev[dId];
          const updated = {
            droneId: dId,
            lat: parseFloat(data.lat),
            lng: parseFloat(data.lng),
            altitude: parseFloat(data.altitude ?? prevDrone?.altitude ?? 0),
            speed: parseFloat(data.speed ?? prevDrone?.speed ?? 0),
            heading: parseFloat(data.heading ?? prevDrone?.heading ?? 0),
            batteryLevel: parseFloat(data.batteryLevel ?? prevDrone?.batteryLevel ?? 100),
          };
          return { ...prev, [dId]: updated };
        });

        if (dId === simulatorDroneId && cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [parseFloat(data.lng), parseFloat(data.lat)],
            animationDuration: 500,
          });
        }
      });

      // ========================================================
      // 🔵 VÒI 2: KẾT NỐI VÀO REAL BE (PORT 3000)
      // ========================================================
      beSocket = io(REAL_BE_URL, {
        path: "/ws",
        auth: { token: JWT_TOKEN },
        transports: ["websocket"]
      });
      beSocketRef.current = beSocket;

      beSocket.on("connect", () => {
        console.log("✅ Vòi 2: Đã thông vào hệ thống Real BE của Sếp Duy!");
        if (sessionId) {
          beSocket.emit("watch_session", { sessionId: sessionId });
        }
      });

      beSocket.on("alert", (alertData) => {
        Alert.alert("🚨 CẢNH BÁO HỆ THỐNG", alertData.message);
      });
    };

    if (sessionId && simulatorDroneId) connectSockets();

    return () => {
      if (simSocketRef.current) simSocketRef.current.disconnect();
      if (beSocketRef.current) beSocketRef.current.disconnect();
    };
  }, [sessionId, simulatorDroneId]);

  // 3. LOGIC KẾT THÚC PHIÊN BAY
  const handleEndFlight = async () => {
    if (!sessionId) return;
    Alert.alert("Xác nhận", "Kết thúc chuyến bay này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Kết thúc", style: "destructive", onPress: async () => {
          try {
            setIsEnding(true);
            await flightSessionApi.endSession(sessionId); // API gọi lên BE Sếp Duy
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
    return {
      type: "FeatureCollection",
      features: list.map(d => ({
        type: "Feature",
        properties: { ...d, isConnected: d.droneId === simulatorDroneId },
        geometry: { type: "Point", coordinates: [d.lng, d.lat] },
      })),
    };
  }, [drones, simulatorDroneId]);

  const currentDrone = drones[simulatorDroneId] || { speed: 0, altitude: 0, heading: 0, batteryLevel: 100 };

  return (
    <View style={styles.container}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.SatelliteStreet}>
        <Mapbox.Camera ref={cameraRef} defaultSettings={{ centerCoordinate: [106.81809, 10.82615], zoomLevel: 16 }} />
        {dronesGeoJSON && (
          <Mapbox.ShapeSource id="drones" shape={dronesGeoJSON as any}>
            <Mapbox.CircleLayer
              id="drone-circle"
              style={{
                circleRadius: 12,
                circleColor: "#69F0AE",
                circleStrokeColor: ["case", ["==", ["get", "isConnected"], true], "#00E5FF", "#ffffff"],
                circleStrokeWidth: 3,
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      {/* PANEL ĐIỀU KHIỂN */}
      <View style={styles.bottomPanel}>
        <Text style={styles.droneModelName}>{droneModel}</Text>
        <View style={styles.subHeaderPanel}>
          <Text style={styles.infoText}>ID: <Text style={{fontWeight: 'bold'}}>{simulatorDroneId}</Text></Text>
          <Text style={{color: '#4CAF50', fontWeight: 'bold'}}>{currentDrone.batteryLevel}% 🔋</Text>
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
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'white', padding: 10, borderRadius: 20 },
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