import { getFormsByType } from '@/app/actions/forms';
import FormRenderer from '@/components/features/forms/FormRenderer';

export const dynamic = 'force-dynamic';

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

export default async function TeacherApplicationPage() {
  const forms = await getFormsByType('TEACHER_APPLICATION');
  const form = forms[0];

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Teacher Application Form Not Found
          </h1>
          <p className="text-gray-600">
            The teacher application form is currently unavailable. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <FormRenderer
          formId={form.id}
          title={form.title}
          description={form.description}
          fields={form.fields as unknown as FormField[]}
        />
      </div>
    </div>
  );
}
