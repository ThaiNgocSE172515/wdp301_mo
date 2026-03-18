import axiosClient from './axiosClient';

const missionApi = {
    getAll: async () => {
        const response = await axiosClient.get("/missions");
        return response.data;
    },
    getMissionById: async (id: any) => {
        const response = await axiosClient.get(`/missions/${id}`);
        return response.data;
    },
    create: async (data: any) => {
        const response = await axiosClient.post("/missions", data);
        return response.data;
    },
    startMission: async (id: any) => {
        const response = await axiosClient.post(`/missions/${id}/start`);
        return response.data;
    },
    updateMission: async (id: any, data: any) => {
        const response = await axiosClient.put(`/missions/${id}`, data);
        return response.data;
    },
    deleteMission: async (id: any) => {
        const response = await axiosClient.delete(`/missions/${id}`);
        return response.data;
    },
    addMissionPlan: async (id: any, data: any) => {
        const response = await axiosClient.post(`/missions/${id}/plans`, data);
        return response.data;
    },
    startPlannedSession: async (data: any) => {
        const response = await axiosClient.post(`/flight-sessions/start`, data);
        return response.data;
    },
    updateMissionPlan: async (id: any, planId: any, data: any) => {
        const response = await axiosClient.put(`/missions/${id}/plans/${planId}`, data);
        return response.data;
    },
    deleteMissionPlan: async (id: any, planId: any) => {
        const response = await axiosClient.delete(`/missions/${id}/plans/${planId}`);
        return response.data;
    }
}

export default missionApi;
