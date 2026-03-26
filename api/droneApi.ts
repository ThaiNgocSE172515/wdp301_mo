import axiosClient from './axiosClient';

export interface OwnerInfo {
  _id: string;
  email: string;
  role: string;
  profile?: { 
    fullName?: string;
  };
}

// Cấu trúc Route cho GeoJSON
export interface GeoRoute {
  type: "LineString";
  coordinates: number[][]; // Mảng các cặp [kinh độ, vĩ độ]
}

export interface Drone {
  _id: string;
  droneId: string;
  serialNumber: string;
  model: string;
  ownerType: string;
  maxAltitude: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  owner?: OwnerInfo;
  route?: GeoRoute; // Thêm vào đây để lấy dữ liệu về dùng
}

export interface CreateDronePayload {
  serialNumber: string;
  model: string;
  ownerType: string;
  maxAltitude: number;
  // Cho phép truyền route hoặc không, nhưng ta sẽ xử lý ở hàm gọi API
  route?: GeoRoute; 
}

export interface UpdateDronePayload {
  model?: string;
  maxAltitude?: number;
  status?: string;
}

const droneApi = {
  getAll: () => {
    return axiosClient.get<Drone[]>('/drones');
  },

  CreateDrone: (data: CreateDronePayload) => {
    const finalData = {
      ...data,
      route: data.route || {
        type: "LineString",
        coordinates: [] 
      }
    };
    return axiosClient.post('/drones', finalData);
  },

  delete: (id: string) => {
    return axiosClient.delete(`/drones/${id}`);
  },

  getDetail: (id: string) => {
    return axiosClient.get<Drone>(`/drones/${id}`);
  },

  update: (id: string, data: UpdateDronePayload) => {
    return axiosClient.put<Drone>(`/drones/${id}`, data);
  }
}

export default droneApi;