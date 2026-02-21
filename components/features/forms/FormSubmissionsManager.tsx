'use client';

import { useState, useEffect } from 'react';
import {
  getFormSubmissions,
  updateSubmissionStatus,
  deleteSubmission,
  exportSubmissionsAsCSV,
} from '@/app/actions/forms';

interface SubmissionFile {
  id: string;
  originalName: string;
  storageName: string;
  size: number;
  uploadedAt: string;
}

interface FormSubmission {
  id: string;
  email?: string;
  submitBy?: string;
  data: Record<string, any>;
  status: string;
  notes?: string;
  createdAt: string;
  files: SubmissionFile[];
}

interface FormSubmissionsManagerProps {
  formId: string;
  formTitle: string;
}

export default function FormSubmissionsManager({
  formId,
  formTitle,
}: FormSubmissionsManagerProps) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const data = await getFormSubmissions(formId);
      setSubmissions(data);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to load submissions',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load submissions on component mount
  useEffect(() => {
    loadSubmissions();
  }, [formId]);

  const handleStatusUpdate = async (
    submissionId: string,
    newStatus: string,
    notes?: string
  ) => {
    try {
      const result = await updateSubmissionStatus(submissionId, newStatus, notes);
      if (result.success) {
        setSubmissions(prev =>
          prev.map(sub =>
            sub.id === submissionId
              ? { ...sub, status: newStatus, notes: notes || sub.notes }
              : sub
          )
        );
        setMessage({
          type: 'success',
          text: 'Submission status updated',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to update status',
      });
    }
  };

  const handleDelete = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;

    try {
      const result = await deleteSubmission(submissionId);
      if (result.success) {
        setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
        setSelectedSubmission(null);
        setMessage({
          type: 'success',
          text: 'Submission deleted',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to delete submission',
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      const result = await exportSubmissionsAsCSV(formId);
      if (result.success) {
        // Create blob and download
        const blob = new Blob([result.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        a.click();
        window.URL.revokeObjectURL(url);
        setMessage({
          type: 'success',
          text: 'CSV exported successfully',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to export CSV',
      });
    }
  };

  const filteredSubmissions =
    statusFilter === 'all'
      ? submissions
      : submissions.filter(sub => sub.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{formTitle}</h2>
          <p className="text-gray-600 text-sm mt-1">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="space-x-3">
          <button
            onClick={loadSubmissions}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={submissions.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2">
        {['all', 'submitted', 'reviewing', 'approved', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          No submissions found
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSubmissions.map(submission => (
            <div
              key={submission.id}
              className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedSubmission(submission)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {submission.email || submission.submitBy || 'Guest'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(submission.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      submission.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : submission.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : submission.status === 'reviewing'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {submission.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail View Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Submission Details
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedSubmission.email || selectedSubmission.submitBy || 'Guest'}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Submission Data */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Form Data</h4>
                <div className="space-y-3">
                  {Object.entries(selectedSubmission.data).map(([key, value]) => (
                    <div key={key} className="border-b border-gray-100 pb-3">
                      <p className="text-sm text-gray-600 font-medium">{key}</p>
                      <p className="text-sm text-gray-900 mt-1">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Files */}
              {selectedSubmission.files.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Attached Files
                  </h4>
                  <div className="space-y-2">
                    {selectedSubmission.files.map(file => (
                      <a
                        key={file.id}
                        href={`/uploads/forms/${file.storageName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        📎 {file.originalName} ({(file.size / 1024).toFixed(2)} KB)
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Update */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Update Status</h4>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {['submitted', 'reviewing', 'approved', 'rejected'].map(
                      status => (
                        <button
                          key={status}
                          onClick={() =>
                            handleStatusUpdate(selectedSubmission.id, status)
                          }
                          className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                            selectedSubmission.status === status
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {status}
                        </button>
                      )
                    )}
                  </div>
                  <textarea
                    value={selectedSubmission.notes || ''}
                    onChange={(e) =>
                      setSelectedSubmission({
                        ...selectedSubmission,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Add notes about this submission..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    rows={3}
                  />
                  <button
                    onClick={() =>
                      handleStatusUpdate(
                        selectedSubmission.id,
                        selectedSubmission.status,
                        selectedSubmission.notes
                      )
                    }
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Save Status & Notes
                  </button>
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(selectedSubmission.id)}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Delete Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
