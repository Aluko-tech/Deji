// src/pages/Settings.jsx
import { useState, useEffect } from "react";
import useFetch from "../hooks/useFetch";
import api, { uploadLogo, updateTenantSettings } from "../services/api";

export default function Settings() {
  const { data: initialSettings, loading, error, refetch } = useFetch(
    "/tenant-settings",
    { initialData: {} }
  );

  const [settings, setSettings] = useState(initialSettings || {});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [activeTab, setActiveTab] = useState("business");
  const [previewColor, setPreviewColor] = useState("#000000");
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      setPreviewColor(initialSettings.primaryColor || "#000000");
      setLogoPreview(initialSettings.logoUrl || null);
    }
  }, [initialSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // show immediate preview from local file
    const url = URL.createObjectURL(file);
    setLogoPreview(url);

    // upload to backend
    uploadLogoFile(file);
  };

  const uploadLogoFile = async (file) => {
    setUploadingLogo(true);
    setSaveError("");
    try {
      const formData = new FormData();
      formData.append("file", file); // backend expects "file"
      const res = await uploadLogo(formData); // uses api.post('/uploads/logo')
      const url = res.data?.url;
      if (url) {
        setSettings((prev) => ({ ...prev, logoUrl: url }));
        setSuccessMessage("Logo uploaded successfully.");
        // revoke object URL if we used it earlier (optional)
        // we keep preview as the uploaded URL
        setLogoPreview(url);
        setTimeout(() => setSuccessMessage(""), 2500);
      } else {
        setSaveError("Upload did not return a URL.");
      }
    } catch (err) {
      console.error("Logo upload error:", err?.response?.data || err.message);
      setSaveError("Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      // prepare payload — remove any preview-only fields
      const payload = {
        businessName: settings.businessName ?? null,
        logoUrl: settings.logoUrl ?? null,
        primaryColor: settings.primaryColor ?? null,
        currency: settings.currency ?? null,
        language: settings.language ?? null,
        timezone: settings.timezone ?? null,
        invoicePrefix: settings.invoicePrefix ?? null,
        invoiceStart: settings.invoiceStart ?? null,
        invoiceNote: settings.invoiceNote ?? null,
        invoiceDueDays: settings.invoiceDueDays ?? null,
        taxRate: settings.taxRate ?? null,
        notifyByEmail: settings.notifyByEmail ?? false,
        notifyByWhatsApp: settings.notifyByWhatsApp ?? false,
        phoneNumber: settings.phoneNumber ?? null,
        emailAddress: settings.emailAddress ?? null,
        address: settings.address ?? null,
        website: settings.website ?? null,
      };

      await updateTenantSettings(payload);
      setSuccessMessage("Settings saved successfully.");
      refetch();
      setTimeout(() => setSuccessMessage(""), 2500);
    } catch (err) {
      console.error("Save settings error:", err?.response?.data || err.message);
      setSaveError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "business", label: "Business Info" },
    { id: "invoice", label: "Invoice Defaults" },
    { id: "notifications", label: "Notifications" },
    { id: "theme", label: "Branding" },
  ];

  if (loading) return <p>Loading settings...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-6 mt-8">
      <h1 className="text-2xl font-bold mb-4">Tenant Settings</h1>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-t-lg ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "business" && (
        <div className="space-y-4">
          <input
            name="businessName"
            placeholder="Business Name"
            value={settings.businessName || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
          <input
            name="emailAddress"
            placeholder="Email Address"
            value={settings.emailAddress || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
          <input
            name="phoneNumber"
            placeholder="Phone Number"
            value={settings.phoneNumber || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
          <div>
            <label className="block font-medium mb-1">Logo</label>

            {logoPreview && (
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-16 mb-2 rounded shadow object-contain"
              />
            )}

            <div className="flex items-center space-x-3">
              <input
                id="logo-file"
                type="file"
                accept="image/*"
                onChange={handleLogoFileSelect}
              />
              {uploadingLogo && <span className="text-sm">Uploading...</span>}
            </div>
          </div>
        </div>
      )}

      {activeTab === "invoice" && (
        <div className="space-y-4">
          <input
            name="invoicePrefix"
            placeholder="Invoice Prefix (e.g. INV-)"
            value={settings.invoicePrefix || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
          <input
            type="number"
            name="invoiceStart"
            placeholder="Starting Invoice Number"
            value={settings.invoiceStart || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
          <input
            type="number"
            name="taxRate"
            placeholder="Tax Rate (%)"
            value={settings.taxRate || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
          <input
            name="currency"
            placeholder="Currency (e.g. NGN, USD)"
            value={settings.currency || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="notifyByEmail"
              checked={!!settings.notifyByEmail}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, notifyByEmail: e.target.checked }))
              }
            />
            <span>Email Notifications</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="notifyByWhatsApp"
              checked={!!settings.notifyByWhatsApp}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, notifyByWhatsApp: e.target.checked }))
              }
            />
            <span>WhatsApp Notifications</span>
          </label>
        </div>
      )}

      {activeTab === "theme" && (
        <div className="space-y-4">
          <label className="block font-medium">Primary Color</label>
          <input
            type="color"
            name="primaryColor"
            value={settings.primaryColor || previewColor}
            onChange={(e) => {
              const color = e.target.value;
              setPreviewColor(color);
              setSettings((prev) => ({ ...prev, primaryColor: color }));
            }}
            className="w-16 h-10 border rounded"
          />

          <div
            className="p-3 rounded text-center text-white"
            style={{ backgroundColor: settings.primaryColor || previewColor }}
          >
            Live color preview
          </div>

          <label className="block font-medium">Language</label>
          <select
            name="language"
            value={settings.language || "en"}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
            <option value="ar">العربية</option>
          </select>

          <input
            name="timezone"
            placeholder="Timezone (e.g. Africa/Lagos)"
            value={settings.timezone || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>
      )}

      {saveError && <p className="text-red-500 mt-3">{saveError}</p>}
      {successMessage && <p className="text-green-600 mt-3">{successMessage}</p>}

      <div className="mt-6 text-right">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
