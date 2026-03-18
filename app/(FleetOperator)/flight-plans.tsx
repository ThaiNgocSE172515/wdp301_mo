import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import flightPlanApi from '@/api/flightPlanApi';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

export default function FlightPlansScreen() {
  const router = useRouter();
  const [listData, setListData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<{ _id: string, notes: string, drone: string, priority: number, waypoints: any[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFlightPlans = async () => {
    try {
      setLoading(true);
      const response = await flightPlanApi.getAll();
      setListData(response.data || response);
    } catch (error) {
      console.error('Lỗi gọi API:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách cấu hình bay.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFlightPlans();
    }, [])
  );

  const confirmDelete = (id: string) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa Kế hoạch bay này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await flightPlanApi.delete(id);
            setListData((prev) => prev.filter((item) => item._id !== id));
            Alert.alert("Thành công", "Đã xóa Kế hoạch bay");
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa Kế hoạch bay này (có thể do đang được sử dụng)');
          }
        },
      },
    ]);
  };

  const openEditModal = (item: any) => {
    setEditingPlan({
      _id: item._id,
      notes: item.notes || '',
      drone: item.drone?._id || item.drone,
      priority: item.priority || 0,
      waypoints: item.waypoints || []
    });
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editingPlan?.notes) {
      Alert.alert("Lỗi", "Ghi chú/Mô tả không được để trống");
      return;
    }
    try {
      setIsSubmitting(true);
      await flightPlanApi.update(editingPlan._id, {
        notes: editingPlan.notes,
        drone: editingPlan.drone,
        priority: editingPlan.priority,
        waypoints: editingPlan.waypoints
      });
      Alert.alert("Thành công", "Đã cập nhật Kế hoạch bay");
      setEditModalVisible(false);
      fetchFlightPlans();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể cập nhật Kế hoạch bay");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/(FleetOperator)/flight-plan-detail', params: { id: item._id } })}
    >
      <View style={styles.itemIconContainer}>
        <Ionicons name="earth" size={24} color="#E65100" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.notes || 'Gói bay không tên'}</Text>
        <Text style={styles.itemDroneSubtitle} numberOfLines={1}>
          <Ionicons name="hardware-chip-outline" size={14} /> {item.drone?.model || 'Chưa gán Drone'}
        </Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(item)}>
          <Ionicons name="create-outline" size={22} color="#1565C0" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(item._id)}>
          <Ionicons name="trash-outline" size={22} color="#D32F2F" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F222A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Kế hoạch bay</Text>
        <View style={{ width: 40 }} />
      </View>

      <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={() => router.push('/(FleetOperator)/create-flight-plan')}>
        <Ionicons name="add-circle" size={22} color="#fff" />
        <Text style={styles.addButtonText}>Tạo Kế hoạch bay mới</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0055FF" />
          <Text style={{ marginTop: 10, color: '#888' }}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có Kế hoạch bay nào.</Text>
            </View>
          }
        />
      )}

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sửa Kế hoạch bay</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1F222A" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Ghi chú (Notes)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={editingPlan?.notes}
                onChangeText={(t) => setEditingPlan(prev => prev ? { ...prev, notes: t } : null)}
                multiline
                placeholder="Nhập mô tả cho Kế hoạch bay..."
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdate} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>CẬP NHẬT</Text>}
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A' },
  backBtn: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  addButton: { backgroundColor: '#E65100', marginHorizontal: 20, marginBottom: 15, paddingVertical: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#E65100', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  itemContainer: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  itemIconContainer: { width: 50, height: 50, backgroundColor: '#FFF3E0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A', marginBottom: 6 },
  itemDroneSubtitle: { fontSize: 13, color: '#666', fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 10 },
  iconBtn: { padding: 6, backgroundColor: '#F5F5F5', borderRadius: 8 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyText: { marginTop: 15, color: '#888', fontSize: 15 },

  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#1F222A', marginBottom: 8, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 15, fontSize: 16, color: '#1F222A', backgroundColor: '#F9F9F9' },
  primaryBtn: { backgroundColor: '#0055FF', borderRadius: 12, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
