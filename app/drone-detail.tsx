import droneApi, { Drone } from '@/api/droneApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DroneDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { id } = useLocalSearchParams<{ id: string }>();

  const [drone, setDrone] = useState<Drone | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDroneDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await droneApi.getDetail(id);
        setDrone(response.data);
      } catch (error) {
        console.error(error);
        Alert.alert('Lỗi', 'Không thể tải thông tin Drone');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchDroneDetail();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1F222A" />
      </View>
    );
  }

  if (!drone) return null;

  const droneImage = 'https://cdn-icons-png.flaticon.com/512/1830/1830867.png';

  const handleEdit = () => {
    // Điều hướng sang màn edit (bạn thay pathname đúng screen edit của bạn)
    router.push({
      pathname: '/drone-edit',
      params: { id: drone._id } as any,
    });
  };

  const handleConnect = () => {
    // Nút “kết nối drone” – tuỳ BE/flow của bạn (scan QR, BLE, wifi...)
    Alert.alert('Connect', 'Chức năng kết nối drone chưa được implement.');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F222A" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Main Image & Info */}
        <View style={styles.imageSection}>
          <Image source={{ uri: droneImage }} style={styles.mainImage} resizeMode="contain" />
          <Text style={styles.modelName}>{drone.model}</Text>
          <Text style={styles.serialText}>SN: {drone.serialNumber}</Text>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: drone.status === 'Available' ? '#E0F7FA' : '#FFF3E0' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: drone.status === 'Available' ? '#006064' : '#E65100' },
              ]}
            >
              {drone.status}
            </Text>
          </View>
        </View>

        {/* Stats (List-like giống list drone) */}
        <View style={styles.statsList}>
          <View style={styles.statListItem}>
            <View style={styles.statLeftIconBox}>
              <MaterialCommunityIcons name="arrow-expand-vertical" size={26} color="#1F222A" />
            </View>

            <View style={styles.statMid}>
              <Text style={styles.statTitle}>Max Altitude</Text>
              <Text style={styles.statSub}>{drone.maxAltitude} meters</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>

          {/* Buttons dưới Max Altitude */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.btnAction, styles.btnEdit]} onPress={handleEdit}>
              <Ionicons name="create-outline" size={18} color="#1F222A" />
              <Text style={styles.btnEditText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnAction, styles.btnConnect]} onPress={handleConnect}>
              <Ionicons name="link-outline" size={18} color="#fff" />
              <Text style={styles.btnConnectText}>Kết nối drone</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    height: 50,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    padding: 5,
  },

  imageSection: { alignItems: 'center', marginTop: 10, marginBottom: 30 },
  mainImage: { width: width * 0.8, height: 180, marginBottom: 15 },
  modelName: { fontSize: 22, fontWeight: 'bold', color: '#1F222A' },
  serialText: { fontSize: 14, color: '#888', marginTop: 4, marginBottom: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },

  // Stats as list item (giống list drone)
  statsList: { marginBottom: 20 },
  statListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  statLeftIconBox: {
    width: 60,
    height: 60,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  statMid: { flex: 1 },
  statTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F222A' },
  statSub: { fontSize: 13, color: '#A0A0A0', marginTop: 4 },

  // Buttons row
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnEdit: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  btnConnect: {
    backgroundColor: '#1F222A',
  },
  btnEditText: {
    marginLeft: 8,
    color: '#1F222A',
    fontWeight: '700',
  },
  btnConnectText: {
    marginLeft: 8,
    color: '#fff',
    fontWeight: '700',
  },
});
