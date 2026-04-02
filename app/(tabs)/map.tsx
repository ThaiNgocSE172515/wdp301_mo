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

const SIMULATOR_URL = "http://192.168.1.10:3001";
const REAL_BE_URL = "http://192.168.1.10:5000";

type DroneState = {
  droneId: string;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  heading: number;
  batteryLevel: number;
  isMock?: boolean; // 🟢 THÊM PHẦN NÀY: Để đánh dấu máy bay ảo
};

export default function MapViewerScreen() {
  const router = useRouter();
  const cameraRef = useRef<Mapbox.Camera>(null);

  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string;
  const connectedMongoId = (params.connectedDroneId || params.droneId) as string;

  // CỜ QUAN TRỌNG: Kiểm tra xem có đang trong chuyến bay không
  const isActiveFlight = !!sessionId && sessionId !== '';

  const [drones, setDrones] = useState<Record<string, DroneState>>({});
  const [battery, setBattery] = useState(100);
  const [isEnding, setIsEnding] = useState(false);

  const [simulatorDroneId, setSimulatorDroneId] = useState<string>('');
  const [droneModel, setDroneModel] = useState<string>('Đang kết nối...');

  // State quản lý Zones và cảnh báo
  const [zones, setZones] = useState<any[]>([]);
  const zonesRef = useRef<any[]>([]);
  const [warningZone, setWarningZone] = useState<{ name: string, type: string, status: 'inside' | 'near' } | null>(null);

  // Lưu 2 Refs để dọn dẹp khi thoát màn hình
  const simSocketRef = useRef<Socket | null>(null);
  const beSocketRef = useRef<Socket | null>(null);

  // States for map selection and favourite
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number, lng: number } | null>(null);
  const [distanceToSelected, setDistanceToSelected] = useState<number | null>(null);
  const [favouriteName, setFavouriteName] = useState<string>('');
  const [isSavingFav, setIsSavingFav] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [favouritesList, setFavouritesList] = useState<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const mapRef = useRef<Mapbox.MapView>(null);
  const [buildingWarning, setBuildingWarning] = useState<{ isColliding: boolean, height: number, name: string } | null>(null);

  // 👉 THÊM DÒNG NÀY: State lưu cảnh báo va chạm với máy bay khác
  const [droneWarning, setDroneWarning] = useState<{ isColliding: boolean, droneId: string, distance: number } | null>(null);

  const lastCollisionCheck = useRef<number>(0);

  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [isWarningExpanded, setIsWarningExpanded] = useState(true);

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

  useEffect(() => {
    if (favLat && favLng && mapReady && cameraRef.current) {
      const lat = parseFloat(favLat);
      const lng = parseFloat(favLng);
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
        }

        console.log("\n=======================================================");
        console.log(`👉 DRONE ID:    ${myDrone?.droneId}`);
        console.log(`👉 SESSION ID:  ${sessionId}`);
        console.log("=======================================================\n");

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
    // Tự động bung bảng cảnh báo nếu phát hiện vật cản mới
    if (buildingWarning) {
      setIsWarningExpanded(true);
    }
  }, [buildingWarning?.name]);

  useEffect(() => {
    let simSocket: Socket;
    let beSocket: Socket;

    const connectSockets = async () => {
      const JWT_TOKEN = await AsyncStorage.getItem('ACCESS_TOKEN');

      // simSocket = io(SIMULATOR_URL, { transports: ["websocket"] });
      simSocket = io(SIMULATOR_URL, { transports: ["polling", "websocket"] });
      simSocketRef.current = simSocket;

      simSocket.on("connect", () => {
        if (sessionId && simulatorDroneId) {
          simSocket.emit("drone:init", {
            droneId: simulatorDroneId,
            sessionId: sessionId,
            token: JWT_TOKEN
          });
        }
      });

      simSocket.on("drone:battery", (data) => {
        return setBattery(data);
      })

      simSocket.on("drone:position", async (data) => {
        if (!data) return;
        const dId = data.droneId || simulatorDroneId;
        const droneLng = parseFloat(data.lng);
        const droneLat = parseFloat(data.lat);
        const droneAlt = parseFloat(data.altitude ?? 0);

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
          let currentWarning: { name: string, type: string, status: 'inside' | 'near' } | null = null;

          for (const zone of zonesRef.current) {
            try {
              if (zone.geometry && zone.geometry.coordinates) {
                const polygon = turf.polygon(zone.geometry.coordinates);

                const isInside = turf.booleanPointInPolygon(dronePoint, polygon as any);
                if (isInside) {
                  currentWarning = { name: zone.name, type: zone.type, status: 'inside' };
                  break;
                }

                const bufferedPolygon = turf.buffer(polygon, 0.5, { units: 'kilometers' });
                if (bufferedPolygon && turf.booleanPointInPolygon(dronePoint, bufferedPolygon)) {
                  if (!currentWarning) {
                    currentWarning = { name: zone.name, type: zone.type, status: 'near' };
                  }
                }
              }
            } catch (err) {
              console.log("Turf parse error for zone:", zone.name, err);
            }
          }

          setWarningZone(currentWarning);

          // --- 2. CHECK VA CHẠM TÒA NHÀ TRONG PHẠM VI 50M (DÙNG TỌA ĐỘ PIXEL) ---
          if (mapReady && mapRef.current) {
            const now = Date.now();
            if (now - lastCollisionCheck.current > 1000) {
              lastCollisionCheck.current = now;

              try {
                // Lấy tọa độ PIXEL của Drone
                const point = await mapRef.current.getPointInView([droneLng, droneLat]);

                // Mở rộng ra xung quanh Drone 60 pixel (~ tương đương bán kính an toàn)
                const DETECTION_RADIUS_PIXELS = 60;

                const top = point[1] - DETECTION_RADIUS_PIXELS;
                const right = point[0] + DETECTION_RADIUS_PIXELS;
                const bottom = point[1] + DETECTION_RADIUS_PIXELS;
                const left = point[0] - DETECTION_RADIUS_PIXELS;

                const features = await mapRef.current.queryRenderedFeaturesInRect(
                  [top, right, bottom, left],
                  undefined,
                  ['3d-buildings']
                );

                if (features && features.features && features.features.length > 0) {
                  const tallBuildings = features.features
                    .map(f => {
                      const h = f.properties?.height || f.properties?.render_height || 15;
                      return {
                        height: h,
                        name: f.properties?.name || "Vật cản/Tòa nhà"
                      };
                    })
                    .filter(b => b.height >= droneAlt);

                  if (tallBuildings.length > 0) {
                    const dangerousBuilding = tallBuildings.reduce((prev, current) =>
                      (prev.height > current.height) ? prev : current
                    );

                    setBuildingWarning({
                      isColliding: true,
                      height: dangerousBuilding.height,
                      name: dangerousBuilding.name
                    });
                  } else {
                    setBuildingWarning(null);
                  }
                } else {
                  setBuildingWarning(null);
                }
              } catch (error) {
                console.log("Lỗi kiểm tra va chạm:", error);
              }
            }
          }

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
        transports: ["polling", "websocket"]
        // transports: ["websocket"]
      });
      beSocketRef.current = beSocket;

      // 🪵 LOG 1: Bắt lỗi kết nối nếu sập
      beSocket.on("connect_error", (err) => {
        console.log("🔴 [LOG MO] LỖI KẾT NỐI BACKEND:", err.message);
      });

      beSocket.on("connect", () => {
        console.log("🟢 [LOG MO] KẾT NỐI BACKEND THÀNH CÔNG! ID:", beSocket.id);
        
        if (sessionId) {
          beSocket.emit("watch_session", { sessionId: sessionId });
          
          console.log("📤 [LOG MO] Gửi lệnh xin Radar (subscribe_nearby)...");
          beSocket.emit("subscribe_nearby", { 
            sessionId: sessionId, 
            lat: 10.762622, 
            lng: 106.660172 
          });
        }
      });

      // 🟢 THÊM PHẦN NÀY: Lắng nghe và hứng data máy bay ảo từ BE
      beSocket.on("nearby_drones", (data) => {
        const nearbyList = data?.drones || data;
        
        // 🪵 LOG 2: In ra số lượng máy bay nhận được
        console.log(`🚁 [LOG MO] Nhận data Radar: Có ${Array.isArray(nearbyList) ? nearbyList.length : 0} máy bay.`);
        
        // 🪵 LOG 3: In chi tiết 1 con ra để check cấu trúc biến
        if (Array.isArray(nearbyList) && nearbyList.length > 0) {
           console.log("🔍 [LOG MO] Chi tiết 1 máy bay ảo:", nearbyList[0]);
        }

        if (!Array.isArray(nearbyList)) return;

        setDrones(prev => {
          const nextState = { ...prev };
          nearbyList.forEach((d: any) => {
            if (d.droneId === simulatorDroneId) return; // Bỏ qua drone chính
            nextState[d.droneId] = {
              droneId: String(d.droneId),
              lat: Number(d.lat),
              lng: Number(d.lng),
              altitude: Number(d.altitude || 0),
              speed: Number(d.speed || 0),
              heading: Number(d.heading || 0),
              batteryLevel: d.batteryLevel || 100,
              isMock: true // Đánh dấu đây là máy bay ảo
            };
          });
          return nextState;
        });
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
  }, [sessionId, simulatorDroneId, mapReady]);

  // 👉 THÊM NGUYÊN ĐOẠN NÀY: Tính toán khoảng cách giữa mình và các máy bay khác
  useEffect(() => {
    
    if (!simulatorDroneId || !drones[simulatorDroneId] || !isActiveFlight) return;

    const myDrone = drones[simulatorDroneId];
    const myPoint = turf.point([myDrone.lng, myDrone.lat]);
    let closestDrone = null;
    let minDistance = Infinity;

    Object.values(drones).forEach(d => {
      // Bỏ qua chính mình
      if (d.droneId === simulatorDroneId) return;

      const otherPoint = turf.point([d.lng, d.lat]);
      const distanceKm = turf.distance(myPoint, otherPoint, { units: 'kilometers' });
      const distanceM = distanceKm * 1000; // Đổi ra mét

      // Nếu cách dưới 500 mét thì báo động
      if (distanceM < 500 && distanceM < minDistance) {
        minDistance = distanceM;
        closestDrone = d;
      }
    });
    
    if (closestDrone) {
      setDroneWarning({
        isColliding: true,
        droneId: closestDrone.droneId,
        distance: Math.round(minDistance)
      });
      setIsWarningExpanded(true); // Tự động bung bảng cảnh báo
    } else {
      setDroneWarning(null);
    }
  }, [drones, simulatorDroneId, isActiveFlight]);

  const handleEndFlight = async (altitude: number) => {
    if (!sessionId) return;
    Alert.alert("Xác nhận", "Kết thúc chuyến bay này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Kết thúc", style: "destructive", onPress: async () => {
          if (altitude != 0) {
            Alert.alert("Cảnh báo", "Drone còn đang bay chưa thể kết thúc chuyến bay", [
              {
                text: "Xác nhận", style: "destructive", onPress: () => {
                  return;
                }
              }
            ])
          } else {
            try {
              setIsEnding(true);
              await flightSessionApi.endSession(sessionId);

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
      }
    ]);
  };

  const currentDrone = drones[simulatorDroneId] || { speed: 0, altitude: 0, heading: 0, batteryLevel: 100, lng: 106.81809, lat: 10.82615 };

  const handleMapPress = (e: any) => {
    if (isActiveFlight) return;
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
      list.map(d => turf.point([Number(d.lng), Number(d.lat)], { 
        ...d, 
        isConnected: d.droneId === simulatorDroneId 
      }))
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

      {isActiveFlight && (
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      )}

      {/* 👉 THÊM CỤC NÀY: Giao diện báo động va chạm Drone */}
      {isActiveFlight && droneWarning && (
        isWarningExpanded ? (
          <View style={[
            styles.warningBanner,
            {
              backgroundColor: '#9C27B0', // Màu tím cho dễ phân biệt với tòa nhà
              // Đẩy nó xuống dưới xíu nếu đang có cảnh báo khác để không bị đè
              top: (warningZone || buildingWarning) ? 180 : 110, 
              borderWidth: 2,
              borderColor: '#FFF'
            }
          ]}>
            <Ionicons name="warning" size={28} color="#FFF" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.warningText, { color: '#FFF', fontWeight: 'bold' }]}>
                Có 1 Drone khác đang ở rất gần!
                Cách bạn {droneWarning.distance}m.
              </Text>
            </View>
            <TouchableOpacity onPress={() => setIsWarningExpanded(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.minimizedWarningBtn, { backgroundColor: '#9C27B0', top: (warningZone || buildingWarning) ? 180 : 110 }]}
            onPress={() => setIsWarningExpanded(true)}
          >
            <Ionicons name="warning" size={28} color="#FFF" />
          </TouchableOpacity>
        )
      )}

     {isActiveFlight && warningZone && (
        <View style={[
          styles.warningBanner,
          {
            paddingVertical: 8, // Làm banner mỏng lại
            backgroundColor: warningZone.status === 'inside'
              ? (warningZone.type === 'no_fly' ? 'rgba(255,59,48,0.95)' : 'rgba(255,204,0,0.95)')
              : 'rgba(255,149,0,0.95)'
          }
        ]}>
          <Ionicons
            name={warningZone.status === 'inside' ? "warning" : "alert-circle"}
            size={22} // Giảm size icon cho cân đối
            color={(warningZone.status === 'inside' && warningZone.type === 'no_fly') ? '#FFF' : '#333'}
          />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={[
              styles.warningText,
              { 
                fontSize: 14, 
                fontWeight: 'bold',
                color: (warningZone.status === 'inside' && warningZone.type === 'no_fly') ? '#FFF' : '#333' 
              }
            ]}>
              {warningZone.status === 'inside'
                ? `VI PHẠM: ${warningZone.name}`
                : `CÁCH VÙNG HẠN CHẾ (${warningZone.name}) < 500m`
              }
            </Text>
          </View>
        </View>
      )}

      {isActiveFlight && buildingWarning && (
        isWarningExpanded ? (
          <View style={[
            styles.warningBanner,
            {
              backgroundColor: '#FF0000',
              top: warningZone ? 180 : 110,
              borderWidth: 2,
              borderColor: '#FFF'
            }
          ]}>
            <Ionicons name="flash" size={28} color="#FFF" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.warningTitle, { color: '#FFF', fontSize: 18 }]}>
                NGUY CƠ VA CHẠM (50M)
              </Text>
              <Text style={[styles.warningText, { color: '#FFF', fontWeight: 'bold' }]}>
                Phát hiện {buildingWarning.name} (Cao {buildingWarning.height}m).
                Độ cao hiện tại ({currentDrone.altitude}m) không an toàn!
              </Text>
            </View>
            <TouchableOpacity onPress={() => setIsWarningExpanded(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.minimizedWarningBtn}
            onPress={() => setIsWarningExpanded(true)}
          >
            <Ionicons name="warning" size={28} color="#FFF" />
          </TouchableOpacity>
        )
      )}

      <Mapbox.MapView
        style={styles.map}
        ref={mapRef}
        styleURL={Mapbox.StyleURL.SatelliteStreet}
        onPress={handleMapPress}
        onDidFinishLoadingMap={() => setMapReady(true)}
      >
        <Mapbox.UserLocation
          visible={true}
          onUpdate={(loc) => {
            userLocationRef.current = {
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
            };
          }}
        />
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

        {/* 💡 LAYER HIỂN THỊ MÁY BAY: Dùng "isMock" để đổi màu */}
        {dronesGeoJSON && (
          <Mapbox.ShapeSource id="drones" shape={dronesGeoJSON as any}>
            <Mapbox.CircleLayer
              id="drone-circle"
              style={{
                circleRadius: ["case", ["==", ["get", "isMock"], true], 8, 10],
                circleColor: ["case", ["==", ["get", "isMock"], true], "#FFCC00", "#69F0AE"],
                circleStrokeColor: ["case", ["==", ["get", "isConnected"], true], "#00E5FF", "#ffffff"],
                circleStrokeWidth: 3,
                circlePitchAlignment: "map",
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {selectedPoint && !isActiveFlight && (
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

      {/* Nút định vị vị trí hiện tại */}
      <TouchableOpacity
        style={styles.locateBtn}
        onPress={() => {
          const loc = userLocationRef.current;
          if (loc && cameraRef.current) {
            cameraRef.current.setCamera({
              centerCoordinate: [loc.lng, loc.lat],
              zoomLevel: 17,
              animationDuration: 800,
            });
          } else {
            Alert.alert('Chưa xác định được vị trí', 'Hãy đảm bảo GPS đang bật.');
          }
        }}
      >
        <Ionicons name="locate" size={24} color="#0055FF" />
      </TouchableOpacity>

      {isActiveFlight && (
        isPanelExpanded ? (
          <View style={styles.bottomPanel}>
            <TouchableOpacity
              style={styles.minimizePanelIcon}
              onPress={() => setIsPanelExpanded(false)}
            >
              <Ionicons name="chevron-down" size={28} color="#CCC" />
            </TouchableOpacity>

            <View style={styles.infoFlex}>
              <Text style={styles.droneModelName}>{droneModel}</Text>
              <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>{battery}% 🔋</Text>
            </View>

            <View style={styles.subHeaderPanel}>
              <View>
                <Text style={styles.infoText}>
                  Drone ID: <Text style={{ fontWeight: 'bold', color: '#333' }}>{simulatorDroneId || connectedMongoId}</Text>
                </Text>
                <Text style={styles.infoText}>
                  Session ID: <Text style={{ fontWeight: 'bold', color: '#333' }}>{sessionId}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.telemetryRow}>
              <View style={styles.telemetryBox}><Text style={styles.telemetryValue}>{currentDrone.speed}</Text><Text style={styles.telemetryLabel}>Tốc độ</Text></View>
              <View style={styles.telemetryBox}><Text style={styles.telemetryValue}>{currentDrone.altitude}</Text><Text style={styles.telemetryLabel}>Độ cao</Text></View>
              <View style={styles.telemetryBox}><Text style={styles.telemetryValue}>{currentDrone.heading}°</Text><Text style={styles.telemetryLabel}>Hướng</Text></View>
            </View>
            <TouchableOpacity style={styles.endBtn} onPress={() => handleEndFlight(currentDrone.altitude)} disabled={isEnding}>
              {isEnding ? <ActivityIndicator color="white" /> : <Text style={styles.endBtnText}>KẾT THÚC BAY</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.minimizedPanel}
            onPress={() => setIsPanelExpanded(true)}
          >
            <Ionicons name="chevron-back" size={15} color="#0055FF" style={{ alignSelf: 'center', marginBottom: 5 }} />
            <Text style={styles.minimizedText}>tốc độ: {currentDrone.speed}</Text>
            <Text style={styles.minimizedText}>hướng: {currentDrone.heading}°</Text>
            <Text style={styles.minimizedText}>độ cao: {currentDrone.altitude}m</Text>
          </TouchableOpacity>
        )
      )}

      {selectedPoint && !isActiveFlight && (
        <View
          style={[
            styles.favPanel,
            { bottom: 20 + keyboardHeight }
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
            <Text style={styles.favText}>Cách vị trí hiện tại: <Text style={{ fontWeight: 'bold', color: '#0055FF' }}>{distanceToSelected.toFixed(2)} km</Text></Text>
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
  locateBtn: { position: 'absolute', bottom: 100, right: 20, zIndex: 10, backgroundColor: 'white', padding: 12, borderRadius: 30, elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
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
  },
  infoFlex: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  minimizePanelIcon: {
    alignItems: 'center',
    marginTop: -10,
    marginBottom: 5,
  },
  minimizedPanel: {
    position: 'absolute',
    right: 5,
    top: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 10,
    borderRadius: 12,
    zIndex: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  minimizedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 2,
  },
  minimizedWarningBtn: {
    position: 'absolute',
    top: 110,
    right: 20,
    backgroundColor: '#FF0000',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  }
});