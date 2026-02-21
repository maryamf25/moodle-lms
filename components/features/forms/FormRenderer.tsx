'use client';

import { useState, useRef } from 'react';
import { submitForm } from '@/app/actions/forms';

interface FormField {
  id: string;
  fieldType: string;
  label: string;
  placeholder?: string;
  isRequired: boolean;
  order: number;
  options?: string[];
  validation?: Record<string, any>;
}

interface FormRendererProps {
  formId: string;
  title: string;
  description?: string;
  fields: FormField[];
  onSubmitSuccess?: (submissionId: string) => void;
}

export default function FormRenderer({
  formId,
  title,
  description,
  fields,
  onSubmitSuccess,
}: FormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFileChange = (fieldId: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [fieldId]: file }));
  };

  const validateForm = (): boolean => {
    for (const field of fields) {
      if (field.isRequired && !formData[field.id]) {
        setMessage({
          type: 'error',
          text: `${field.label} is required`,
        });
        return false;
      }

      // Email validation
      if (field.fieldType === 'EMAIL' && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          setMessage({
            type: 'error',
            text: `${field.label} must be a valid email`,
          });
          return false;
        }
      }

      // Phone validation
      if (field.fieldType === 'PHONE' && formData[field.id]) {
        const phoneRegex = /^[0-9\s\-\+\(\)]{10,}$/;
        if (!phoneRegex.test(formData[field.id])) {
          setMessage({
            type: 'error',
            text: `${field.label} must be a valid phone number`,
          });
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Prepare files for submission
      const fileArray = [];
      for (const [fieldId, file] of Object.entries(files)) {
        if (file) {
          const buffer = await file.arrayBuffer();
          fileArray.push({
            fieldName: fieldId,
            fileBuffer: Buffer.from(buffer),
            originalName: file.name,
            mimeType: file.type,
          });
        }
      }

      const result = await submitForm({
        formId,
        email: formData.email,
        data: formData,
        files: fileArray.length > 0 ? fileArray : undefined,
      });

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Form submitted successfully!',
        });
        setFormData({});
        setFiles({});
        // Reset file inputs
        Object.values(fileInputsRef.current).forEach(input => {
          if (input) input.value = '';
        });
        onSubmitSuccess?.(result.submissionId!);
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to submit form',
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setMessage({
        type: 'error',
        text: 'An error occurred while submitting the form',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        {description && (
          <p className="text-gray-600 text-sm">{description}</p>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {fields.map((field, index) => (
          <div key={field.id}>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              {field.label}
              {field.isRequired && <span className="text-red-600 ml-1">*</span>}
            </label>

            {/* TEXT INPUT */}
            {field.fieldType === 'TEXT' && (
              <input
                type="text"
                placeholder={field.placeholder}
                value={formData[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            )}

            {/* EMAIL INPUT */}
            {field.fieldType === 'EMAIL' && (
              <input
                type="email"
                placeholder={field.placeholder}
                value={formData[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            )}

            {/* PHONE INPUT */}
            {field.fieldType === 'PHONE' && (
              <input
                type="tel"
                placeholder={field.placeholder}
                value={formData[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            )}

            {/* NUMBER INPUT */}
            {field.fieldType === 'NUMBER' && (
              <input
                type="number"
                placeholder={field.placeholder}
                value={formData[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            )}

            {/* DATE INPUT */}
            {field.fieldType === 'DATE' && (
              <input
                type="date"
                value={formData[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            )}

            {/* TEXTAREA */}
            {field.fieldType === 'TEXTAREA' && (
              <textarea
                placeholder={field.placeholder}
                value={formData[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              />
            )}

            {/* SELECT */}
            {field.fieldType === 'SELECT' && (
              <select
                value={formData[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="">Select an option</option>
                {field.options?.map((option, idx) => (
                  <option key={idx} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {/* RADIO */}
            {field.fieldType === 'RADIO' && (
              <div className="space-y-2">
                {field.options?.map((option, idx) => (
                  <label key={idx} className="flex items-center">
                    <input
                      type="radio"
                      name={field.id}
                      value={option}
                      checked={formData[field.id] === option}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className="mr-3 w-4 h-4"
                    />
                    <span className="text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* CHECKBOX */}
            {field.fieldType === 'CHECKBOX' && (
              <div className="space-y-2">
                {field.options?.map((option, idx) => (
                  <label key={idx} className="flex items-center">
                    <input
                      type="checkbox"
                      value={option}
                      checked={
                        Array.isArray(formData[field.id])
                          ? formData[field.id].includes(option)
                          : false
                      }
                      onChange={(e) => {
                        const current = Array.isArray(formData[field.id])
                          ? formData[field.id]
                          : [];
                        if (e.target.checked) {
                          handleInputChange(field.id, [...current, option]);
                        } else {
                          handleInputChange(
                            field.id,
                            current.filter((v: string) => v !== option)
                          );
                        }
                      }}
                      className="mr-3 w-4 h-4"
                    />
                    <span className="text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* FILE INPUT */}
            {field.fieldType === 'FILE' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  ref={(el) => {
                    if (el) fileInputsRef.current[field.id] = el;
                  }}
                  onChange={(e) =>
                    handleFileChange(field.id, e.target.files?.[0] || null)
                  }
                  className="hidden"
                />
                <div
                  onClick={() => fileInputsRef.current[field.id]?.click()}
                  className="cursor-pointer"
                >
                  {files[field.id] ? (
                    <div>
                      <p className="text-sm font-semibold text-green-600">
                        ✓ {files[field.id]!.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(files[field.id]!.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-700 font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Max file size: 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {isLoading ? 'Submitting...' : 'Submit Form'}
        </button>
      </form>
    </div>
  );
}
