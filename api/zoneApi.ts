import axiosClient from './axiosClient';

const zoneApi = {
  getAll: (params: any) => {
    return axiosClient.get('/zones', { params }); 
  }
}

export default zoneApi;