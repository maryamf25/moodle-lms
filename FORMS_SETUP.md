# Forms Management System - Setup Instructions

## Overview
Complete Forms Management Module with:
- Contact forms
- Teacher application forms
- Custom forms
- File uploads (up to 10MB per file)
- Submission storage in PostgreSQL
- CSV export functionality
- Admin dashboard for management

## Database Setup

Run the following command to apply the Prisma migration:

```bash
npm run prisma:migrate
```

This will create the following tables:
- `Form` - Form templates
- `FormField` - Individual form fields
- `FormSubmission` - Form submissions
- `SubmissionFile` - Uploaded files

## File Structure Created

### Server Actions
- `app/actions/forms.ts` - All form operations (CRUD, submissions, export)

### API Routes
- `app/api/forms/upload/route.ts` - File upload handler
- `app/api/forms/[formId]/export/route.ts` - CSV export endpoint

### Components
- `components/features/forms/FormRenderer.tsx` - Display any form with file upload support
- `components/features/forms/FormBuilder.tsx` - Admin form builder
- `components/features/forms/FormSubmissionsManager.tsx` - Submissions viewer and status manager

### Public Pages
- `app/contact/page.tsx` - Contact form page
- `app/teach-with-us/page.tsx` - Teacher application form page
- `app/dashboard/admin/forms/page.tsx` - Admin forms management dashboard

## Features Implemented

### 1. Form Builder (FormBuilder.tsx)
- Create forms with any combination of fields
- Supported field types:
  - TEXT, EMAIL, PHONE, NUMBER, DATE
  - TEXTAREA
  - SELECT, RADIO, CHECKBOX
  - FILE (with 10MB limit)
- Set field labels, placeholders, and validation
- Make fields required/optional
- Reorder and edit fields

### 2. Form Rendering (FormRenderer.tsx)
- Dynamic form display based on database structure
- Client-side validation:
  - Email format validation
  - Phone number validation
  - Required field checks
- File upload support with drag-and-drop
- Real-time error messages
- Success feedback

### 3. Submissions Management (FormSubmissionsManager.tsx)
- View all submissions for a form
- Filter by status (submitted, reviewing, approved, rejected)
- View detailed submission data
- Update submission status and add notes
- Download attached files
- Delete submissions
- **Export to CSV** - Download all submissions with field values and file info

### 4. Public Pages
- `/contact` - Contact form
- `/teach-with-us` - Teacher application form

### 5. Admin Dashboard
- `/dashboard/admin/forms` - Complete forms management
- Create new forms via FormBuilder
- View all forms with submission counts
- Click any form to view and manage submissions
- Export submissions as CSV

## Usage Examples

### Creating a Contact Form

1. Go to `/dashboard/admin/forms`
2. Click "Create New Form"
3. Fill in:
   - Title: "Contact Us"
   - Type: "Contact Form"
   - Add fields:
     - Name (TEXT, required)
     - Email (EMAIL, required)
     - Subject (TEXT, required)
     - Message (TEXTAREA, required)
4. Click "Create Form"

### Creating a Teacher Application Form

1. Go to `/dashboard/admin/forms`
2. Click "Create New Form"
3. Fill in:
   - Title: "Teacher Application"
   - Type: "Teacher Application"
   - Add fields:
     - Full Name (TEXT, required)
     - Email (EMAIL, required)
     - Phone (PHONE, required)
     - Experience (SELECT with options, required)
     - Certifications (TEXTAREA)
     - Resume (FILE, required)
4. Click "Create Form"

### Viewing Submissions

1. Go to `/dashboard/admin/forms`
2. Click "View Submissions" on any form card
3. Filter by status or view all
4. Click a submission to:
   - View all submitted data
   - Download attached files
   - Update status (submitted → reviewing → approved/rejected)
   - Add notes
   - Delete submission

### Exporting to CSV

1. Go to form's submissions view
2. Click "Export CSV" button
3. File downloads with:
   - Submission ID
   - Email/submitter name
   - Status
   - Timestamp
   - All form field values
   - File information

## API Endpoints

### File Upload
```
POST /api/forms/upload
Content-Type: multipart/form-data

Response:
{
  success: true,
  storageName: "1708500000-abc123-filename.pdf",
  originalName: "filename.pdf",
  mimeType: "application/pdf",
  size: 2048,
  url: "/uploads/forms/1708500000-abc123-filename.pdf"
}
```

### Export Submissions
```
GET /api/forms/[formId]/export

Response: CSV file download
```

## Server Actions

### createForm
Create a new form with fields

### getForm
Retrieve a single form with all fields

### getFormsByType
Get all active forms of a specific type (CONTACT, TEACHER_APPLICATION, CUSTOM)

### updateForm
Update form settings and fields

### deleteForm
Delete a form and all its submissions

### submitForm
Submit form data with optional file uploads

### getFormSubmissions
Get all submissions for a form

### updateSubmissionStatus
Change submission status and add notes

### exportSubmissionsAsCSV
Generate CSV export of all submissions

### deleteSubmission
Delete a specific submission and its files

## Database Schema

### Form
- id, title, description, type, isActive, createdBy, createdAt, updatedAt

### FormField
- id, formId, fieldType, label, placeholder, isRequired, order, options (JSON), validation (JSON)

### FormSubmission
- id, formId, submitBy, email, data (JSON), status, notes, createdAt, updatedAt

### SubmissionFile
- id, submissionId, originalName, storageName, mimeType, size, uploadedAt

## File Upload Configuration

- **Location**: `public/uploads/forms/`
- **Max Size**: 10MB per file
- **File Naming**: `[timestamp]-[random]-[originalname]` for uniqueness
- **Access**: Files are publicly accessible via `/uploads/forms/[storageName]`

## Notes

- Forms are soft-validated on the client using FormRenderer
- Email and phone validation uses regex patterns
- All submissions are immutable (stored as JSON in data field)
- File uploads are stored on disk with unique names
- Cascade deletes work properly (deleting form deletes submissions and files)
- CSV export includes all submission metadata and file information

## Next Steps

1. Run `npm run prisma:migrate` to create tables
2. Create your first contact form at `/dashboard/admin/forms`
3. Access public form at `/contact`
4. Manage submissions in admin dashboard

