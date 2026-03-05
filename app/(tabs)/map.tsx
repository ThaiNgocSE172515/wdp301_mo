import Mapbox from "@rnmapbox/maps";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import io from "socket.io-client";
import zoneApi from "../../api/zoneApi"; // <-- Đảm bảo import đúng đường dẫn api của bạn
// import { styles } from "./_layout";

// --- CẤU HÌNH SOCKET ---
const SOCKET_URL = "http://192.168.2.106:3000";
// const SOCKET_URL = "http://192.168.137.1:3000";

const socket = io(SOCKET_URL, { transports: ["websocket"] });

// --- TYPES & DATA ---
// Cập nhật type từ API: 'no_fly' thay vì 'forbidden'
type ZoneType = "no_fly" | "restricted"; 
type Coordinate = { latitude: number; longitude: number };
type Zone = { id: string; coordinates: Coordinate[]; type: ZoneType };

type DroneState = {
  droneId: string;
  lat: number;
  lng: number;
  altitude: number;
};

// Hàm kiểm tra điểm trong đa giác
const isPointInPolygon = (point: Coordinate, vs: Coordinate[]) => {
  const x = point.latitude,
    y = point.longitude;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].latitude,
      yi = vs[i].longitude;
    const xj = vs[j].latitude,
      yj = vs[j].longitude;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

