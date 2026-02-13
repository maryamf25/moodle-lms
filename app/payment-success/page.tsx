import { redirect } from 'next/navigation';

export default async function PaymentSuccessPage({
    searchParams,
}: {
    searchParams: { order_id?: string };
}) {
    // Safepay appends the order_id to the redirect URL
    const params = await searchParams;
    const orderId = params.order_id;

    if (!orderId) {
        // Fallback if something went wrong
        redirect('/');
    }

    const [courseId] = orderId.split('-');

    // This is the "Specific Course" redirect you wanted
    redirect(`/course/${courseId}/learn`);
}