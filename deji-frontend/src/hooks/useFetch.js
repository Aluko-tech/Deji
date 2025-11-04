import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

export default function useFetch(endpoint, options = {}) {
  const {
    method = "get",
    params = {},
    body = null,
    initialData = null,
    enabled = true,
    skip = false,
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (override = {}) => {
    if (!enabled || skip || !endpoint) return;

    setLoading(true);
    setError("");

    const controller = new AbortController();

    try {
      const res = await api.request({
        url: endpoint,
        method,
        signal: controller.signal,
        ...override,
        ...(body ? { data: body } : {}),
        ...(params ? { params } : {}),
      });

      setData(res.data);
    } catch (err) {
      if (err.name === "CanceledError") return;
      console.error(`❌ Failed to fetch ${endpoint}:`, {
        message: err.message,
        status: err.response?.status,
        response: err.response?.data,
      });
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [endpoint, method, enabled, skip]); // ✅ params/body removed from deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
