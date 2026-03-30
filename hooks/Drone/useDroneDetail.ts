import droneApi, { Drone } from '@/api/droneApi';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export function useDroneDetail(id: string | string[] | undefined) {
  const router = useRouter();
  const [drone, setDrone] = useState<Drone | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDroneDetail = async () => {
      if (!id || typeof id !== 'string') return;
      
      try {
        setLoading(true);
        const response = await droneApi.getDetail(id);
        setDrone(response.data);
      } catch (error) {
        console.error("Lỗi gọi chi tiết drone:", error);
        Alert.alert("Lỗi", "Không thể tải thông tin Drone");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchDroneDetail();
  }, [id]);

  return {
    drone,
    loading,
  };
}