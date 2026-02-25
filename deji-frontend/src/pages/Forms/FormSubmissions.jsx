import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Eye, Inbox } from 'lucide-react';
import api from '../../services/api';

export default function FormSubmissions() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    fetchData();
  }, [formId]);

  const fetchData = async () => {
    try {
      const [formRes, submissionsRes] = await Promise.all([
        api.get(`/forms/${formId}`),
        api.get(`/forms/${formId}/submissions`),
      ]);
      setForm(formRes.data?.data);
      setSubmissions(submissionsRes.data?.data?.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (submissionId) => {
    try {
      await api.patch(`/forms/submissions/${submissionId}/read`);
      setSubmissions(
        submissions.map((s) => (s.id === submissionId ? { ...s, isRead: true } : s))
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleExportCSV = () => {
    if (!submissions.length) return;

    const headers = ['Submitted At', 'Email', 'Phone', 'Name', ...form.fields.map(f => f.label)];
    const rows = submissions.map((sub) => [
      new Date(sub.createdAt).toLocaleString(),
      sub.email || '',
      sub.phone || '',
      sub.name || '',
      ...form.fields.map(f => sub.data[f.fieldName] || ''),
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.name}_submissions.csv`;
    a.click();
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => navigate(`/forms/${formId}`)}
              className="text-blue-600 text-sm hover:underline mb-2"
            >
              ← Back to Form
            </button>
            <h1 className="text-3xl font-bold">{form?.title}</h1>
            <p className="text-gray-600">
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download size={18} /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-gray-600 text-sm">Total Submissions</p>
            <p className="text-3xl font-bold">{submissions.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-gray-600 text-sm">Unread</p>
            <p className="text-3xl font-bold">{submissions.filter(s => !s.isRead).length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-gray-600 text-sm">Conversion Rate</p>
            <p className="text-3xl font-bold">
              {form?.viewCount > 0 ? ((submissions.length / form.viewCount) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>

        {selectedSubmission ? (
          <div className="bg-white rounded-lg border p-6">
            <button
              onClick={() => setSelectedSubmission(null)}
              className="text-blue-600 text-sm mb-4 hover:underline"
            >
              ← Back to List
            </button>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Submitted: {new Date(selectedSubmission.createdAt).toLocaleString()}</p>
                <p className="text-sm text-gray-600">Email: {selectedSubmission.email || 'N/A'}</p>
                <p className="text-sm text-gray-600">Phone: {selectedSubmission.phone || 'N/A'}</p>
              </div>
              {Object.entries(selectedSubmission.data).map(([key, value]) => (
                <div key={key}>
                  <p className="font-medium text-sm text-gray-700">
                    {form.fields.find(f => f.fieldName === key)?.label || key}
                  </p>
                  <p className="text-sm text-gray-900 mt-1">{String(value)}</p>
                </div>
              ))}
              {!selectedSubmission.isRead && (
                <button
                  onClick={() => handleMarkAsRead(selectedSubmission.id)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Mark as Read
                </button>
              )}
            </div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <Inbox size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No submissions yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Submitted</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className={`border-b hover:bg-gray-50 ${
                        !submission.isRead ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm">
                        {new Date(submission.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">{submission.email || '-'}</td>
                      <td className="px-4 py-3 text-sm">{submission.name || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {submission.isRead ? (
                          <span className="text-green-600">Read</span>
                        ) : (
                          <span className="text-orange-600 font-medium">Unread</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedSubmission(submission);
                            if (!submission.isRead) handleMarkAsRead(submission.id);
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
