import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Trash2, Edit, Plus, AlertTriangle, Star } from "lucide-react";

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all, inStock, lowStock

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/products", {
        params: { search, take: 100 },
      });
      setProducts(response.data.data || []);
    } catch (err) {
      console.error("❌ Failed to fetch products:", err);
      setError(err.response?.data?.error || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle product deletion
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await api.delete(`/products/${id}`);
      setSuccessMsg("Product deleted successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete product");
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (filter === "lowStock") return p.stock <= (p.lowStockThreshold || 5);
    if (filter === "inStock") return p.stock > 0;
    return true;
  });

  // Get stock status badge
  const getStockStatus = (product) => {
    if (product.stock <= (product.lowStockThreshold || 5)) {
      return { label: "Low Stock", color: "bg-red-100 text-red-800", icon: AlertTriangle };
    }
    if (product.stock === 0) {
      return { label: "Out of Stock", color: "bg-gray-100 text-gray-800", icon: AlertTriangle };
    }
    return { label: "In Stock", color: "bg-green-100 text-green-800", icon: Star };
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">📦 Products</h1>
            <p className="text-gray-600 mt-1">Manage your product inventory</p>
          </div>
          <button
            onClick={() => navigate("/products/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="mb-4 p-4 bg-green-100 border-l-4 border-green-600 text-green-700 rounded">
          ✅ {successMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-600 text-red-700 rounded">
          ❌ {error}
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="🔍 Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Products</option>
          <option value="inStock">In Stock</option>
          <option value="lowStock">Low Stock</option>
        </select>
        <div className="text-gray-600 text-sm pt-3">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading products...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProducts.length === 0 && !search && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg mb-4">No products yet</p>
          <button
            onClick={() => navigate("/products/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Create your first product
          </button>
        </div>
      )}

      {/* Products Grid */}
      {!loading && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const status = getStockStatus(product);
            const StatusIcon = status.icon;
            return (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  {/* Product Info */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-2">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>

                  {/* Type and Unit */}
                  <div className="mb-4 flex gap-2">
                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded capitalize">
                      {product.type || "product"}
                    </span>
                    {product.unit && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {product.unit}
                      </span>
                    )}
                  </div>

                  {/* Price and Stock */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                    <div>
                      <p className="text-gray-600 text-sm">Price</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ₦{(product.price || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Stock</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {product.stock || 0}
                      </p>
                    </div>
                  </div>

                  {/* Stock Status */}
                  <div className="mb-4">
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${status.color}`}>
                      <StatusIcon size={16} />
                      {status.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/products/${product.id}/edit`)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Edit size={18} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty search state */}
      {!loading && filteredProducts.length === 0 && search && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">No products match "{search}"</p>
          <button
            onClick={() => setSearch("")}
            className="text-blue-600 hover:text-blue-700 mt-2 underline"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
