import React, { useEffect, useState } from "react";
import api from "../../services/api";
import DateRangePicker from "../../components/Analytics/DateRangePicker";
import ProfitTable from "../../components/Analytics/ProfitTable";
import ProfitChart from "../../components/Analytics/ProfitChart";
import { t } from "../../i18n";

export default function ProductProfitability() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [range, setRange] = useState({ start: null, end: null });
  const pageSize = 50;

  useEffect(() => {
    fetchData();
  }, [range, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
      };
      if (range.start) params.start = range.start;
      if (range.end) params.end = range.end;

      const res = await api.get("/analytics/product-profitability", { params });
      setData(res.data?.data || []);
    } catch (e) {
      console.error("Failed to load analytics:", e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1) {
      setPage(newPage);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t("analytics.title")}</h1>
        <p className="text-gray-600">Analyze product profitability: revenue, costs, expenses, and margins.</p>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <DateRangePicker onChange={(s, e) => { setRange({ start: s, end: e }); setPage(1); }} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        <ProfitChart data={data} />
      </div>

      {/* Table */}
      <ProfitTable
        loading={loading}
        rows={data}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
