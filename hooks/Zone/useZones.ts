import zoneApi from '@/api/zoneApi';
import { useEffect, useRef, useState } from 'react';

export const useZones = (connectedMongoId: string, sessionId: string) => {
  const [zones, setZones] = useState<any[]>([]);
  const zonesRef = useRef<any[]>([]);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const zRes = await zoneApi.getAll({ limit: 100 });
        const zoneList = zRes.data?.data || zRes.data || [];
        if (Array.isArray(zoneList)) {
          setZones(zoneList);
          zonesRef.current = zoneList;
        }
      } catch (e) {
        console.log("Lỗi tải data vùng cấm:", e);
      }
    };
    if (connectedMongoId && sessionId) {
      fetchZones();
    }
  }, [connectedMongoId, sessionId]);

  return { zones, zonesRef };
};