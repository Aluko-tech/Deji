import React, { useState } from "react";
import { CalendarDays } from "lucide-react";
import { t } from "../../i18n";

export default function DateRangePicker({ onChange }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const apply = () => {
    onChange && onChange(start || null, end || null);
  };

  const presets = [
    {
      label: "Today",
      start: new Date().toISOString().split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
    {
      label: "Last 7 days",
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
    {
      label: "Last 30 days",
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
    {
      label: "This month",
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
  ];

  const applyPreset = (preset) => {
    setStart(preset.start);
    setEnd(preset.end);
    onChange && onChange(preset.start, preset.end);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-5 h-5 text-gray-600" />
        <span className="font-semibold">Date Range</span>
      </div>

      <div className="flex flex-col md:flex-row items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={apply}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium whitespace-nowrap"
        >
          {t("analytics.apply")}
        </button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mt-3">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => applyPreset(preset)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
