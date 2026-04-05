import axiosClient from './axiosClient';
const zoneApi = {
  getAll: (params: any) => {
    return axiosClient.get('/zones', { params }); 
  },
    //Lấy chi tiết zone
  getById: (id: string) => {
    return axiosClient.get(`/zones/${id}`);
  }
}
export default zoneApi;