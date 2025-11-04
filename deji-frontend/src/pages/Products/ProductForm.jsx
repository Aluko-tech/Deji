import { useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function ProductForm() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/products", { name, price, stock });
      navigate("/products");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 shadow rounded">
      <h1 className="text-2xl font-bold mb-4">Add Product</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="Name" className="w-full p-2 border rounded" value={name} onChange={e => setName(e.target.value)} />
        <input type="number" placeholder="Price" className="w-full p-2 border rounded" value={price} onChange={e => setPrice(e.target.value)} />
        <input type="number" placeholder="Stock" className="w-full p-2 border rounded" value={stock} onChange={e => setStock(e.target.value)} />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save</button>
      </form>
    </div>
  );
}
