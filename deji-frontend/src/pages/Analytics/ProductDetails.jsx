import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";

export default function ProductDetails() {
  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/analytics/product/${id}/details`).then(res=>setItem(res.data)).catch(console.error);
  }, [id]);

  if (!item) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{item.name}</h1>
      <div className="bg-white p-4 rounded shadow">
        <p><strong>SKU:</strong> {item.sku}</p>
        <p><strong>Quantity Sold:</strong> {item.quantitySold}</p>
        <p><strong>Revenue:</strong> {item.revenue}</p>
        <p><strong>COGS:</strong> {item.cogs}</p>
        <p><strong>Other Expenses:</strong> {item.otherExpenses}</p>
        <p><strong>Net Profit:</strong> {item.netProfit}</p>
      </div>
    </div>
  );
}
