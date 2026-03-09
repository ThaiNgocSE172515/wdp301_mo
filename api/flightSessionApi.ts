import axiosClient from './axiosClient';

// --- ĐỊNH NGHĨA KIỂU DỮ LIỆU ---
export interface Pilot {
  _id: string;
  email: string;
  profile?: {
    fullName?: string;
    avatar?: string;
  };
}

export interface Drone {
  _id: string;
  serialNumber: string;
  model: string;
  droneId: string;
}

export interface FlightSession {
  _id: string;
  drone: Drone;
  pilot: Pilot;
  sessionType: 'PLANNED' | 'FREE_FLIGHT';
  status: 'STARTING' | 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED' | 'EMERGENCY_LANDED';
  actualStart?: string;
  actualEnd?: string;
  createdAt: string;
  updatedAt: string;
  actualRoute?: {
    type: string;
    coordinates: number[][];
  };
}

export interface FlightSessionResponse {
  data: FlightSession[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// --- API IMPLEMENTATION ---
export const flightSessionApi = {
  // 1. POST: Bắt đầu bay tự do
  startFreeFlight: async (droneId: string) => {
    const response = await axiosClient.post('/flight-sessions/free-flight', { droneId });
    return response.data;
  },

  // 2. GET: Lấy danh sách phiên bay (có phân trang/filter)
  getSessions: async (status?: string, sessionType?: string, page = 1, limit = 10) => {
    const response = await axiosClient.get('/flight-sessions', {
      params: { 
        page,
        limit,
        ...(status && { status }),             
        ...(sessionType && { sessionType }),   
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