"use client";
import { useStaff } from "@/lib/staffContext";

export default function StaffSelect({ value, onChange, placeholder = "Select staff...", className = "", required = false }) {
  const { staff, loading } = useStaff();

  return (
    <select value={value} onChange={onChange} className={`deji-input ${className}`} required={required}>
      <option value="">{loading ? "Loading staff..." : placeholder}</option>
      {staff.map(s => (
        <option key={s.id} value={s.email}>
          {s.email} ({s.role})
        </option>
      ))}
    </select>
  );
}
