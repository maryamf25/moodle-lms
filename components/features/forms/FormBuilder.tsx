'use client';

import { useState } from 'react';
import { createForm, updateForm, deleteForm, getAllForms } from '@/app/actions/forms';
import { FormType, FieldType } from '@prisma/client';

interface FormField {
  fieldType: FieldType;
  label: string;
  placeholder?: string;
  isRequired: boolean;
  order: number;
  options?: string[];
}

interface FormData {
  title: string;
  description?: string;
  type: FormType;
  fields: FormField[];
}

interface FormBuilderProps {
  onFormCreated?: () => void;
  onTabChange?: (tab: 'forms' | 'builder') => void;
}

const fieldTypes: FieldType[] = [
  'TEXT',
  'EMAIL',
  'TEXTAREA',
  'PHONE',
  'SELECT',
  'CHECKBOX',
  'RADIO',
  'FILE',
  'DATE',
  'NUMBER',
];

export default function FormBuilder({ onFormCreated, onTabChange }: FormBuilderProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    type: 'CUSTOM',
    fields: [],
  });

  const [currentField, setCurrentField] = useState<Partial<FormField>>({
    fieldType: 'TEXT',
    label: '',
    isRequired: false,
    order: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

  const addOrUpdateField = () => {
    if (!currentField.label?.trim()) {
      setMessage({
        type: 'error',
        text: 'Field label is required',
      });
      return;
    }

    const newField: FormField = {
      fieldType: currentField.fieldType || 'TEXT',
      label: currentField.label,
      placeholder: currentField.placeholder,
      isRequired: currentField.isRequired || false,
      order: currentField.order || formData.fields.length,
      options: currentField.options,
    };

    if (editingFieldIndex !== null) {
      const updatedFields = [...formData.fields];
      updatedFields[editingFieldIndex] = newField;
      setFormData(prev => ({ ...prev, fields: updatedFields }));
      setEditingFieldIndex(null);
    } else {
      setFormData(prev => ({
        ...prev,
        fields: [...prev.fields, newField],
      }));
    }

    setCurrentField({
      fieldType: 'TEXT',
      label: '',
      isRequired: false,
      order: formData.fields.length + 1,
    });
    setMessage({
      type: 'success',
      text: 'Field added successfully',
    });
  };

  const removeField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const editField = (index: number) => {
    setCurrentField(formData.fields[index]);
    setEditingFieldIndex(index);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.title.trim()) {
      setMessage({
        type: 'error',
        text: 'Form title is required',
      });
      return;
    }

    if (formData.fields.length === 0) {
      setMessage({
        type: 'error',
        text: 'Add at least one field to the form',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await createForm(formData, 'admin');

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Form created successfully!',
        });
        setFormData({
          title: '',
          description: '',
          type: 'CUSTOM',
          fields: [],
        });
        setCurrentField({
          fieldType: 'TEXT',
          label: '',
          isRequired: false,
          order: 0,
        });
        
        // Call callback functions after successful creation
        if (onFormCreated) {
          setTimeout(() => {
            onFormCreated();
          }, 500);
        }
        
        // Switch back to forms tab
        if (onTabChange) {
          setTimeout(() => {
            onTabChange('forms');
          }, 1000);
        }
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to create form',
        });
      }
    } catch (error) {
      console.error('Form creation error:', error);
      setMessage({
        type: 'error',
        text: 'An error occurred while creating the form',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Form Builder</h1>
        <p className="text-gray-600 text-sm">
          Create custom forms with various field types
        </p>
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

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Form Settings */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Form Settings</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Form Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, title: e.target.value }))
              }
              placeholder="e.g., Contact Us, Teacher Application"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, description: e.target.value }))
              }
              placeholder="Optional description for the form"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Form Type
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, type: e.target.value as FormType }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="CONTACT">Contact Form</option>
              <option value="TEACHER_APPLICATION">Teacher Application</option>
              <option value="CUSTOM">Custom Form</option>
            </select>
          </div>
        </div>

        {/* Field Builder */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Add Field</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Field Type
              </label>
              <select
                value={currentField.fieldType}
                onChange={(e) =>
                  setCurrentField(prev => ({
                    ...prev,
                    fieldType: e.target.value as FieldType,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {fieldTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Field Label *
              </label>
              <input
                type="text"
                value={currentField.label || ''}
                onChange={(e) =>
                  setCurrentField(prev => ({ ...prev, label: e.target.value }))
                }
                placeholder="e.g., Email Address"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Placeholder
            </label>
            <input
              type="text"
              value={currentField.placeholder || ''}
              onChange={(e) =>
                setCurrentField(prev => ({ ...prev, placeholder: e.target.value }))
              }
              placeholder="Optional placeholder text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {['SELECT', 'RADIO', 'CHECKBOX'].includes(currentField.fieldType || '') && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Options (comma-separated)
              </label>
              <input
                type="text"
                value={(currentField.options || []).join(', ')}
                onChange={(e) =>
                  setCurrentField(prev => ({
                    ...prev,
                    options: e.target.value
                      .split(',')
                      .map(o => o.trim())
                      .filter(o => o),
                  }))
                }
                placeholder="e.g., Option 1, Option 2, Option 3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={currentField.isRequired || false}
              onChange={(e) =>
                setCurrentField(prev => ({ ...prev, isRequired: e.target.checked }))
              }
              className="mr-3 w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-900">
              Make this field required
            </label>
          </div>

          <button
            type="button"
            onClick={addOrUpdateField}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            {editingFieldIndex !== null ? 'Update Field' : 'Add Field'}
          </button>
        </div>

        {/* Fields List */}
        {formData.fields.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Form Fields ({formData.fields.length})</h2>
            <div className="space-y-3">
              {formData.fields.map((field, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{field.label}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {field.fieldType}
                      {field.isRequired && ' • Required'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editField(index)}
                      className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium text-sm rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-medium text-sm rounded transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
        >
          {isLoading ? 'Creating Form...' : 'Create Form'}
        </button>
      </form>
    </div>
  );
}
