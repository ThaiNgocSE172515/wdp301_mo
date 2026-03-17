import flightPlanApi from '@/api/flightPlanApi';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Mapbox from "@rnmapbox/maps";
import * as turf from '@turf/turf';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FlightPlanDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [detail, setDetail] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const res = await flightPlanApi.getById(id);
                setDetail(res.data || res);
            } catch (error) {
                Alert.alert("Lỗi", "Không thể lấy chi tiết mẫu bay");
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

    const lineGeoJSON = useMemo(() => {
        if (!detail?.waypoints || detail.waypoints.length < 2) return null;
        return turf.lineString(detail.waypoints.map((w: any) => [w.longitude, w.latitude]));
    }, [detail?.waypoints]);
    
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
                <Text style={styles.headerTitle}>Chi tiết Mẫu bay</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.mainCard}>
                    <Text style={styles.mainTitle}>{detail.notes || 'Không có mô tả'}</Text>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{detail.status}</Text>
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
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bản đồ Lộ trình</Text>
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
                        </Mapbox.MapView>
                    </View>
                </View>
            </ScrollView>
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
    waypointParam: { fontSize: 12, color: '#E65100', fontWeight: '600', backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }
});
