import { useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function InvoiceForm() {
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("unpaid");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/invoices", { clientName, amount, status });
      navigate("/invoices");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 shadow rounded">
      <h1 className="text-2xl font-bold mb-4">Add Invoice</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="Client Name" className="w-full p-2 border rounded" value={clientName} onChange={e => setClientName(e.target.value)} />
        <input type="number" placeholder="Amount" className="w-full p-2 border rounded" value={amount} onChange={e => setAmount(e.target.value)} />
        <select className="w-full p-2 border rounded" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
        </select>
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save</button>
      </form>
    </div>
  );
}
