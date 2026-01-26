import axiosClient from './axiosClient';

export interface RegisterPayload {
  email: string;
  password: string;
  fullName?: string; 
  role?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserData {
  _id: string;
  email: string;
  role: string;
  profile: {          
    fullName: string;
  };
}

const authApi ={
    register: (data: RegisterPayload) =>{
        return axiosClient.post('/auth/register', data);
    },

    login: (data: LoginPayload) =>{
        return axiosClient.post('/auth/login', data);
    }
}
export default authApi;