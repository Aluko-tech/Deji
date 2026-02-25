import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

export default function FormEmbed() {
  const { tenantId, formId } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchForm();
  }, [tenantId, formId]);

  const fetchForm = async () => {
    try {
      // Public endpoint to fetch published form
      const res = await api.get(`/forms/${formId}`);
      if (res.data?.data?.isPublished) {
        setForm(res.data.data);
        // Initialize form data
        const initial = {};
        res.data.data.fields.forEach((field) => {
          initial[field.fieldName] = '';
        });
        setFormData(initial);
      }
    } catch (err) {
      console.error('Failed to load form:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    form.fields.forEach((field) => {
      if (field.isRequired && !formData[field.fieldName]) {
        newErrors[field.fieldName] = `${field.label} is required`;
      }
      if (field.fieldType === 'EMAIL' && formData[field.fieldName]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.fieldName])) {
          newErrors[field.fieldName] = 'Invalid email address';
        }
      }
    });
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        data: formData,
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
      };
      await api.post(`/forms/${tenantId}/${formId}/submit`, payload);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({});
        form.fields.forEach((field) => {
          formData[field.fieldName] = '';
        });
      }, 3000);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Failed to submit form' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Loading form...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Form not found or not published</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-md p-8">
        {/* Form Title */}
        {form.title && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
            {form.description && <p className="text-gray-600 mt-2">{form.description}</p>}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            ✓ {form.successMessage || 'Thank you for your submission!'}
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.submit}
          </div>
        )}

        {/* Form Fields */}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {form.fields.map((field) => (
              <div key={field.fieldName}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.isRequired && <span className="text-red-600">*</span>}
                </label>

                {field.fieldType === 'TEXT' && (
                  <input
                    type="text"
                    value={formData[field.fieldName] || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.fieldName]: e.target.value })
                    }
                    placeholder={field.placeholder}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[field.fieldName] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                )}

                {field.fieldType === 'EMAIL' && (
                  <input
                    type="email"
                    value={formData[field.fieldName] || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.fieldName]: e.target.value })
                    }
                    placeholder={field.placeholder}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[field.fieldName] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                )}

                {field.fieldType === 'PHONE' && (
                  <input
                    type="tel"
                    value={formData[field.fieldName] || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.fieldName]: e.target.value })
                    }
                    placeholder={field.placeholder}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[field.fieldName] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                )}

                {field.fieldType === 'TEXTAREA' && (
                  <textarea
                    value={formData[field.fieldName] || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.fieldName]: e.target.value })
                    }
                    placeholder={field.placeholder}
                    rows="4"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[field.fieldName] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                )}

                {field.fieldType === 'SELECT' && (
                  <select
                    value={formData[field.fieldName] || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.fieldName]: e.target.value })
                    }
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[field.fieldName] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">{field.placeholder || 'Select an option'}</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {field.fieldType === 'CHECKBOX' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData[field.fieldName] === true}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.fieldName]: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">{field.placeholder || 'Check this box'}</span>
                  </label>
                )}

                {errors[field.fieldName] && (
                  <p className="text-red-600 text-sm mt-1">{errors[field.fieldName]}</p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
