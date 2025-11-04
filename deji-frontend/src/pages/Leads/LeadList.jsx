import { Link } from "react-router-dom";
import useFetch from "../../hooks/useFetch";

export default function LeadList() {
  const { data: leads, loading, error } = useFetch("/leads", { initialData: [] });

  if (loading) return <p>Loading leads...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Link
          to="/leads/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Lead
        </Link>
      </div>
      {leads.length === 0 ? (
        <p>No leads found.</p>
      ) : (
        <table className="w-full border-collapse bg-white shadow rounded">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Phone</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-2">{l.name}</td>
                <td className="p-2">{l.email}</td>
                <td className="p-2">{l.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
