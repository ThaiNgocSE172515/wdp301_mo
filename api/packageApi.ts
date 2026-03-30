import axiosClient from "./axiosClient";
const PackageApi = {
    getById: async (id: string) => {
        const rs = await axiosClient.get(`/packages/${id}`);
        return rs.data.data;
    }
}
export default PackageApi;