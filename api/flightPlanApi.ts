import axiosClient from './axiosClient';

const flightPlanApi = {
    getAll: async () => {
        const response = await axiosClient.get("/flight-plans");
        return response.data;
    },
    getById: async (id: any) => {
        const response = await axiosClient.get(`/flight-plans/${id}`);
        return response.data;
    },
    create: async (data: any) => {
        const response = await axiosClient.post("/flight-plans", data);
        return response.data;
    },
    update: async (id: any, data: any) => {
        const response = await axiosClient.put(`/flight-plans/${id}`, data);
        return response.data;
    },
    delete: async (id: any) => {
        const response = await axiosClient.delete(`/flight-plans/${id}`);
        return response.data;
    },
    submit: async (id: any) => {
        const response = await axiosClient.post(`/flight-plans/${id}/submit`);
        return response.data;
    },
    cancel: async (id: any) => {
        const response = await axiosClient.post(`/flight-plans/${id}/cancel`);
        return response.data;
    },
    getConflicts: async (id: any) => {
        const response = await axiosClient.get(`/flight-plans/${id}/conflicts`);
        return response.data;
    }
}

export default flightPlanApi;
