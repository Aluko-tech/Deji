"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { getStaff } from "@/lib/api";

const StaffContext = createContext({ staff: [], loading: true });

export function StaffProvider({ children }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStaff()
      .then(res => {
        const data = res.data?.data || res.data || [];
        setStaff(Array.isArray(data) ? data : []);
      })
      .catch(() => setStaff([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StaffContext.Provider value={{ staff, loading }}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  return useContext(StaffContext);
}
