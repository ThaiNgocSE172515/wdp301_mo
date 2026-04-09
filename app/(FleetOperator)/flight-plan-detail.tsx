import flightPlanApi from '@/api/flightPlanApi';
import zoneApi from '@/api/zoneApi';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from "@rnmapbox/maps";
import * as turf from '@turf/turf';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FlightPlanDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [detail, setDetail] = useState<any>(null);
    const [zones, setZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isSimulating, setIsSimulating] = useState(false);
    const [simulatedCoord, setSimulatedCoord] = useState<number[] | null>(null);
    const [droneBearing, setDroneBearing] = useState(0);
    const simTimerRef = useRef<any>(null);

    useEffect(() => {
        return () => {
            if (simTimerRef.current) clearInterval(simTimerRef.current);
        };
    }, []);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [res, zRes] = await Promise.all([
                    flightPlanApi.getById(id),
                    zoneApi.getAll({ limit: 100 })
                ]);
                setDetail(res.data || res);

                const zoneList = zRes.data?.data || zRes.data || [];
                if (Array.isArray(zoneList)) {
                    setZones(zoneList);
                }
            } catch (error) {
                Alert.alert("Lỗi", "Không thể lấy chi tiết Kế hoạch bay");
                router.back();
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    const formatDate = (dateString: string) => {
        if (!dateString) return;
        return new Date(dateString).toLocaleString('vi-VN');
    };

    const handleSubmit = async () => {
        Alert.alert("Xác nhận", "Bạn muốn submit kế hoạch bay này để được phê duyệt?", [
            { text: "Không", style: "cancel" },
            {
                text: "Đồng ý", onPress: async () => {
                    try {
                        setLoading(true);
                        await flightPlanApi.submit(id);
                        Alert.alert("Thành công", "Đã submit flight plan. Trạng thái đã cập nhật thành APPROVED.");
                        const res = await flightPlanApi.getById(id);
                        setDetail(res.data || res);
                    } catch (error: any) {
                        Alert.alert("Lỗi", error.response?.data?.message || "Không thể submit flight plan");
                    } finally {
                        setLoading(false);
                    }
                }
            }
        ]);
    };

    const handleCancel = async () => {
        Alert.alert("Xác nhận", "Bạn muốn hủy kế hoạch bay này?", [
            { text: "Không", style: "cancel" },
            {
                text: "Đồng ý", style: "destructive", onPress: async () => {
                    try {
                        setLoading(true);
                        await flightPlanApi.cancel(id);
                        Alert.alert("Thành công", "Đã hủy flight plan");
                        const res = await flightPlanApi.getById(id);
                        setDetail(res.data || res);
                    } catch (error: any) {
                        Alert.alert("Lỗi", error.response?.data?.message || "Không thể hủy flight plan");
                    } finally {
                        setLoading(false);
                    }
                }
            }
        ]);
    };

    const lineGeoJSON = useMemo(() => {
        if (!detail?.waypoints || detail.waypoints.length < 2) return null;
        return turf.lineString(detail.waypoints.map((w: any) => [w.longitude, w.latitude]));
    }, [detail?.waypoints]);

    const zonesGeoJSON = useMemo(() => {
        if (zones.length === 0) return null;
        return turf.featureCollection(
            zones.map(z => turf.feature(z.geometry, { type: z.type, name: z.name }))
        );
    }, [zones]);

    // Calculate map bounds
    const defaultCameraSettings = useMemo(() => {
        if (!detail?.waypoints || detail.waypoints.length === 0) {
            return { centerCoordinate: [106.6297, 10.8231], zoomLevel: 14 };
        }

        if (detail.waypoints.length === 1) {
            return { centerCoordinate: [detail.waypoints[0].longitude, detail.waypoints[0].latitude], zoomLevel: 16 };
        }

        // Use turf to find bbox of line
        const line = turf.lineString(detail.waypoints.map((w: any) => [w.longitude, w.latitude]));
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
    }, [detail?.waypoints]);

    const startSimulation = () => {
        if (!detail?.waypoints || detail.waypoints.length < 2) return;
        const line = turf.lineString(detail.waypoints.map((w: any) => [w.longitude, w.latitude]));
        const totalDistance = turf.length(line, { units: 'kilometers' });

        let currentDist = 0;
        const totalFrames = 150; // Quá trình bay khoảng 7.5 giây (150 * 50ms)
        const speed = totalDistance / totalFrames;

        setIsSimulating(true);
        if (simTimerRef.current) clearInterval(simTimerRef.current);

        simTimerRef.current = setInterval(() => {
            currentDist += speed;
            if (currentDist >= totalDistance) {
                clearInterval(simTimerRef.current);
                setIsSimulating(false);
                setSimulatedCoord(null);
                setDroneBearing(0);
            } else {
                const pt = turf.along(line, currentDist, { units: 'kilometers' });
                const nextPt = turf.along(line, currentDist + (speed / 2), { units: 'kilometers' });
                setSimulatedCoord(pt.geometry.coordinates);
                try {
                    const bearing = turf.bearing(pt, nextPt);
                    setDroneBearing(bearing);
                } catch (e) { }
            }
        }, 50);
    };

    console.log(detail)

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#E65100" />
                <Text style={{ marginTop: 10, color: '#888' }}>Đang tải...</Text>
            </SafeAreaView>
        );
    }

    if (!detail) return null;

    const droneStats = detail.drone || {};

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1F222A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết Kế hoạch bay</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.mainCard}>
                    <Text style={styles.mainTitle}>{detail._id.slice(-6).toUpperCase() || 'Không có mô tả'}</Text>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{detail.status}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="book-outline" size={20} color="#555" />
                        <Text style={styles.infoLabel}>Ghi chú:</Text>
                        <Text style={styles.infoValue}>{detail.notes || 'Chưa rõ'}</Text>
                    </View>

                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thông tin Drone</Text>
                    <View style={styles.infoBox}>
                        <View style={styles.infoRow}>
                            <Ionicons name="hardware-chip-outline" size={20} color="#555" />
                            <Text style={styles.infoLabel}>Model:</Text>
                            <Text style={styles.infoValue}>{droneStats.model || 'Chưa rõ'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="barcode-outline" size={20} color="#555" />
                            <Text style={styles.infoLabel}>Mã Drone:</Text>
                            <Text style={styles.infoValue}>{droneStats.droneId || 'Chưa rõ'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="battery-half-outline" size={20} color="#555" />
                            <Text style={styles.infoLabel}> Pin dự kiến:</Text>
                            <Text style={styles.infoValue}>{detail.batteryPercentageUsed + "%" || 'Chưa rõ'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="timer-outline" size={20} color="#555" />
                            <Text style={styles.infoLabel}>Thời gian bay dự kiến:</Text>
                            <Text style={styles.infoValue}>{detail.estimatedFlightTime + " phút" || 'Chưa rõ'}</Text>
                        </View>

                    </View>
                </View>

                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Bản đồ Lộ trình</Text>
                        {/* <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: (isSimulating || !lineGeoJSON) ? '#ccc' : '#D32F2F', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                            onPress={startSimulation}
                            disabled={isSimulating || !lineGeoJSON}
                        >
                            <Ionicons name={isSimulating ? "airplane" : "play"} size={16} color="#fff" style={{ marginRight: 4 }} />
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{isSimulating ? "Đang giả lập..." : "Giả lập bay"}</Text>
                        </TouchableOpacity> */}
                    </View>
                    <View style={styles.mapContainer}>
                        <Mapbox.MapView
                            style={{ flex: 1 }}
                            styleURL={Mapbox.StyleURL.SatelliteStreet}
                            logoEnabled={false}
                            attributionEnabled={false}
                            scrollEnabled={true}
                            zoomEnabled={true}
                        >
                            <Mapbox.Camera
                                defaultSettings={defaultCameraSettings}
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
                                            lineDasharray: [2, 2]
                                        }}
                                    />
                                </Mapbox.ShapeSource>
                            )}

                            {/* VẼ ĐIỂM */}
                            {detail.waypoints?.map((wp: any, index: number) => (
                                <Mapbox.PointAnnotation
                                    key={`wp-detail-${index}`}
                                    id={`wp-detail-${index}`}
                                    coordinate={[wp.longitude, wp.latitude]}
                                >
                                    <View style={styles.markerContainer}>
                                        <Text style={styles.markerText}>{wp.sequenceNumber || index + 1}</Text>
                                    </View>
                                </Mapbox.PointAnnotation>
                            ))}

                            {/* MÔ PHỎNG DRONE BAY */}
                            {simulatedCoord && (
                                <Mapbox.PointAnnotation
                                    key="drone-simulator"
                                    id="drone-simulator"
                                    coordinate={simulatedCoord}
                                >
                                    <View style={{ transform: [{ rotate: `${droneBearing}deg` }], width: 32, height: 32, borderRadius: 16, backgroundColor: '#0055FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', shadowColor: '#0055FF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 5 }}>
                                        <Ionicons name="airplane" size={18} color="#FFF" style={{ transform: [{ rotate: '-45deg' }, { translateX: 2 }] }} />
                                    </View>
                                </Mapbox.PointAnnotation>
                            )}
                        </Mapbox.MapView>
                    </View>
                </View>

                {/* Danh sách các điểm bay */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Chi Tiết Các Điểm Bay</Text>
                    {!detail.waypoints || detail.waypoints.length === 0 ? (
                        <Text style={{ textAlign: 'center', color: '#888', marginTop: 10 }}>Chưa có điểm nào được định nghĩa.</Text>
                    ) : (
                        <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#DDD', padding: 15 }}>
                            {detail.waypoints.map((wp: any, index: number) => (
                                <View key={`list-wp-${index}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: index === detail.waypoints.length - 1 ? 0 : 1, borderBottomColor: '#EEE' }}>
                                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E65100', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{wp.sequenceNumber || index + 1}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1F222A', marginBottom: 2 }}>{wp.action}</Text>
                                        <Text style={{ color: '#555', fontSize: 13, marginBottom: 2 }}>
                                            Vĩ độ: {wp.latitude.toFixed(5)}   Kinh độ: {wp.longitude.toFixed(5)}
                                        </Text>
                                        <Text style={{ color: '#888', fontSize: 13 }}>
                                            Độ cao (mặc định): {wp.altitude}m  •  Tốc độ: {wp.speed}m/s
                                        </Text>
                                        {wp.estimatedTime && (
                                            <Text style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
                                                Tgian dự kiến: {new Date(wp.estimatedTime).toLocaleTimeString('vi-VN')}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Bottom Actions for DRAFT / REJECTED */}
            {(detail.status === 'DRAFT' || detail.status === 'REJECTED') && (
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>Duyệt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                        <Ionicons name="close-circle-outline" size={20} color="#D32F2F" />
                        <Text style={[styles.actionBtnText, { color: '#D32F2F' }]}>Hủy Bỏ</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F9F9', paddingTop: 20 },
    centerContainer: { flex: 1, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
    backBtn: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A' },

    content: { padding: 20, paddingBottom: 40 },
    mainCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    mainTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F222A', marginBottom: 10 },
    statusBadge: { alignSelf: 'flex-start', backgroundColor: '#E0F2F1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
    statusText: { color: '#00897B', fontWeight: 'bold', fontSize: 12 },
    descText: { fontSize: 14, color: '#666', lineHeight: 22 },

    section: { marginBottom: 25 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F222A', marginBottom: 12 },
    infoBox: { backgroundColor: '#fff', borderRadius: 16, padding: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    infoLabel: { fontSize: 14, color: '#666', marginLeft: 10, width: 80 },
    infoValue: { fontSize: 15, fontWeight: 'bold', color: '#1F222A', flex: 1 },

    mapContainer: {
        height: SCREEN_HEIGHT * 0.35,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#DDD'
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

    waypointCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
    waypointIndexBox: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E65100', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    waypointIndexText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    waypointAction: { fontSize: 16, fontWeight: 'bold', color: '#1F222A', marginBottom: 2 },
    waypointCoords: { fontSize: 13, color: '#666' },
    waypointParam: { fontSize: 12, color: '#E65100', fontWeight: '600', backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', gap: 10 },
    submitBtn: { flex: 1, backgroundColor: '#0055FF', flexDirection: 'row', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
    cancelBtn: { flex: 1, backgroundColor: '#FFF0F0', flexDirection: 'row', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2', gap: 8 },
    actionBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' }
});
