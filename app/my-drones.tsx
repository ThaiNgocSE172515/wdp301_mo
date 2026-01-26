import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Modal, 
  KeyboardAvoidingView, 
  Platform, 
  TextInput, 
  ScrollView, 
  Animated 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import droneApi, { Drone } from '@/api/droneApi'; 

export default function MyDronesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // State quản lý dữ liệu và UI
  const [listData, setListData] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showmodal, setshowmodal] = useState(false);
  const [submit, setsubmit] = useState(false);
  
  // --- STATE MỚI: QUẢN LÝ VIỆC EDIT ---
  const [editingId, setEditingId] = useState<string | null>(null); // Lưu ID đang sửa

  // State form
  const [newdata, setnewdata] = useState({
    droneId: '',
    serialNumber: '',
    model: '',
    ownerType: 'INDIVIDUAL',
    maxAltitude: ''
  });

  // --- 1. LẤY DANH SÁCH ---
  const getallDrone = async () => {
    try {
      setLoading(true);
      const response = await droneApi.getAll();
      setListData(response.data);
    } catch (error) {
      console.error("Lỗi gọi API:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getallDrone();
  }, []);

  // --- 2. XỬ LÝ MỞ MODAL (ADD HOẶC EDIT) ---
  
  // Mở để thêm mới
  const openAddModal = () => {
    setEditingId(null); // Reset ID
    setnewdata({        // Reset form
        droneId: '',
        serialNumber: '',
        model: '',
        ownerType: 'INDIVIDUAL',
        maxAltitude: ''
    });
    setshowmodal(true);
  }

  // Mở để sửa (Edit)
  const openEditModal = (item: Drone) => {
    setEditingId(item._id); // Lưu ID đang sửa
    setnewdata({            // Fill dữ liệu cũ vào form
        droneId: item.droneId,
        serialNumber: item.serialNumber,
        model: item.model,
        ownerType: item.ownerType,
        maxAltitude: item.maxAltitude.toString()
    });
    setshowmodal(true);
  }

  // --- 3. HÀM SAVE (CHIA RA ADD HOẶC UPDATE) ---
  const handleSave = async () => {
    if(!newdata.droneId || !newdata.maxAltitude || !newdata.model || !newdata.serialNumber){
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    try {
      setsubmit(true);
      
      // A. TRƯỜNG HỢP UPDATE
      if (editingId) {
        const payload = {
            model: newdata.model,
            maxAltitude: Number(newdata.maxAltitude),
            status: 'IDLE' // Hoặc giữ nguyên status cũ nếu muốn
        };
        await droneApi.update(editingId, payload);
        Alert.alert("Thành công", "Cập nhật Drone thành công!");
      } 
      // B. TRƯỜNG HỢP ADD NEW
      else {
        const payload = {
            ...newdata,
            maxAltitude: Number(newdata.maxAltitude)
        };
        await droneApi.CreateDrone(payload);
        Alert.alert("Thành công", "Đã thêm Drone mới!");
      }

      // Xử lý sau khi thành công
      setshowmodal(false);
      getallDrone(); // Load lại list

    } catch (error) {
      Alert.alert("Lỗi", editingId ? "Không thể cập nhật." : "Không thể thêm mới.");
      console.error(error);
    } finally {
      setsubmit(false);
    }
  }

  // --- 4. HÀM XÓA DRONE ---
  const handleDeleteDrone = (id: string) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa Drone này không?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive",
          onPress: async () => {
            try {
              await droneApi.delete(id); 
              const newList = listData.filter(item => item._id !== id);
              setListData(newList);            
            } catch (error) {
              Alert.alert("Lỗi", "Không thể xóa Drone");
            }
          }
        }
      ]
    );
  };

  // --- 5. RENDER ACTIONS (EDIT & DELETE) ---
  const renderRightActions = (progress: any, dragX: any, item: Drone) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.actionsContainer}>
        {/* Nút EDIT (Màu Xanh/Cam) */}
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#FF9500' }]} // Màu cam cho Edit
          onPress={() => {
             // Đóng swipe trước khi mở modal (tùy chọn, để UX mượt hơn)
             openEditModal(item);
          }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="create-outline" size={24} color="#fff" />
            <Text style={styles.actionText}>Edit</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Nút DELETE (Màu Đỏ) */}
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#FF3B30' }]} 
          onPress={() => handleDeleteDrone(item._id)}
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
          onPress={() => router.push({
            pathname: '/drone-detail',
            params: { id: item._id } as any
          })}
        >
          <View style={styles.itemImageContainer}>
            <Ionicons name="airplane" size={30} color="#1F222A" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.model}</Text> 
            <Text style={styles.itemType}>SN: {item.serialNumber}</Text> 
            <Text style={[
              styles.itemStatus, 
              { color: item.status === 'Available' ? '#00C2E0' : '#FF9500' } 
            ]}>
              • {item.status}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </Swipeable>
    </View>
  );

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

        {/* Nút Add Drone (Gọi hàm openAddModal) */}
        <TouchableOpacity 
          style={styles.addButton} 
          activeOpacity={0.8}
          onPress={openAddModal} 
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.addButtonText}>Add New Drone</Text>
        </TouchableOpacity>

        {/* Danh sách Drone */}
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
            contentContainerStyle={[
              styles.listContent, 
              { paddingBottom: 20 + insets.bottom } 
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
               <Text style={{ textAlign: 'center', marginTop: 50, color: '#999' }}>
                 Danh sách trống
               </Text>
            }
          />
        )}

        {/* --- MODAL (DÙNG CHUNG ADD & EDIT) --- */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showmodal}
          onRequestClose={() => setshowmodal(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                {/* Đổi Title dựa vào state */}
                <Text style={styles.modalTitle}>
                    {editingId ? 'Update Drone Info' : 'New Drone Info'}
                </Text>
                <TouchableOpacity onPress={() => setshowmodal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                
                <Text style={styles.label}>Drone ID</Text>
                <TextInput 
                  style={[styles.input, editingId && { backgroundColor: '#E0E0E0', color: '#888' }]} // Xám đi nếu đang edit
                  placeholder="Ex: DRONE001"
                  value={newdata.droneId}
                  editable={!editingId} // Không cho sửa ID khi update (thường backend cấm)
                  onChangeText={(text) => setnewdata({...newdata, droneId: text})}
                />

                <Text style={styles.label}>Model Name</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: DJI Air 3"
                  value={newdata.model}
                  onChangeText={(text) => setnewdata({...newdata, model: text})}
                />

                <Text style={styles.label}>Serial Number</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: SN123456"
                  value={newdata.serialNumber}
                  editable={!editingId} // Serial number thường cũng không đổi được
                  onChangeText={(text) => setnewdata({...newdata, serialNumber: text})}
                />

                <Text style={styles.label}>Max Altitude (m)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: 5000"
                  keyboardType="numeric"
                  value={newdata.maxAltitude}
                  onChangeText={(text) => setnewdata({...newdata, maxAltitude: text})}
                />

                {/* Buttons */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.btnAction, styles.btnCancel]} 
                    onPress={() => setshowmodal(false)}
                  >
                    <Text style={styles.textCancel}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.btnAction, styles.btnSave]} 
                    onPress={handleSave} // Gọi hàm chung handleSave
                    disabled={submit}
                  >
                    {submit ? <ActivityIndicator color="#fff" size="small"/> : (
                        <Text style={styles.textSave}>
                            {editingId ? 'Update' : 'Save'}
                        </Text>
                    )}
                  </TouchableOpacity>
                </View>

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A' },
  backBtn: { 
    width: 40, height: 40, backgroundColor: '#fff', borderRadius: 10, 
    justifyContent: 'center', alignItems: 'center', elevation: 2 
  },
  addButton: {
    backgroundColor: '#1F222A', marginHorizontal: 20, marginBottom: 15, paddingVertical: 15,
    borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 4,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  listContent: { paddingHorizontal: 20, paddingTop: 5 },
  
  // Item
  itemWrapper: { marginBottom: 15, backgroundColor: 'transparent' },
  itemContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }
  },
  itemImageContainer: {
    width: 60, height: 60, backgroundColor: '#F5F7FA', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1F222A' },
  itemType: { fontSize: 13, color: '#A0A0A0', marginBottom: 4 },
  itemStatus: { fontSize: 12, fontWeight: '600' },

  // --- ACTIONS CONTAINER (Sửa lại cho đẹp) ---
  actionsContainer: {
    flexDirection: 'row', // Xếp ngang
    width: 140, // Đủ rộng cho 2 nút
    height: '100%',
    marginLeft: 10,
  },
  actionButton: {
    flex: 1, // Chia đều không gian
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 2, // Cách nhau 1 xíu
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }, 
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25,
    padding: 20, maxHeight: '85%', 
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 5
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F222A' },
  label: { fontSize: 14, fontWeight: '600', color: '#1F222A', marginBottom: 8, marginTop: 10 },
  input: {
    backgroundColor: '#F5F7FA', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14,
    fontSize: 15, color: '#1F222A', borderWidth: 1, borderColor: '#EEE'
  },
  modalButtons: { flexDirection: 'row', gap: 15, marginTop: 30, marginBottom: 20 },
  btnAction: { flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD' },
  btnSave: { backgroundColor: '#1F222A' },
  textCancel: { color: '#666', fontWeight: '600' },
  textSave: { color: '#fff', fontWeight: 'bold' }
});