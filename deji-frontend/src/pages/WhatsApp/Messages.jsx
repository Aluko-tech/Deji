import useFetch from "../../hooks/useFetch";

export default function Messages() {
  const { data: messages, loading, error } = useFetch("/whatsapp/messages", { initialData: [] });

  if (loading) return <p>Loading messages...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">WhatsApp Messages</h1>
      {messages.length === 0 ? (
        <p>No messages found.</p>
      ) : (
        <table className="w-full border-collapse bg-white shadow rounded">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">From</th>
              <th className="p-2 text-left">To</th>
              <th className="p-2 text-left">Message</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="p-2">{m.from}</td>
                <td className="p-2">{m.to}</td>
                <td className="p-2">{m.content}</td>
                <td className="p-2">{m.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
