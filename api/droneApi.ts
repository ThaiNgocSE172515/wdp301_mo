import axiosClient from './axiosClient';


export interface OwnerInfo {
  _id: string;
  email: string;
  role: string;
  profile?: { 
    fullName?: string;
  };
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
}

export interface CreateDronePayload {
  droneId: string;
  serialNumber: string;
  model: string;
  ownerType: string;
  maxAltitude: number;
}

export interface UpdateDronePayload {
  model?: string;
  maxAltitude?: number;
  status?: string;
}

const droneApi ={
   getAll: () => {
    return axiosClient.get<Drone[]>('/drones');
   },
   CreateDrone: (data: CreateDronePayload) => {
      return axiosClient.post('/drones', data);
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