import droneApi, { Drone } from '@/api/droneApi';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export function useFetchDrones() {
  const [listData, setListData] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrones = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchDrones();
  }, [fetchDrones]);

  // Hàm hỗ trợ xóa trực tiếp trên state để UI mượt mà, không cần gọi lại API
  const removeDroneFromState = useCallback((id: string) => {
    setListData((prev) => prev.filter((item) => item._id !== id));
  }, []);

  return { listData, loading, fetchDrones, removeDroneFromState };
}