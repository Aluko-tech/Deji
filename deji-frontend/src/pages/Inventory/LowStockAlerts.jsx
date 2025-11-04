import { useEffect, useState } from "react";
import api from "../../services/api";

export default function LowStockAlerts() {
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    api.get("/inventory/low-stock")
      .then(res => setLowStock(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Low Stock Alerts</h1>
      {lowStock.length === 0 ? (
        <p className="text-green-600 font-semibold">All products are sufficiently stocked.</p>
      ) : (
        <table className="w-full border-collapse bg-white shadow rounded">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-left">Stock</th>
            </tr>
          </thead>
          <tbody>
            {lowStock.map(item => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.productName}</td>
                <td className="p-2">{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
