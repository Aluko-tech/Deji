import { useEffect, useState } from 'react';
import axios from 'axios';

export default function TenantSettings() {
  const [settings, setSettings] = useState({
    theme: '',
    language: '',
    currency: '',
    notificationsEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data } = await axios.get('/tenant-settings', {
          withCredentials: true,
        });
        setSettings(data);
      } catch (error) {
        console.error('Failed to load settings', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { data } = await axios.put('/tenant-settings', settings, {
        withCredentials: true,
      });
      setSettings(data);
      setMessage('✅ Settings updated successfully!');
    } catch (error) {
      setMessage('❌ Failed to update settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-40">
        <p className="text-gray-500 text-lg">Loading tenant settings...</p>
      </div>
    );

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900">Tenant Settings</h1>

      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message}
        </div>
      )}

      <div className="space-y-5">
        {/* Theme */}
        <div>
          <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">
            Theme
          </label>
          <select
            id="theme"
            name="theme"
            value={settings.theme}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select theme</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        {/* Language */}
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
            Language
          </label>
          <select
            id="language"
            name="language"
            value={settings.language}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select language</option>
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
          </select>
        </div>

        {/* Currency */}
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            value={settings.currency}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select currency</option>
            <option value="USD">USD</option>
            <option value="EUR">Euro</option>
            <option value="GBP">Pound</option>
          </select>
        </div>

        {/* Notifications */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="notificationsEnabled"
            name="notificationsEnabled"
            checked={settings.notificationsEnabled}
            onChange={handleChange}
            className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="notificationsEnabled" className="text-sm font-medium text-gray-700">
            Enable Notifications
          </label>
        </div>
      </div>

      <button
        onClick={saveSettings}
        disabled={saving}
        className="mt-6 w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
