import { useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/contacts", { name, email, phone });
      navigate("/contacts");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 shadow rounded">
      <h1 className="text-2xl font-bold mb-4">Add Contact</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="Name" className="w-full p-2 border rounded" value={name} onChange={e => setName(e.target.value)} />
        <input type="email" placeholder="Email" className="w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="text" placeholder="Phone" className="w-full p-2 border rounded" value={phone} onChange={e => setPhone(e.target.value)} />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save</button>
      </form>
    </div>
  );
}
