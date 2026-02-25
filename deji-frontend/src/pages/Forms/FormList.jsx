import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, BarChart2 } from 'lucide-react';
import api from '../../services/api';

export default function FormList() {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const res = await api.get('/forms');
      setForms(res.data?.data?.data || []);
    } catch (err) {
      setError('Failed to load forms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this form?')) return;
    try {
      await api.delete(`/forms/${id}`);
      setForms(forms.filter(f => f.id !== id));
    } catch (err) {
      setError('Failed to delete form');
    }
  };

  const getFormTypeLabel = (type) => {
    const labels = {
      LEAD_CAPTURE: '📋 Lead Capture',
      CONTACT: '👤 Contact Form',
      NEWSLETTER: '📧 Newsletter',
      SURVEY: '📊 Survey',
      REGISTRATION: '🔐 Registration',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Forms</h1>
        <button
          onClick={() => navigate('/forms/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} /> Create Form
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-8">Loading forms...</div>
      ) : forms.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No forms created yet</p>
          <button
            onClick={() => navigate('/forms/new')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Create your first form
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => (
            <div
              key={form.id}
              className="bg-white border rounded-lg p-4 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{form.title}</h3>
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {getFormTypeLabel(form.formType)}
                    </span>
                    {form.isPublished ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Published
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{form.description}</p>
                  <div className="flex gap-4 mt-3 text-sm text-gray-500">
                    <span>📊 {form.viewCount} views</span>
                    <span>✓ {form.submissionCount} submissions</span>
                    <span>📝 {form.fields.length} fields</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/forms/${form.id}/analytics`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="View Analytics"
                  >
                    <BarChart2 size={18} />
                  </button>
                  <button
                    onClick={() => navigate(`/forms/${form.id}`)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => navigate(`/forms/${form.id}/submissions`)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                    title="View Submissions"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(form.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
