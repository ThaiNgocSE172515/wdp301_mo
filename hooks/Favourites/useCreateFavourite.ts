import FavouriteApi from '@/api/favouriteApi';
import { useState } from 'react';
import { Alert } from 'react-native';

export const useCreateFavourite = () => {
  const [isSavingFav, setIsSavingFav] = useState(false);

  // Hàm này nhận vào các biến từ UI truyền xuống
  const createFavourite = async (userId: string, selectedPoint: { lat: number; lng: number } | null, favouriteName: string) => {
    if (!selectedPoint || !userId) {
      Alert.alert("Lỗi", "Vui lòng chọn điểm và đảm bảo đã đăng nhập.");
      return false; // Trả về false báo hiệu thất bại
    }
    if (!favouriteName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên địa điểm.");
      return false;
    }

    try {
      setIsSavingFav(true);
      await FavouriteApi.create({
        user_id: userId,
        location: { type: 'Point', coordinates: [selectedPoint.lng, selectedPoint.lat] },
        name: favouriteName,
        address: `Tọa độ: ${selectedPoint.lat.toFixed(5)}, ${selectedPoint.lng.toFixed(5)}`,
        numberOfFlight: 0
      });

      Alert.alert("Thành công", "Đã lưu địa điểm yêu thích!");
      return true; // Trả về true báo hiệu thành công
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không thể lưu địa điểm.");
      return false;
    } finally {
      setIsSavingFav(false);
    }
  };

  return { isSavingFav, createFavourite };
};