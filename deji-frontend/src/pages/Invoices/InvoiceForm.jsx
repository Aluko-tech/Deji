import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Save, X, Plus, Trash2, AlertTriangle } from "lucide-react";

export default function InvoiceForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState({
    contactId: "",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    currency: "NGN",
    taxRate: 0,
    discount: 0,
    notes: "",
    lineItems: [{ productId: "", description: "", quantity: 1, unitPrice: 0 }],
  });

  // Fetch contacts and products
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contactsRes, productsRes] = await Promise.all([
        api.get("/contacts"),
        api.get("/products"),
      ]);
      setContacts(contactsRes.data.data || []);
      setProducts(productsRes.data.data || []);
    } catch (err) {
      console.error("❌ Failed to fetch data:", err);
      setError("Failed to load contacts and products");
    } finally {
      setLoading(false);
    }
  };

  const handleContactChange = (e) => {
    setFormData({ ...formData, contactId: e.target.value });
  };

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...formData.lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };

    // If product selected, auto-fill unitPrice
    if (field === "productId" && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        newLineItems[index].unitPrice = product.price;
        newLineItems[index].description = product.name;
      }
    }

    setFormData({ ...formData, lineItems: newLineItems });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [
        ...formData.lineItems,
        { productId: "", description: "", quantity: 1, unitPrice: 0 },
      ],
    });
  };

  const removeLineItem = (index) => {
    const newLineItems = formData.lineItems.filter((_, i) => i !== index);
    setFormData({ ...formData, lineItems: newLineItems });
  };

  const calculateTotals = () => {
    const subtotal = formData.lineItems.reduce(
      (sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice) || 0),
      0
    );
    const tax = subtotal * (Number(formData.taxRate) / 100);
    const total = subtotal + tax - Number(formData.discount);
    return { subtotal, tax, total };
  };

  const { subtotal, tax, total } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.contactId) {
      setError("Please select a customer");
      return;
    }
    if (formData.lineItems.length === 0) {
      setError("Add at least one line item");
      return;
    }
    if (formData.lineItems.some((item) => !item.description || item.quantity <= 0)) {
      setError("All line items must have description and quantity > 0");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await api.post("/invoices", {
        contactId: formData.contactId,
        dueDate: new Date(formData.dueDate).toISOString(),
        currency: formData.currency,
        taxRate: Number(formData.taxRate),
        discount: Number(formData.discount),
        notes: formData.notes,
        lineItems: formData.lineItems.map((item) => ({
          productId: item.productId || null,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });

      navigate("/invoices");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create invoice");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">➕ Create Invoice</h1>
        <p className="text-gray-600 mt-1">Create a new invoice for a customer</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-600 text-red-700 rounded flex gap-3">
          <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Customer Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📋 Customer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Customer *
              </label>
              <select
                value={formData.contactId}
                onChange={handleContactChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a customer...</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} ({contact.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Due Date *
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Line Items Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">📦 Items</h2>
            <button
              type="button"
              onClick={addLineItem}
              className="bg-green-50 hover:bg-green-100 text-green-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <Plus size={18} />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {formData.lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Product (Optional)
                  </label>
                  <select
                    value={item.productId}
                    onChange={(e) =>
                      handleLineItemChange(index, "productId", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select product...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (₦{product.price.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) =>
                      handleLineItemChange(index, "description", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Qty *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      handleLineItemChange(index, "quantity", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) =>
                      handleLineItemChange(index, "unitPrice", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Total
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm font-semibold">
                    ₦{(item.quantity * item.unitPrice || 0).toLocaleString()}
                  </div>
                </div>

                <div className="md:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="w-full px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} className="mx-auto" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">💰 Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Discount (₦)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span className="font-semibold">₦{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Tax ({formData.taxRate}%):</span>
              <span className="font-semibold">₦{tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Discount:</span>
              <span className="font-semibold">-₦{Number(formData.discount).toLocaleString()}</span>
            </div>
            <div className="border-t-2 pt-3 flex justify-between text-lg">
              <span className="font-bold text-gray-900">Total:</span>
              <span className="font-bold text-blue-600">₦{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            placeholder="Add any additional notes or payment terms..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Form Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Save size={20} />
            {saving ? "Creating..." : "Create Invoice"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <X size={20} />
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
