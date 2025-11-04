import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getTenantSettings = async () => {
  const res = await axios.get(`${API_URL}/tenant/settings`);
  return res.data;
};
