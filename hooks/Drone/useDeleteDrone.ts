import droneApi from '@/api/droneApi';
import { Alert } from 'react-native';

export function useDeleteDrone(onSuccess: (id: string) => void) {
  const confirmDelete = (id: string) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa Drone này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await droneApi.delete(id);
            onSuccess(id); // Gọi callback để xóa item khỏi list UI
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa Drone');
          }
        },
      },
    ]);
  };

  return { confirmDelete };
}