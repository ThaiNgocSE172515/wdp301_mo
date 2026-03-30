import droneApi, { Drone } from '@/api/droneApi';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

export type FormState = {
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

export function useMyDrones() {
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
          route: {
            type: "LineString",
            coordinates: [
              [0, 0], 
             [0.0001, 0.0001]
            ]
          }
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

  // Picker list data (memo cho nhẹ)
  const pickerData = useMemo(() => DRONE_CATALOG, []);

  return {
    listData,
    loading,
    showmodal,
    setshowmodal,
    submit,
    newdata,
    setnewdata,
    showModelPicker,
    setShowModelPicker,
    isEditing,
    pickerData,
    openAddModal,
    openEditModal,
    saveDrone,
    confirmDelete,
  };
}