import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

export const useDashboard = () => {
  return useQuery(["dashboard"], async () => {
    const { data } = await API.get("/dashboard");
    return data;
  }, {
    staleTime: 1000 * 60 * 5, // 5 min
    retry: 1,
  });
};
