import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import droneApi, { Drone } from '@/api/droneApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DRONE_CATALOG = [
  { model: 'DJI Mini 4 Pro', maxAltitude: 4000 },
  { model: 'DJI Mini 3', maxAltitude: 4000 },
  { model: 'DJI Air 3', maxAltitude: 6000 },
  { model: 'DJI Air 2S', maxAltitude: 5000 },
  { model: 'DJI Mavic 3 Pro', maxAltitude: 6000 },
  { model: 'DJI Avata 2', maxAltitude: 5000 },
  { model: 'Autel EVO Lite+', maxAltitude: 4000 },
  { model: 'Autel EVO Nano+', maxAltitude: 4000 },
  { model: 'Parrot ANAFI Ai', maxAltitude: 5000 },
] as const;
const droneImage = "https://cdn-icons-png.flaticon.com/512/1830/1830867.png";
type FormState = {
  serialNumber: string;
  model: string;
  ownerType: 'INDIVIDUAL';
  maxAltitude: string; // nhập từ TextInput
};

const DEFAULT_FORM: FormState = {
  serialNumber: '',
  model: '',
  ownerType: 'INDIVIDUAL',
  maxAltitude: '',
};

export default function MyDronesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [listData, setListData] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);

  const [showmodal, setshowmodal] = useState(false);
  const [submit, setsubmit] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newdata, setnewdata] = useState<FormState>(DEFAULT_FORM);

  // Model picker
  const [showModelPicker, setShowModelPicker] = useState(false);

  const isEditing = !!editingId;

  const resetForm = () => setnewdata(DEFAULT_FORM);

  const setFormFromDrone = (item: Drone) => {
    setnewdata({
      serialNumber: item.serialNumber ?? '',
      model: item.model ?? '',
      ownerType: (item.ownerType as any) ?? 'INDIVIDUAL',
      maxAltitude: item.maxAltitude?.toString?.() ?? String(item.maxAltitude ?? ''),
    });
  };

  const getallDrone = async () => {
    try {
      setLoading(true);
      const response = await droneApi.getAll();
      setListData(response.data);
    } catch (error) {
      console.error('Lỗi gọi API:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách drone.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getallDrone();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    resetForm();
    setshowmodal(true);
  };

  const openEditModal = (item: Drone) => {
    setEditingId(item._id);
    setFormFromDrone(item);
    setshowmodal(true);
  };

  const validateForm = () => {
    if (!newdata.maxAltitude || !newdata.model || !newdata.serialNumber) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ thông tin!');
      return null;
    }

    const maxAltNum = Number(newdata.maxAltitude);
    if (Number.isNaN(maxAltNum) || maxAltNum <= 0) {
      Alert.alert('Thông báo', 'Max Altitude phải là số hợp lệ!');
      return null;
    }

    return { maxAltNum };
  };

  const saveDrone = async () => {
    const v = validateForm();
    if (!v) return;

    try {
      setsubmit(true);

      if (editingId) {
        // UPDATE
        const payload = {
          model: newdata.model,
          maxAltitude: v.maxAltNum,
          status: 'IDLE',
        };
        await droneApi.update(editingId, payload);
        Alert.alert('Thành công', 'Cập nhật Drone thành công!');
      } else {
        // CREATE (không gửi droneId)
        const payload = {
          serialNumber: newdata.serialNumber,
          model: newdata.model,
          ownerType: newdata.ownerType,
          maxAltitude: v.maxAltNum,
        };
        await droneApi.CreateDrone(payload as any);
        Alert.alert('Thành công', 'Đã thêm Drone mới!');
      }

      setshowmodal(false);
      getallDrone();
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', editingId ? 'Không thể cập nhật.' : 'Không thể thêm mới.');
    } finally {
      setsubmit(false);
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa Drone này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await droneApi.delete(id);
            setListData((prev) => prev.filter((item) => item._id !== id));
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa Drone');
          }
        },
      },
    ]);
  };

  const renderRightActions = (progress: any, dragX: any, item: Drone) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF9500' }]}
          onPress={() => openEditModal(item)}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="create-outline" size={24} color="#fff" />
            <Text style={styles.actionText}>Edit</Text>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
          onPress={() => confirmDelete(item._id)}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="trash-outline" size={24} color="#fff" />
            <Text style={styles.actionText}>Delete</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Drone }) => (
    <View style={styles.itemWrapper}>
      <Swipeable
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
        containerStyle={{ overflow: 'visible' }}
      >
        <TouchableOpacity
          style={styles.itemContainer}
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: '/drone-detail',
              params: { id: item._id } as any,
            })
          }
        >
          <View style={styles.itemImageContainer}>
            <Image
                       source={{ uri: droneImage }}
                       style={styles.droneImg}
                       resizeMode="contain"
                     />
          </View>

          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.model}</Text>
            <Text style={styles.itemType}>SN: {item.serialNumber}</Text>
            <Text
              style={[
                styles.itemStatus,
                { color: item.status === 'Available' ? '#00C2E0' : '#FF9500' },
              ]}
            >
              • {item.status}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </Swipeable>
    </View>
  );

  // Picker list data (memo cho nhẹ)
  const pickerData = useMemo(() => DRONE_CATALOG, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1F222A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Drones</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Add */}
        <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={openAddModal}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.addButtonText}>Add New Drone</Text>
        </TouchableOpacity>

        {/* List */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#1F222A" />
            <Text style={{ marginTop: 10, color: '#888' }}>Đang tải dữ liệu...</Text>
          </View>
        ) : (
          <FlatList
            data={listData}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={[styles.listContent, { paddingBottom: 20 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', marginTop: 50, color: '#999' }}>
                Danh sách trống
              </Text>
            }
          />
        )}

        {/* Modal Add/Edit */}
        <Modal
          animationType="slide"
          transparent
          visible={showmodal}
          onRequestClose={() => setshowmodal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditing ? 'Update Drone Info' : 'New Drone Info'}</Text>
                <TouchableOpacity onPress={() => setshowmodal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Model picker trigger */}
                <Text style={styles.label}>Model Name</Text>
                <TouchableOpacity activeOpacity={0.85} onPress={() => setShowModelPicker(true)}>
                  <View pointerEvents="none">
                    <TextInput
                      style={styles.input}
                      placeholder="Chọn model..."
                      value={newdata.model}
                      editable={false}
                    />
                  </View>
                </TouchableOpacity>

                <Text style={styles.label}>Serial Number</Text>
                <TextInput
                  style={[styles.input, isEditing && { backgroundColor: '#E0E0E0', color: '#888' }]}
                  placeholder="Ex: SN123456"
                  value={newdata.serialNumber}
                  editable={!isEditing}
                  onChangeText={(text) => setnewdata((p) => ({ ...p, serialNumber: text }))}
                />

                <Text style={styles.label}>Max Altitude (m)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 5000"
                  keyboardType="numeric"
                  value={newdata.maxAltitude}
                  onChangeText={(text) => setnewdata((p) => ({ ...p, maxAltitude: text }))}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnCancel]}
                    onPress={() => setshowmodal(false)}
                  >
                    <Text style={styles.textCancel}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnSave]}
                    onPress={saveDrone}
                    disabled={submit}
                  >
                    {submit ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.textSave}>{isEditing ? 'Update' : 'Save'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Model Picker Modal */}
        <Modal
          visible={showModelPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowModelPicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerBox}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Chọn Drone Model</Text>
                <TouchableOpacity onPress={() => setShowModelPicker(false)}>
                  <Ionicons name="close" size={22} color="#333" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={pickerData as any}
                keyExtractor={(item: any) => item.model}
                renderItem={({ item }: any) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      setnewdata((prev) => ({
                        ...prev,
                        model: item.model,
                        maxAltitude: String(item.maxAltitude),
                      }));
                      setShowModelPicker(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerItemTitle}>{item.model}</Text>
                      <Text style={styles.pickerItemSub}>Max altitude: {item.maxAltitude} m</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#999" />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#EEE' }} />}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A' },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  addButton: {
    backgroundColor: '#1F222A',
    marginHorizontal: 20,
    marginBottom: 15,
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  listContent: { paddingHorizontal: 20, paddingTop: 5 },

  itemWrapper: { marginBottom: 15, backgroundColor: 'transparent' },
  itemContainer: {
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
  itemImageContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1F222A' },
  itemType: { fontSize: 13, color: '#A0A0A0', marginBottom: 4 },
  itemStatus: { fontSize: 12, fontWeight: '600' },

  actionsContainer: {
    flexDirection: 'row',
    width: 140,
    height: '100%',
    marginLeft: 10,
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 2,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F222A' },
  label: { fontSize: 14, fontWeight: '600', color: '#1F222A', marginBottom: 8, marginTop: 10 },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F222A',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  modalButtons: { flexDirection: 'row', gap: 15, marginTop: 30, marginBottom: 20 },
  btnAction: { flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD' },
  btnSave: { backgroundColor: '#1F222A' },
  textCancel: { color: '#666', fontWeight: '600' },
  textSave: { color: '#fff', fontWeight: 'bold' },

  // Picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F222A',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F222A',
  },
  pickerItemSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#777',
  },
  droneImg: {
  width: 40,
  height: 40,
},
});
