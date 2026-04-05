import zoneApi from '@/api/zoneApi';
import { useCallback, useState } from 'react';

export const useZoneDetail = () => {
  const [zoneDetail, setZoneDetail] = useState<any>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchZoneDetail = useCallback(async (zoneId: string) => {
    if (!zoneId || zoneDetail?._id === zoneId) return;

    setIsLoadingDetail(true);
    try {
      const res = await zoneApi.getById(zoneId);
      const data = res.data?.data || res.data;
      setZoneDetail(data);
    } catch (e) {
      console.error("Lỗi khi lấy chi tiết vùng cấm:", e);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [zoneDetail?._id]);

  const clearZoneDetail = () => setZoneDetail(null);

  return { zoneDetail, isLoadingDetail, fetchZoneDetail, clearZoneDetail };
};