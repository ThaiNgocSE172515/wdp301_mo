import { useDroneSession } from '@/hooks/Drone/useDroneSession';
import { useDroneTelemetry } from '@/hooks/Drone/useDroneTelemetry';
import { useCreateFavourite } from '@/hooks/Favourites/useCreateFavourite';
import { useGetFavourites } from '@/hooks/Favourites/useGetFavourites';
import { useZones } from '@/hooks/Zone/useZones';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from "@rnmapbox/maps";
import * as turf from '@turf/turf';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function MapViewerScreen() {
  const router = useRouter();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);

  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string;
  const connectedMongoId = (params.connectedDroneId || params.droneId) as string;
  const isActiveFlight = !!sessionId && sessionId !== '';

  const [mapReady, setMapReady] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // States interact UI
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [isWarningExpanded, setIsWarningExpanded] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number, lng: number } | null>(null);
  const [distanceToSelected, setDistanceToSelected] = useState<number | null>(null);
  const [favouriteName, setFavouriteName] = useState<string>('');

  const favLat = params.favLat as string;
  const favLng = params.favLng as string;

  // --- GỌI HOOKS LOGIC ---
  const { simulatorDroneId, droneModel, isEnding, handleEndFlight } = useDroneSession(connectedMongoId, sessionId);
  const { zones, zonesRef } = useZones(connectedMongoId, sessionId);
  const { userId, favouritesList, setFavouritesList } = useGetFavourites();
  const { isSavingFav, createFavourite } = useCreateFavourite();
  
  const { drones, battery, warningZone, buildingWarning, droneWarning } = useDroneTelemetry(
    sessionId, simulatorDroneId, isActiveFlight, mapReady, zonesRef, mapRef, cameraRef
  );

  // --- EFFECTS GIỮ NGUYÊN SI ---
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    if (favLat && favLng && mapReady && cameraRef.current) {
      cameraRef.current.setCamera({ centerCoordinate: [parseFloat(favLng), parseFloat(favLat)], zoomLevel: 18, animationDuration: 800 });
    }
  }, [favLat, favLng, mapReady]);

  useEffect(() => {
    if (buildingWarning || droneWarning) setIsWarningExpanded(true);
  }, [buildingWarning?.name, droneWarning?.droneId]);

  // --- LOGIC HIỂN THỊ (TRẢ LẠI 100% NHƯ CŨ) ---
  const currentDrone = drones[simulatorDroneId] || { speed: 0, altitude: 0, heading: 0, batteryLevel: 100, lng: 106.81809, lat: 10.82615 };

  const remainingFlightTime = useMemo(() => {
    const totalSeconds = battery * 30;
    return { minutes: Math.floor(totalSeconds / 60), seconds: totalSeconds % 60 };
  }, [battery]);

  const handleMapPress = (e: any) => {
    if (isActiveFlight) return;
    if (!e || !e.geometry || !e.geometry.coordinates) return;
    const [lng, lat] = e.geometry.coordinates;
    setSelectedPoint({ lat, lng });
    const distance = turf.distance(turf.point([currentDrone.lng, currentDrone.lat]), turf.point([lng, lat]), { units: 'kilometers' });
    setDistanceToSelected(distance);
  };

  const handleSaveFavourite = async () => {
    const isSuccess = await createFavourite(userId, selectedPoint, favouriteName);
    if (isSuccess && selectedPoint) {
      setFavouritesList(prev => [...prev, { _id: Math.random().toString(), name: favouriteName, location: { lat: selectedPoint.lat, lng: selectedPoint.lng } }]);
      setSelectedPoint(null); setFavouriteName(''); setDistanceToSelected(null);
    }
  };

  const dronesGeoJSON = useMemo(() => {
    const list = Object.values(drones);
    if (list.length === 0) return null;
    return turf.featureCollection(list.map(d => turf.point([Number(d.lng), Number(d.lat)], { ...d, isConnected: d.droneId === simulatorDroneId })));
  }, [drones, simulatorDroneId]);

  const zonesGeoJSON = useMemo(() => {
    if (zones.length === 0) return null;
    return turf.featureCollection(zones.map(z => turf.feature(z.geometry, { type: z.type, name: z.name })));
  }, [zones]);

  return (
    <View style={styles.container}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

      {isActiveFlight && (
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      )}

      {/* RENDER BANNERS CẢNH BÁO (GIỮ ĐÚNG UI GỐC) */}
      {isActiveFlight && droneWarning && (
        isWarningExpanded ? (
          <View style={[styles.warningBanner, { backgroundColor: '#9C27B0', top: (warningZone || buildingWarning) ? 180 : 110, borderWidth: 2, borderColor: '#FFF' }]}>
            <Ionicons name="warning" size={28} color="#FFF" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.warningText, { color: '#FFF', fontWeight: 'bold' }]}>Có 1 Drone khác đang ở rất gần! Cách bạn {droneWarning.distance}m.</Text>
            </View>
            <TouchableOpacity onPress={() => setIsWarningExpanded(false)} style={{ padding: 4 }}><Ionicons name="close" size={26} color="#FFF" /></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.minimizedWarningBtn, { backgroundColor: '#9C27B0', top: (warningZone || buildingWarning) ? 180 : 110 }]} onPress={() => setIsWarningExpanded(true)}>
            <Ionicons name="warning" size={28} color="#FFF" />
          </TouchableOpacity>
        )
      )}

      {isActiveFlight && warningZone && (
        <View style={[styles.warningBanner, { paddingVertical: 8, backgroundColor: warningZone.status === 'inside' ? (warningZone.type === 'no_fly' ? 'rgba(255,59,48,0.95)' : 'rgba(255,204,0,0.95)') : 'rgba(255,149,0,0.95)' }]}>
          <Ionicons name={warningZone.status === 'inside' ? "warning" : "alert-circle"} size={22} color={(warningZone.status === 'inside' && warningZone.type === 'no_fly') ? '#FFF' : '#333'} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={[styles.warningText, { fontSize: 14, fontWeight: 'bold', color: (warningZone.status === 'inside' && warningZone.type === 'no_fly') ? '#FFF' : '#333' }]}>
              {warningZone.status === 'inside' ? `VI PHẠM: ${warningZone.name}` : `CÁCH VÙNG HẠN CHẾ/VÙNG CẤM (${warningZone.name}) < 500m`}
            </Text>
          </View>
        </View>
      )}

      {isActiveFlight && buildingWarning && (
        isWarningExpanded ? (
          <View style={[styles.warningBanner, { backgroundColor: '#FF0000', top: warningZone ? 180 : 110, borderWidth: 2, borderColor: '#FFF' }]}>
            <Ionicons name="flash" size={28} color="#FFF" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.warningText, { color: '#FFF', fontWeight: 'bold' }]}>Phát hiện {buildingWarning.name} (Cao {buildingWarning.height}m). Độ cao hiện tại ({currentDrone.altitude}m) không an toàn!</Text>
            </View>
            <TouchableOpacity onPress={() => setIsWarningExpanded(false)} style={{ padding: 4 }}><Ionicons name="close" size={26} color="#FFF" /></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.minimizedWarningBtn} onPress={() => setIsWarningExpanded(true)}><Ionicons name="warning" size={28} color="#FFF" /></TouchableOpacity>
        )
      )}

      <Mapbox.MapView style={styles.map} ref={mapRef} styleURL={Mapbox.StyleURL.SatelliteStreet} onPress={handleMapPress} onDidFinishLoadingMap={() => setMapReady(true)}>
        <Mapbox.UserLocation visible={true} onUpdate={(loc) => userLocationRef.current = { lat: loc.coords.latitude, lng: loc.coords.longitude }} />
        <Mapbox.Camera ref={cameraRef} defaultSettings={{ centerCoordinate: [106.81809, 10.82615], zoomLevel: 16, pitch: 65 }} heading={currentDrone.heading || 0} />

        <Mapbox.VectorSource id="composite" url="mapbox://mapbox.mapbox-streets-v8">
          <Mapbox.FillExtrusionLayer maxZoomLevel={20} id="3d-buildings" sourceLayerID="building" minZoomLevel={15} style={{ fillExtrusionColor: '#aaa', fillExtrusionHeight: ['get', 'height'], fillExtrusionBase: ['get', 'min_height'], fillExtrusionOpacity: 1 }} />
        </Mapbox.VectorSource>

        {zonesGeoJSON && (
          <Mapbox.ShapeSource id="zones-source" shape={zonesGeoJSON as any}>
            <Mapbox.FillLayer id="zones-fill" style={{ fillColor: ["match", ["get", "type"], "no_fly", "rgba(255, 59, 48, 0.4)", "restricted", "rgba(255, 204, 0, 0.4)", "rgba(0,0,0,0.1)"], fillOutlineColor: ["match", ["get", "type"], "no_fly", "#FF3B30", "restricted", "#FFCC00", "#000"] }} />
          </Mapbox.ShapeSource>
        )}

        {dronesGeoJSON && (
          <Mapbox.ShapeSource id="drones" shape={dronesGeoJSON as any}>
            <Mapbox.CircleLayer id="drone-circle" style={{ circleRadius: ["case", ["==", ["get", "isMock"], true], 8, 10], circleColor: ["case", ["==", ["get", "isMock"], true], "#FFCC00", "#69F0AE"], circleStrokeColor: ["case", ["==", ["get", "isConnected"], true], "#00E5FF", "#ffffff"], circleStrokeWidth: 3, circlePitchAlignment: "map" }} />
          </Mapbox.ShapeSource>
        )}

        {selectedPoint && !isActiveFlight && (
          <Mapbox.ShapeSource id="selected-point-source" shape={turf.point([selectedPoint.lng, selectedPoint.lat]) as any}>
            <Mapbox.CircleLayer id="selected-point-circle" style={{ circleRadius: 8, circleColor: '#FF3B30', circleStrokeColor: '#FFFFFF', circleStrokeWidth: 2 }} />
          </Mapbox.ShapeSource>
        )}

        {favouritesList.map((fav, index) => (
          fav.location?.lat && (
            <Mapbox.PointAnnotation key={`fav-${fav._id || index}`} id={`fav-anno-${fav._id || index}`} coordinate={[fav.location.lng, fav.location.lat]}>
              <View style={styles.heartMarker}><Ionicons name="heart" size={24} color="#FF3B30" /></View>
            </Mapbox.PointAnnotation>
          )
        ))}
      </Mapbox.MapView>

      <TouchableOpacity style={styles.locateBtn} onPress={() => {
        const loc = userLocationRef.current;
        if (loc && cameraRef.current) cameraRef.current.setCamera({ centerCoordinate: [loc.lng, loc.lat], zoomLevel: 17, animationDuration: 800 });
      }}>
        <Ionicons name="locate" size={24} color="#0055FF" />
      </TouchableOpacity>

      {/* RENDER BOTTOM PANEL (TRẢ LẠI 100% CÁC THÔNG SỐ ĐÃ MẤT) */}
      {isActiveFlight && (
        isPanelExpanded ? (
          <View style={styles.bottomPanel}>
            <TouchableOpacity style={styles.minimizePanelIcon} onPress={() => setIsPanelExpanded(false)}><Ionicons name="chevron-down" size={28} color="#CCC" /></TouchableOpacity>
            
            <View style={styles.infoFlex}>
              <Text style={styles.droneModelName}>{droneModel}</Text>
              <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>{battery}% 🔋</Text>
              <Text style={{ color: '#888', fontSize: 12 }}>
                ⏱ {remainingFlightTime.minutes}m {remainingFlightTime.seconds}s
              </Text>
            </View>

            <View style={styles.subHeaderPanel}>
              <View>
                <Text style={styles.infoText}>Drone ID: <Text style={{ fontWeight: 'bold', color: '#333' }}>{simulatorDroneId || connectedMongoId}</Text></Text>
                <Text style={styles.infoText}>Session ID: <Text style={{ fontWeight: 'bold', color: '#333' }}>{sessionId}</Text></Text>
              </View>
            </View>

            <View style={styles.telemetryRow}>
              <View style={styles.telemetryBox}><Text style={styles.telemetryValue}>{currentDrone.speed}</Text><Text style={styles.telemetryLabel}>Tốc độ</Text></View>
              <View style={styles.telemetryBox}><Text style={styles.telemetryValue}>{currentDrone.altitude}</Text><Text style={styles.telemetryLabel}>Độ cao</Text></View>
              {/* PHỤC HỒI HƯỚNG BAY (HEADING) */}
              <View style={styles.telemetryBox}><Text style={styles.telemetryValue}>{currentDrone.heading}°</Text><Text style={styles.telemetryLabel}>Hướng</Text></View>
            </View>

            <TouchableOpacity style={styles.endBtn} onPress={() => handleEndFlight(currentDrone.altitude)} disabled={isEnding}>
              {isEnding ? <ActivityIndicator color="white" /> : <Text style={styles.endBtnText}>KẾT THÚC BAY</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.minimizedPanel} onPress={() => setIsPanelExpanded(true)}>
            <Ionicons name="chevron-back" size={15} color="#0055FF" style={{ alignSelf: 'center', marginBottom: 5 }} />
            <Text style={styles.minimizedText}>tốc độ: {currentDrone.speed}</Text>
            <Text style={styles.minimizedText}>hướng: {currentDrone.heading}°</Text>
            <Text style={styles.minimizedText}>độ cao: {currentDrone.altitude}m</Text>
          </TouchableOpacity>
        )
      )}

      {selectedPoint && !isActiveFlight && (
        <View style={[styles.favPanel, { bottom: 20 + keyboardHeight }]}>
          <View style={styles.favHeader}><Text style={styles.favTitle}>Điểm đã chọn</Text><TouchableOpacity onPress={() => setSelectedPoint(null)}><Ionicons name="close-circle" size={24} color="#888" /></TouchableOpacity></View>
          <Text style={styles.favText}>Tọa độ: {selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}</Text>
          {distanceToSelected !== null && <Text style={styles.favText}>Cách vị trí hiện tại: <Text style={{ fontWeight: 'bold', color: '#0055FF' }}>{distanceToSelected.toFixed(2)} km</Text></Text>}
          <TextInput style={styles.favInput} placeholder="Nhập tên địa điểm..." value={favouriteName} onChangeText={setFavouriteName} />
          <TouchableOpacity style={styles.favBtn} onPress={handleSaveFavourite} disabled={isSavingFav}>
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
  locateBtn: { position: 'absolute', bottom: 100, right: 20, zIndex: 10, backgroundColor: 'white', padding: 12, borderRadius: 30, elevation: 6 },
  warningBanner: { position: 'absolute', top: 110, left: 20, right: 20, zIndex: 10, flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, elevation: 8 },
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
  favPanel: { position: 'absolute', left: 20, right: 20, backgroundColor: 'white', borderRadius: 16, padding: 16, elevation: 12 },
  favHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  favTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  favText: { fontSize: 14, color: '#555', marginBottom: 4 },
  favInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, marginBottom: 12, fontSize: 14, backgroundColor: '#dcdcdc' },
  favBtn: { backgroundColor: '#0055FF', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  favBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  heartMarker: { backgroundColor: 'white', padding: 4, borderRadius: 20, elevation: 4, alignItems: 'center', justifyContent: 'center' },
  infoFlex: { display: "flex", flexDirection: "row", justifyContent: "space-between" },
  minimizePanelIcon: { alignItems: 'center', marginTop: -10, marginBottom: 5 },
  minimizedPanel: { position: 'absolute', right: 5, top: '45%', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: 10, borderRadius: 12, zIndex: 10, elevation: 6 },
  minimizedText: { fontSize: 12, fontWeight: 'bold', color: '#333', marginVertical: 2 },
  minimizedWarningBtn: { position: 'absolute', top: 110, right: 20, backgroundColor: '#FF0000', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', zIndex: 10, elevation: 8, borderWidth: 2, borderColor: '#FFF' }
});