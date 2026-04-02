import FavouriteApi from '@/api/favouriteApi';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type FavouriteItem = {
  _id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
};

export default function FavouriteScreen() {
  const router = useRouter();
  const [favourites, setFavourites] = useState<FavouriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchFavs = async () => {
        try {
          setIsLoading(true);
          const id = await AsyncStorage.getItem("USER_PROFILE_ID");
          if (id) {
            let userId = id;
            try {
              userId = JSON.parse(id);
            } catch (e) {
              userId = id;
            }

            const res = await FavouriteApi.get(userId);
            const list = res?.data?.data || res?.data || res || [];
            if (Array.isArray(list) && isMounted) {
              const uniqueList = Array.from(new Map(list.map((item: any) => [item._id || JSON.stringify(item), item])).values());
              setFavourites(uniqueList as FavouriteItem[]);
            } else {
              alert('Không thể nhận diện danh sách: ' + JSON.stringify(list).substring(0, 100));
            }
          }
        } catch (error: any) {
          console.error("Lỗi lấy danh sách:", error);
          let msg = error?.message || "Lỗi không xác định";
          if (error.response) {
            msg = `Mã lỗi: ${error.response.status}. Chi tiết: ${JSON.stringify(error.response.data)}`;
          }
          alert("Lỗi lấy dữ liệu: " + msg);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };

      fetchFavs();

      return () => { isMounted = false; };
    }, [])
  );

  const handlePressItem = (item: any) => {
    let lat: number | undefined;
    let lng: number | undefined;

    try {
      if (item.location) {
        const loc = typeof item.location === 'string' ? JSON.parse(item.location) : item.location;

        // GeoJSON format: { coordinates: [lng, lat] }
        if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
          lng = Number(loc.coordinates[0]);
          lat = Number(loc.coordinates[1]);
        }
        // Plain object: { lat, lng }
        else if (loc.lat !== undefined && loc.lng !== undefined) {
          lat = Number(loc.lat);
          lng = Number(loc.lng);
        }
      }

      // Fallback: parse from address string "Tọa độ: 10.83309, 106.81891"
      if ((lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) && item.address) {
        const match = item.address.match(/([-\d.]+),\s*([-\d.]+)/);
        if (match) {
          lat = parseFloat(match[1]);
          lng = parseFloat(match[2]);
        }
      }
    } catch (e) {
      console.log("Parse location error", e);
    }

    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      router.replace({
        pathname: '/(tabs)/map',
        params: { favLat: lat, favLng: lng }
      });
    } else {
      alert("Không đọc được tọa độ của địa điểm này.");
    }
  };

  const renderItem = ({ item }: { item: FavouriteItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => handlePressItem(item)}>
      <View style={styles.iconBox}>
        <Ionicons name="heart" size={24} color="#FF3B30" />
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.address}>{item.address}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Địa Điểm Yêu Thích</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0055FF" />
        </View>
      ) : favourites.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="map-outline" size={60} color="#DDD" />
          <Text style={styles.emptyText}>Chưa có địa điểm nào</Text>
        </View>
      ) : (
        <FlatList
          data={favourites}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9', paddingTop: 20 },
  header: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A1D1E' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 16, fontSize: 16, color: '#888' },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  iconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFEBEA', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoBox: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 4 },
  address: { fontSize: 13, color: '#666' }
});
