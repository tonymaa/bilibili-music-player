import axios from 'axios';
import { ApiResponse } from '@shared/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;

// 通用请求方法
export async function get<T>(url: string, params?: object): Promise<ApiResponse<T>> {
  const res = await api.get(url, { params });
  return res.data;
}

export async function post<T>(url: string, data?: object): Promise<ApiResponse<T>> {
  const res = await api.post(url, data);
  return res.data;
}

export async function put<T>(url: string, data?: object): Promise<ApiResponse<T>> {
  const res = await api.put(url, data);
  return res.data;
}

export async function del<T>(url: string, data?: object): Promise<ApiResponse<T>> {
  const res = await api.delete(url, { data });
  return res.data;
}
