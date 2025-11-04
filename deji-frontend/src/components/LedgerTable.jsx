export default function LedgerTable({ data }) {
  if (!data?.length) return <p className="text-gray-500">No ledger entries found.</p>;

  return (
    <div className="overflow-x-auto mt-2">
      <table className="min-w-full text-sm text-left border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Date</th>
            <th className="p-2">Description</th>
            <th className="p-2">Debit</th>
            <th className="p-2">Credit</th>
            <th className="p-2">Balance</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i} className="border-t hover:bg-gray-50">
              <td className="p-2">{new Date(item.date).toLocaleDateString()}</td>
              <td className="p-2">{item.description}</td>
              <td className="p-2 text-red-500">{item.debit || "-"}</td>
              <td className="p-2 text-green-600">{item.credit || "-"}</td>
              <td className="p-2">{item.balance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
