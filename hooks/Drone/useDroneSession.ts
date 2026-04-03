import droneApi from '@/api/droneApi';
import { flightSessionApi } from '@/api/flightSessionApi';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export const useDroneSession = (connectedMongoId: string, sessionId: string) => {
  const router = useRouter();
  const [simulatorDroneId, setSimulatorDroneId] = useState<string>('');
  const [droneModel, setDroneModel] = useState<string>('Đang kết nối...');
  const [isEnding, setIsEnding] = useState(false);

  // Logic lấy thông tin Drone Identity
  useEffect(() => {
    const initData = async () => {
      try {
        const dRes = await droneApi.getAll();
        const myDrone = dRes.data.find((d: any) => d._id === connectedMongoId);

        if (myDrone) {
          setSimulatorDroneId(myDrone.droneId);
          setDroneModel(myDrone.model);
        }

        console.log("\n=======================================================");
        console.log(`👉 DRONE ID:    ${myDrone?.droneId}`);
        console.log(`👉 SESSION ID:  ${sessionId}`);
        console.log("=======================================================\n");
      } catch (e) {
        console.log("Lỗi tải thông tin drone identity:", e);
      }
    };

    if (connectedMongoId && sessionId) {
      initData();
    }
  }, [connectedMongoId, sessionId]);

  // Logic kết thúc chuyến bay
  const handleEndFlight = async (altitude: number) => {
    if (!sessionId) return;
    
    Alert.alert("Xác nhận", "Kết thúc chuyến bay này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Kết thúc", 
        style: "destructive", 
        onPress: async () => {
          if (altitude != 0) {
            Alert.alert("Cảnh báo", "Drone còn đang bay chưa thể kết thúc chuyến bay");
          } else {
            try {
              setIsEnding(true);
              await flightSessionApi.endSession(sessionId);

              router.setParams({
                sessionId: '',
                connectedDroneId: '',
                droneId: ''
              });
            } catch (error) {
              console.log("Lỗi End Session API:", error);
            } finally {
              setIsEnding(false);
              router.back();
            }
          }
        }
      }
    ]);
  };

  return { simulatorDroneId, droneModel, isEnding, handleEndFlight };
};