export default function MapViewerScreen() {
  const cameraRef = useRef<Mapbox.Camera>(null);

  // Thay đổi: Bắt đầu với mảng rỗng thay vì INITIAL_ZONES
  const [zones, setZones] = useState<Zone[]>([]);
  const [drone, setDrone] = useState<DroneState | null>(null);

  // --- FETCH API ZONES ---
  useEffect(() => {
    const fetchZones = async () => {
      try {
        // Lấy danh sách zones đang active, giới hạn 100 vùng
        const response = await zoneApi.getAll({ limit: 100, status: 'active' });
        
        // Chuyển đổi dữ liệu từ API thành định dạng mà Component cần
        const formattedZones: Zone[] = response.data.data.map((item: any) => ({
          id: item._id,
          type: item.type as ZoneType,
          // API trả về mảng [longitude, latitude] ở trong item.geometry.coordinates[0]
          coordinates: item.geometry.coordinates[0].map((coord: number[]) => ({
            longitude: coord[0],
            latitude: coord[1],
          })),
        }));

        setZones(formattedZones);
      } catch (error) {
        console.error("Lỗi khi tải danh sách zones:", error);
      }
    };

    fetchZones();
  }, []);

  useEffect(() => {
    // Chỉ lắng nghe vị trí Drone
    const handleDronePos = (data: any) => {
      if (!data?.droneId) return;
      const newDrone = {
        droneId: String(data.droneId),
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        altitude: parseFloat(data.altitude ?? 0),
      };

      setDrone(newDrone);

      cameraRef.current?.setCamera({
        centerCoordinate: [newDrone.lng, newDrone.lat],
        animationDuration: 800,
      });
    };

    socket.on("drone:position", handleDronePos);

    return () => {
      socket.off("drone:position", handleDronePos);
    };
  }, []);

  const currentStatus = useMemo(() => {
    if (!drone || zones.length === 0) return "SAFE";
    const p = { latitude: drone.lat, longitude: drone.lng };
    const hitZone = zones.find((z) => isPointInPolygon(p, z.coordinates));
    if (!hitZone) return "SAFE";
    
    return hitZone.type === "no_fly" ? "FORBIDDEN" : "RESTRICTED";
  }, [drone, zones]);

  const zonesGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection",
      features: zones.map((z) => ({
        type: "Feature",
        properties: { id: z.id, type: z.type },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              ...z.coordinates.map((c) => [c.longitude, c.latitude]),
              [z.coordinates[0].longitude, z.coordinates[0].latitude],
            ],
          ],
        },
      })),
    }),
    [zones],
  );

  const droneGeoJSON = useMemo(() => {
    if (!drone) return null;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { ...drone, status: currentStatus },
          geometry: { type: "Point", coordinates: [drone.lng, drone.lat] },
        },
      ],
    };
  }, [drone, currentStatus]);

  const getStatusColor = () => {
    if (currentStatus === "FORBIDDEN") return "#FF5252";
    if (currentStatus === "RESTRICTED") return "#FFD740";
    return "#69F0AE";
  };

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor="transparent"
      />
      <Mapbox.MapView
        style={styles.map}
        styleURL={Mapbox.StyleURL.SatelliteStreet}
        logoEnabled={false}
        compassEnabled
        compassViewPosition={3}
        surfaceView
        pitchEnabled={true}
        rotateEnabled={true}
        projection="globe"
        
      >

        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [106.81809, 10.82615],
            zoomLevel: 15.5,
            pitch: 60,
            heading: -166,
          }}
          animationMode="flyTo"
        />


        <Mapbox.RasterDemSource
          id="mapbox-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxZoomLevel={14}
        />

        <Mapbox.Terrain sourceID="mapbox-dem" style={{ exaggeration: 1.5 }} />

        <Mapbox.SkyLayer
          id="sky"
          style={{
            skyType: "atmosphere",
            skyAtmosphereSun: [0.0, 90.0],
            skyAtmosphereSunIntensity: 15.0,
          }}
        />

        <Mapbox.FillExtrusionLayer
          id="3d-buildings"
          sourceID="composite"
          sourceLayerID="building"
          minZoomLevel={14}
          maxZoomLevel={22}
          filter={["==", "extrude", "true"]}
          style={{
            fillExtrusionColor: "#a29e9e",
            fillExtrusionHeight: ["get", "height"],
            fillExtrusionBase: ["get", "min_height"],
            fillExtrusionOpacity: 1,
            fillExtrusionVerticalGradient: true,
            fillExtrusionAmbientOcclusionIntensity: 0.3,
          }}
        />

        {/* 5. ZONES LAYER */}
        {/* Render Mapbox Layer chỉ khi zonesGeoJSON có dữ liệu */}
        {zones.length > 0 && (
          <Mapbox.ShapeSource id="zones" shape={zonesGeoJSON as any}>
            <Mapbox.FillLayer
              id="zones-fill"
              style={{
                fillAntialias: true,
                fillColor: [
                  "match",
                  ["get", "type"],
                  "no_fly", // Cập nhật từ 'forbidden' sang 'no_fly'
                  "rgba(220, 20, 60, 0.8)", // Đỏ đậm
                  "restricted",
                  "rgba(255, 191, 0, 0.8)", // Vàng đậm
                  "rgba(128, 128, 128, 0.5)", // <--- DEFAULT VALUE
                ],
                fillOutlineColor: [
                  "match",
                  ["get", "type"],
                  "no_fly",
                  "#b71c1c",
                  "restricted",
                  "#e65100",
                  "gray",
                ],
              }}
            />
            <Mapbox.LineLayer
              id="zones-line-thick"
              style={{
                lineColor: [
                  "match",
                  ["get", "type"],
                  "no_fly",
                  "#b71c1c",
                  "restricted",
                  "#e65100",
                  "gray",
                ],
                lineWidth: 2,
                lineBlur: 0.5,
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* 6. DRONE LAYER */}
        {droneGeoJSON && (
          <Mapbox.ShapeSource id="drone" shape={droneGeoJSON as any}>
            <Mapbox.CircleLayer
              id="drone-circle"
              style={{
                circleRadius: 10,
                circleColor: getStatusColor(),
                circleStrokeColor: "#ffffff",
                circleStrokeWidth: 3,
                circlePitchAlignment: "map",
              }}
            />
            <Mapbox.CircleLayer
              id="drone-center-dot"
              style={{
                circleRadius: 3,
                circleColor: "white",
                circlePitchAlignment: "map",
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      {currentStatus !== "SAFE" && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor:
                currentStatus === "FORBIDDEN" ? "#D32F2F" : "#FBC02D",
            },
          ]}
        >
          <Text
            style={[
              styles.bannerText,
              { color: currentStatus === "FORBIDDEN" ? "white" : "black" },
            ]}
          >
            {currentStatus === "FORBIDDEN"
              ? "⛔ VÙNG CẤM BAY"
              : "⚠️ VÙNG HẠN CHẾ"}
          </Text>
        </View>
      )}
    </View>
  );
}

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" }, // Nền đen để load map đỡ chói
  map: { flex: 1 },
  hudContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hud: {
    backgroundColor: "rgba(20, 20, 30, 0.85)",
    borderRadius: 16,
    padding: 12,
    width: "90%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  hudTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  label: { color: "#ccc", fontSize: 12 },
  val: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  banner: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 10,
    zIndex: 999,
  },
  bannerText: { fontWeight: "900", fontSize: 14 },
});