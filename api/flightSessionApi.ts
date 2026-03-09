import axiosClient from './axiosClient'; // Đổi đường dẫn này cho khớp với vị trí file axiosClient của bạn nhé

export const flightSessionApi = {
  // 1. POST: Bắt đầu bay tự do
  startFreeFlight: async (droneId: string) => {
    // Axios tự động parse JSON nên ta chỉ cần gọi .data
    const response = await axiosClient.post('/flight-sessions/free-flight', { droneId });
    return response.data;
  },

  // 2. GET: Lấy danh sách phiên bay (có phân trang/filter)
  getSessions: async (status?: string, sessionType?: string, page = 1, limit = 10) => {
    const response = await axiosClient.get('/flight-sessions', {
      params: { // Truyền query params qua config 'params' của axios rất tiện
        page,
        limit,
        ...(status && { status }),             // Chỉ truyền lên nếu có giá trị
        ...(sessionType && { sessionType }),   // Chỉ truyền lên nếu có giá trị
      }
    });
    return response.data;
  },

  // 3. GET: Xem chi tiết 1 phiên bay
  getSessionDetail: async (id: string) => {
    const response = await axiosClient.get(`/flight-sessions/${id}`);
    return response.data;
  },

  // 4. POST: Kết thúc phiên bay (Chuyển sang COMPLETED)
  endSession: async (id: string) => {
    const response = await axiosClient.post(`/flight-sessions/${id}/end`);
    return response.data;
  },

  // 5. POST: Hủy phiên bay (Chuyển sang ABORTED)
  abortSession: async (id: string) => {
    const response = await axiosClient.post(`/flight-sessions/${id}/abort`);
    return response.data;
  },

  // 6. GET: Lấy dữ liệu telemetry của phiên bay
  getSessionTelemetry: async (id: string, page = 1, limit = 100) => {
    const response = await axiosClient.get(`/flight-sessions/${id}/telemetry`, {
      params: { page, limit }
    });
    return response.data;
  }
};