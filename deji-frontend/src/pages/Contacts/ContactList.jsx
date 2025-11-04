import { useEffect, useState } from "react";
import api from "../../services/api";
import { Link } from "react-router-dom";

export default function ContactList() {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    api.get("/contacts")
      .then(res => setContacts(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Link to="/contacts/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Contact</Link>
      </div>
      <table className="w-full border-collapse bg-white shadow rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Phone</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map(c => (
            <tr key={c.id} className="border-t">
              <td className="p-2">{c.name}</td>
              <td className="p-2">{c.email}</td>
              <td className="p-2">{c.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
