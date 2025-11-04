import { useEffect, useState } from "react";
import api from "../../services/api";

export default function StockList() {
  const [stock, setStock] = useState([]);

  useEffect(() => {
    api.get("/inventory")
      .then(res => setStock(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Inventory Stock</h1>
      <table className="w-full border-collapse bg-white shadow rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Product</th>
            <th className="p-2 text-left">Stock</th>
          </tr>
        </thead>
        <tbody>
          {stock.map(item => (
            <tr key={item.id} className="border-t">
              <td className="p-2">{item.productName}</td>
              <td className="p-2">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
