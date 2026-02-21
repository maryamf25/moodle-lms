'use client';

import { useState, useEffect } from 'react';
import { getAllForms } from '@/app/actions/forms';
import FormBuilder from '@/components/features/forms/FormBuilder';
import FormSubmissionsManager from '@/components/features/forms/FormSubmissionsManager';

interface Form {
  id: string;
  title: string;
  description?: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  submissionCount: number;
}

export default function AdminFormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [activeTab, setActiveTab] = useState<'forms' | 'builder'>('forms');
  const [isLoading, setIsLoading] = useState(false);

  const loadForms = async () => {
    setIsLoading(true);
    try {
      const data = await getAllForms();
      setForms(data);
    } catch (error) {
      console.error('Failed to load forms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Forms Management</h1>
          <p className="text-gray-600 mt-2">
            Create forms, manage submissions, and export data
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('forms')}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === 'forms'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Forms & Submissions
          </button>
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === 'builder'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Create New Form
          </button>
        </div>

        {/* Content */}
        {activeTab === 'builder' ? (
          <div>
            <FormBuilder 
              onFormCreated={loadForms}
              onTabChange={setActiveTab}
            />
          </div>
        ) : selectedForm ? (
          <div className="space-y-6">
            <button
              onClick={() => setSelectedForm(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              ← Back to Forms List
            </button>
            <FormSubmissionsManager
              formId={selectedForm.id}
              formTitle={selectedForm.title}
            />
          </div>
        ) : (
          <div>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">
                Loading forms...
              </div>
            ) : forms.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No forms yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first form to get started
                </p>
                <button
                  onClick={() => setActiveTab('builder')}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Create Form
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {forms.map(form => (
                  <div
                    key={form.id}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedForm(form)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {form.title}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              form.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {form.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {form.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {form.description && (
                          <p className="text-gray-600 text-sm mb-3">
                            {form.description}
                          </p>
                        )}
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <span>
                            Created: {new Date(form.createdAt).toLocaleDateString()}
                          </span>
                          <span>
                            {form.submissionCount} submission
                            {form.submissionCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        View Submissions
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
