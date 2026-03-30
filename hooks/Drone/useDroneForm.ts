import droneApi, { Drone } from '@/api/droneApi';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

export type FormState = {
  serialNumber: string;
  model: string;
  ownerType: 'INDIVIDUAL';
  maxAltitude: string;
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

export function useDroneForm(onSuccess: () => void) {
  const [showmodal, setshowmodal] = useState(false);
  const [submit, setsubmit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newdata, setnewdata] = useState<FormState>(DEFAULT_FORM);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const isEditing = !!editingId;
  const pickerData = useMemo(() => DRONE_CATALOG, []);

  const openAddModal = () => {
    setEditingId(null);
    setnewdata(DEFAULT_FORM);
    setshowmodal(true);
  };

  const openEditModal = (item: Drone) => {
    setEditingId(item._id);
    setnewdata({
      serialNumber: item.serialNumber ?? '',
      model: item.model ?? '',
      ownerType: (item.ownerType as any) ?? 'INDIVIDUAL',
      maxAltitude: item.maxAltitude?.toString?.() ?? String(item.maxAltitude ?? ''),
    });
    setshowmodal(true);
  };

  const saveDrone = async () => {
    if (!newdata.maxAltitude || !newdata.model || !newdata.serialNumber) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    const maxAltNum = Number(newdata.maxAltitude);
    if (Number.isNaN(maxAltNum) || maxAltNum <= 0) {
      Alert.alert('Thông báo', 'Max Altitude phải là số hợp lệ!');
      return;
    }

    try {
      setsubmit(true);

      if (editingId) {
        // UPDATE
        await droneApi.update(editingId, {
          model: newdata.model,
          maxAltitude: maxAltNum,
        });
        Alert.alert('Thành công', 'Cập nhật Drone thành công!');
      } else {
        // CREATE
        await droneApi.CreateDrone({
          serialNumber: newdata.serialNumber,
          model: newdata.model,
          ownerType: newdata.ownerType,
          maxAltitude: maxAltNum,
          route: { type: "LineString", coordinates: [[0, 0], [0.0001, 0.0001]] }
        });
        Alert.alert('Thành công', 'Đã thêm Drone mới!');
      }

      setshowmodal(false);
      onSuccess(); // Refetch danh sách
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', editingId ? 'Không thể cập nhật.' : 'Không thể thêm mới.');
    } finally {
      setsubmit(false);
    }
  };

  return {
    showmodal, setshowmodal,
    submit,
    newdata, setnewdata,
    showModelPicker, setShowModelPicker,
    isEditing,
    pickerData,
    openAddModal, openEditModal,
    saveDrone,
  };
}