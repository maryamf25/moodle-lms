// app/payment-success/page.tsx
import { redirect } from 'next/navigation';

export default async function PaymentSuccess({
  searchParams,
}: {
  searchParams: { order_id?: string; tracker?: string };
}) {
  const { order_id } = await searchParams;

  console.log("💰 User returned from Safepay. Order ID:", order_id);

  if (!order_id) {
    redirect('/'); // Fallback to home if no ID found
  }

  // Extract courseId from "2-4" (courseId-userId)
  const courseId = order_id.split('-')[0];

  // Since your Webhook already enrolled the user, 
  // we just need to send the browser to the course page.
  redirect(`/course/${courseId}/learn`);
}