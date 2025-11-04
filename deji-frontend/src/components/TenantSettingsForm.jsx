import { useState, useEffect } from "react";
import axios from "axios";

export default function TenantSettingsForm() {
  const [form, setForm] = useState({
    businessName: "",
    primaryColor: "#000000",
    currency: "NGN",
  });
  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState(null);

  // Load settings on mount
  useEffect(() => {
    axios.get("/api/tenant-settings", { withCredentials: true })
      .then(res => {
        setForm(res.data);
        setPreview(res.data.logoUrl);
      })
      .catch(err => console.error("Fetch error:", err));
  }, []);

  // Handle input change
  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle logo selection
  const handleLogoChange = e => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Submit form
  const handleSubmit = async e => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(form).forEach(key => formData.append(key, form[key]));
    if (logo) formData.append("logo", logo);

    await axios.put("/api/tenant-settings", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      withCredentials: true,
    });
    alert("Settings updated successfully!");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto p-6 bg-white shadow rounded-2xl space-y-6"
    >
      <h2 className="text-xl font-semibold">Tenant Settings</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Business Name</label>
        <input
          type="text"
          name="businessName"
          value={form.businessName}
          onChange={handleChange}
          className="w-full border rounded p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Primary Color</label>
        <input
          type="color"
          name="primaryColor"
          value={form.primaryColor}
          onChange={handleChange}
          className="w-full h-10 cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Logo</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          className="block w-full text-sm text-gray-600"
        />
        {preview && (
          <img
            src={preview}
            alt="Logo Preview"
            className="w-24 h-24 rounded-lg object-cover mt-3 border"
          />
        )}
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Save Settings
      </button>
    </form>
  );
}
