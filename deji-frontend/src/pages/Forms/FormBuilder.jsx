import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Eye, Copy } from 'lucide-react';
import api from '../../services/api';

export default function FormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (id) fetchForm();
  }, [id]);

  const fetchForm = async () => {
    try {
      const res = await api.get(`/forms/${id}`);
      setForm(res.data?.data || null);
    } catch (err) {
      setError('Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForm = async () => {
    try {
      setSaving(true);
      if (id) {
        await api.put(`/forms/${id}`, form);
      } else {
        const res = await api.post('/forms', form);
        navigate(`/forms/${res.data.data.id}`);
      }
      setSuccess('Form saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = () => {
    const newField = {
      fieldName: `field_${Date.now()}`,
      label: 'New Field',
      placeholder: '',
      fieldType: 'TEXT',
      isRequired: false,
    };
    setForm({
      ...form,
      fields: [...(form?.fields || []), newField],
    });
  };

  const handleUpdateField = (index, updates) => {
    const newFields = [...form.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setForm({ ...form, fields: newFields });
  };

  const handleDeleteField = (index) => {
    const newFields = form.fields.filter((_, i) => i !== index);
    setForm({ ...form, fields: newFields });
  };

  const handlePublish = async () => {
    try {
      setSaving(true);
      await api.post(`/forms/${id}/publish`, { isPublished: !form.isPublished });
      setForm({ ...form, isPublished: !form.isPublished });
      setSuccess(`Form ${form.isPublished ? 'unpublished' : 'published'}!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to publish form');
    } finally {
      setSaving(false);
    }
  };

  const getEmbedCode = () => {
    if (!form?.id) return '';
    const tenantId = localStorage.getItem('tenantId');
    return `<iframe src="https://your-domain.com/forms/embed/${form.id}?tenant=${tenantId}" width="100%" height="600" frameborder="0"></iframe>`;
  };

  if (loading) return <div className="p-6">Loading...</div>;

  if (!form) {
    return (
      <div className="p-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold mb-6">Create New Form</h1>
          <div className="bg-white rounded-lg p-6 border">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Form Name</label>
                <input
                  type="text"
                  placeholder="Internal name (not shown to users)"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  onChange={(e) =>
                    setForm({
                      name: e.target.value,
                      title: e.target.value,
                      fields: [],
                    })
                  }
                />
              </div>
              <button
                onClick={() => form && handleSaveForm()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Form
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{form.title}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/forms/${id}/submissions`)}
              className="text-green-600 px-4 py-2 rounded-lg border border-green-600 hover:bg-green-50"
            >
              View Submissions
            </button>
            <button
              onClick={handlePublish}
              className={`px-4 py-2 rounded-lg text-white ${
                form.isPublished
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {form.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button
              onClick={handleSaveForm}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

        <div className="bg-white rounded-lg p-6 border mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Form Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional form description"
                rows="2"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Success Message</label>
              <input
                type="text"
                value={form.successMessage}
                onChange={(e) => setForm({ ...form, successMessage: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Form Fields</h2>
            <button
              onClick={handleAddField}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={18} /> Add Field
            </button>
          </div>

          <div className="space-y-4">
            {form.fields.map((field, index) => (
              <div key={index} className="border p-4 rounded-lg bg-gray-50">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Label</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                      className="w-full p-2 border rounded mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Field Type</label>
                    <select
                      value={field.fieldType}
                      onChange={(e) => handleUpdateField(index, { fieldType: e.target.value })}
                      className="w-full p-2 border rounded mt-1"
                    >
                      <option>TEXT</option>
                      <option>EMAIL</option>
                      <option>PHONE</option>
                      <option>NUMBER</option>
                      <option>TEXTAREA</option>
                      <option>SELECT</option>
                      <option>CHECKBOX</option>
                      <option>RADIO</option>
                      <option>DATE</option>
                      <option>FILE</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-sm font-medium">Placeholder</label>
                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={(e) => handleUpdateField(index, { placeholder: e.target.value })}
                    className="w-full p-2 border rounded mt-1"
                  />
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.isRequired}
                      onChange={(e) => handleUpdateField(index, { isRequired: e.target.checked })}
                    />
                    <span className="text-sm">Required</span>
                  </label>
                  <button
                    onClick={() => handleDeleteField(index)}
                    className="text-red-600 hover:text-red-700 ml-auto"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {id && (
          <div className="bg-white rounded-lg p-6 border mt-6">
            <h3 className="font-semibold mb-3">Embed Code</h3>
            <textarea
              readOnly
              value={getEmbedCode()}
              className="w-full p-3 border rounded-lg bg-gray-50 font-mono text-sm"
              rows="3"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(getEmbedCode());
                setSuccess('Embed code copied!');
              }}
              className="mt-2 text-blue-600 hover:underline text-sm flex items-center gap-1"
            >
              <Copy size={16} /> Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
