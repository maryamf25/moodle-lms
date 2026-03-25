import { enrolUser } from '@/lib/moodle/index';
import { getUserId } from '@/app/(auth)/login/actions';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // 1. Fix the Promise error by awaiting searchParams
  const params = await searchParams;
  const basketId = params.basketId as string;
  const courseId = params.courseId as string;
  const errCode = params.err_code;

  // 2. Security Check: Only proceed if PayFast says '000' (Success)
  if (errCode !== '000') {
    redirect('/payment-error');
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('moodle_token')?.value;

  if (token && courseId) {
    try {
      const userId = await getUserId(token);
      // 3. TRIGGER THE ENROLLMENT HERE
      await enrolUser(userId, parseInt(courseId));
      
      // Optional: Log success or update your internal database
      console.log(`User ${userId} successfully enrolled in ${courseId}`);
    } catch (error) {
      console.error("Post-payment enrollment failed:", error);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold text-green-600">Payment Successful!</h1>
      <p>We are setting up your course access...</p>
      <a href={`/course/${courseId}/learn`} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
        Go to Course
      </a>
    </div>
  );
}