import FavouriteApi from '@/api/favouriteApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export const useGetFavourites = () => {
  const [userId, setUserId] = useState<string>('');
  const [favouritesList, setFavouritesList] = useState<any[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      const id = await AsyncStorage.getItem("USER_PROFILE_ID");
      if (id) {
        const parsedId = JSON.parse(id);
        setUserId(parsedId);
        try {
          const res = await FavouriteApi.get(parsedId);
          const list = res?.data?.data || res?.data || res || [];
          if (Array.isArray(list)) setFavouritesList(list);
        } catch (error) {
          console.error("Lỗi lấy danh sách yêu thích:", error);
        }
      }
    };
    fetchUser();
  }, []);
  return { userId, favouritesList, setFavouritesList };
};