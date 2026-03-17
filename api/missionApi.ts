import axiosClient from './axiosClient';

const missionApi = {
    getAll: async () => {
        const response = await axiosClient.get("/missions");
        return response.data;
    },
    getMissionById: async (id: any) => {
        const response = await axiosClient.get(`/missions/${id}`);
        return response.data;
    }
}

export default missionApi;

