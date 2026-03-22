import axiosClient from "./axiosClient";

const FavouriteApi = {
    get: (userId?: string) => {
        return axiosClient.get("/favourite", { params: { user_id: userId } });
    },
    create: (data: any) => {
        return axiosClient.post("/favourite/add", data);
    },
}

export default FavouriteApi;