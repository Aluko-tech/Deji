import { useEffect, useState } from "react";
import api from "../../services/api";
import { Link } from "react-router-dom";

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    api.get("/invoices")
      .then(res => setInvoices(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Link to="/invoices/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Invoice</Link>
      </div>
      <table className="w-full border-collapse bg-white shadow rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Invoice #</th>
            <th className="p-2 text-left">Client</th>
            <th className="p-2 text-left">Amount</th>
            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv.id} className="border-t">
              <td className="p-2">{inv.id}</td>
              <td className="p-2">{inv.clientName}</td>
              <td className="p-2">${inv.amount}</td>
              <td className="p-2">{inv.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
