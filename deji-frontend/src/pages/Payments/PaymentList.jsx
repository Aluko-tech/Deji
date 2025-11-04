import { useEffect, useState } from "react";
import api from "../../services/api";
import { Link } from "react-router-dom";

export default function PaymentList() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    api.get("/payments")
      .then(res => setPayments(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Link to="/payments/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Payment</Link>
      </div>
      <table className="w-full border-collapse bg-white shadow rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Payment ID</th>
            <th className="p-2 text-left">Invoice #</th>
            <th className="p-2 text-left">Amount</th>
            <th className="p-2 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.id}</td>
              <td className="p-2">{p.invoiceId}</td>
              <td className="p-2">${p.amount}</td>
              <td className="p-2">{new Date(p.date).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
