import { useEffect, useState } from "react";
import api from "../../services/api";

export default function LedgerList() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    api.get("/ledger")
      .then(res => setEntries(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Ledger</h1>
      <table className="w-full border-collapse bg-white shadow rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-left">Debit</th>
            <th className="p-2 text-left">Credit</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id} className="border-t">
              <td className="p-2">{new Date(entry.date).toLocaleDateString()}</td>
              <td className="p-2">{entry.description}</td>
              <td className="p-2">{entry.debit}</td>
              <td className="p-2">{entry.credit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
