import droneApi from '@/api/droneApi';
import FavouriteApi from '@/api/favouriteApi';
import { flightSessionApi } from '@/api/flightSessionApi';
import zoneApi from '@/api/zoneApi';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Mapbox from "@rnmapbox/maps";
import * as turf from '@turf/turf';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { io, Socket } from "socket.io-client";

// const SIMULATOR_URL = "http://10.139.229.139:3001";
// const REAL_BE_URL = "http://10.139.229.139:3000";

const SIMULATOR_URL = "http://192.168.1.87:3001";
const REAL_BE_URL = "http://192.168.1.87:3000";

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

  // CỜ QUAN TRỌNG: Kiểm tra xem có đang trong chuyến bay không
  // Nếu có sessionId thực sự (khác rỗng, khác undefined) thì mới là Active Flight
  const isActiveFlight = !!sessionId && sessionId !== '';

  const [drones, setDrones] = useState<Record<string, DroneState>>({});
  const [isEnding, setIsEnding] = useState(false);

  const [simulatorDroneId, setSimulatorDroneId] = useState<string>('');
  const [droneModel, setDroneModel] = useState<string>('Đang kết nối...');

  // State quản lý Zones và cảnh báo
  const [zones, setZones] = useState<any[]>([]);
  const zonesRef = useRef<any[]>([]);
  const [warningZone, setWarningZone] = useState<{ name: string, type: string } | null>(null);

  // Lưu 2 Refs để dọn dẹp khi thoát màn hình
  const simSocketRef = useRef<Socket | null>(null);
  const beSocketRef = useRef<Socket | null>(null);

  // States for map selection and favourite
  const [selectedPoint, setSelectedPoint] = useState<{lat: number, lng: number} | null>(null);
  const [distanceToSelected, setDistanceToSelected] = useState<number | null>(null);
  const [favouriteName, setFavouriteName] = useState<string>('');
  const [isSavingFav, setIsSavingFav] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [favouritesList, setFavouritesList] = useState<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const favLat = params.favLat as string;
  const favLng = params.favLng as string;

  useEffect(() => {
    const fetchUser = async () => {
      const id = await AsyncStorage.getItem("USER_PROFILE_ID");
      if (id) {
        const parsedId = JSON.parse(id);
        setUserId(parsedId);
        
        try {
          const res = await FavouriteApi.get(parsedId);
          const list = res?.data?.data || res?.data || res || [];
          if (Array.isArray(list)) setFavouritesList(list);
        } catch (error) {
          console.error("Lỗi lấy danh sách yêu thích:", error);
        }
      }
    };
    fetchUser();
  }, []);

  // Track keyboard height for absolute panel
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Di chuyển camera khi đi từ tab Favourite sang và map đã sẵn sàng
  useEffect(() => {
    if (favLat && favLng && mapReady && cameraRef.current) {
      const lat = parseFloat(favLat);
      const lng = parseFloat(favLng);

      // Chỉ bay đến điểm, KHÔNG mở form nhập (điểm đã là yêu thích rồi)
      cameraRef.current.setCamera({
        centerCoordinate: [lng, lat],
        zoomLevel: 18,
        animationDuration: 800,
      });
    }
  }, [favLat, favLng, mapReady]);

  useEffect(() => {
    const initData = async () => {
      try {
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

      // 💡 THÊM ĐOẠN NÀY: Báo cho Giả lập biết đang bay chuyến nào
      simSocket.on("connect", () => {
        if (sessionId && simulatorDroneId) {
          console.log(`🚀 Báo cho Giả lập: Khởi tạo chuyến bay ${sessionId}`);
          simSocket.emit("drone:init", {
            droneId: simulatorDroneId,
            sessionId: sessionId,
            token: JWT_TOKEN
          });
        }
      });

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
        Alert.alert("CẢNH BÁO", alertData.message);
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

            // 💡 FIX LỖI CACHE CỦA TABBAR: Xóa sạch params sau khi kết thúc
            router.setParams({
              sessionId: '',
              connectedDroneId: '',
              droneId: ''
            });

          } catch (error) {
            console.log("Lỗi End Session:", error);
          } finally {
            setIsEnding(false);
            router.back();
          }
        }
      }
    ]);
  };

  const currentDrone = drones[simulatorDroneId] || { speed: 0, altitude: 0, heading: 0, batteryLevel: 100, lng: 106.81809, lat: 10.82615 };

  const handleMapPress = (e: any) => {
    if (!e || !e.geometry || !e.geometry.coordinates) return;
    const [lng, lat] = e.geometry.coordinates;
    setSelectedPoint({ lat, lng });

    const fromLng = currentDrone?.lng || 106.81809;
    const fromLat = currentDrone?.lat || 10.82615;
    
    if (fromLng && fromLat) {
      const distance = turf.distance(
        turf.point([fromLng, fromLat]),
        turf.point([lng, lat]),
        { units: 'kilometers' }
      );
      setDistanceToSelected(distance);
    }
  };

  const handleSaveFavourite = async () => {
    if (!selectedPoint || !userId) {
      Alert.alert("Lỗi", "Vui lòng chọn điểm và đảm bảo đã đăng nhập.");
      return;
    }
    if (!favouriteName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên địa điểm.");
      return;
    }
    
    try {
      setIsSavingFav(true);
      await FavouriteApi.create({
        user_id: userId,
        location: { type: 'Point', coordinates: [selectedPoint.lng, selectedPoint.lat] },
        name: favouriteName,
        address: `Tọa độ: ${selectedPoint.lat.toFixed(5)}, ${selectedPoint.lng.toFixed(5)}`,
        numberOfFlight: 0
      });

      // Update local list to show the new heart immediately
      setFavouritesList(prev => [...prev, {
        _id: Math.random().toString(),
        name: favouriteName,
        location: { lat: selectedPoint.lat, lng: selectedPoint.lng }
      }]);

      Alert.alert("Thành công", "Đã lưu địa điểm yêu thích!");
      setSelectedPoint(null);
      setFavouriteName('');
      setDistanceToSelected(null);
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không thể lưu địa điểm.");
    } finally {
      setIsSavingFav(false);
    }
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

  return (
    <View style={styles.container}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

      {/* 💡 CHỈ HIỆN NÚT QUAY LẠI NẾU ĐANG ĐI TỪ PHIÊN BAY VÀO */}
      {isActiveFlight && (
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      )}

      {/* CHỈ HIỆN CẢNH BÁO NẾU ĐANG CÓ CHUYẾN BAY */}
      {isActiveFlight && warningZone && (
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

      <Mapbox.MapView
        style={styles.map}
        styleURL={Mapbox.StyleURL.SatelliteStreet}
        onPress={handleMapPress}
        onDidFinishLoadingMap={() => setMapReady(true)}
      >
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

        {selectedPoint && (
          <Mapbox.ShapeSource id="selected-point-source" shape={turf.point([selectedPoint.lng, selectedPoint.lat]) as any}>
            <Mapbox.CircleLayer
              id="selected-point-circle"
              style={{
                circleRadius: 8,
                circleColor: '#FF3B30',
                circleStrokeColor: '#FFFFFF',
                circleStrokeWidth: 2,
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {favouritesList.map((fav, index) => {
          if (!fav.location || !fav.location.lng || !fav.location.lat) return null;
          return (
            <Mapbox.PointAnnotation
              key={`fav-${fav._id || index}`}
              id={`fav-anno-${fav._id || index}`}
              coordinate={[fav.location.lng, fav.location.lat]}
            >
              <View style={styles.heartMarker}>
                <Ionicons name="heart" size={24} color="#FF3B30" />
              </View>
            </Mapbox.PointAnnotation>
          );
        })}
      </Mapbox.MapView>

      {/* 💡 CHỈ HIỆN KHUNG ĐIỀU KHIỂN & KẾT THÚC BAY NẾU ĐANG LÀ CHUYẾN BAY ACTIVE */}
      {isActiveFlight && (
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
      )}

      {selectedPoint && (
        <View
          style={[
            styles.favPanel,
            {
              bottom: (isActiveFlight ? 220 : 20) + keyboardHeight
            }
          ]}
        >
          <View style={styles.favHeader}>
            <Text style={styles.favTitle}>Điểm đã chọn</Text>
            <TouchableOpacity onPress={() => setSelectedPoint(null)}>
              <Ionicons name="close-circle" size={24} color="#888" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.favText}>Tọa độ: {selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}</Text>
          {distanceToSelected !== null && (
            <Text style={styles.favText}>Cách vị trí hiện tại: <Text style={{fontWeight: 'bold', color: '#0055FF'}}>{distanceToSelected.toFixed(2)} km</Text></Text>
          )}

          <TextInput
            style={styles.favInput}
            placeholder="Nhập tên địa điểm..."
            value={favouriteName}
            onChangeText={setFavouriteName}
          />
          
          <TouchableOpacity 
            style={styles.favBtn} 
            onPress={handleSaveFavourite} 
            disabled={isSavingFav}
          >
            {isSavingFav ? <ActivityIndicator color="#fff" /> : <Text style={styles.favBtnText}>LƯU YÊU THÍCH</Text>}
          </TouchableOpacity>
        </View>
      )}
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
  endBtnText: { color: 'white', fontWeight: 'bold' },
  favPanel: { position: 'absolute', left: 20, right: 20, backgroundColor: 'white', borderRadius: 16, padding: 16, elevation: 12, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: -4 } },
  favHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  favTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  favText: { fontSize: 14, color: '#555', marginBottom: 4 },
  favInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, marginBottom: 12, fontSize: 14, backgroundColor: '#F9F9F9' },
  favBtn: { backgroundColor: '#0055FF', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  favBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  heartMarker: {
    backgroundColor: 'white',
    padding: 4,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
    justifyContent: 'center',
  }
});