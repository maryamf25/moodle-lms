// app/payment-error/page.tsx
export const dynamic = 'force-dynamic';

export default async function PaymentErrorPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams; // ✅ unwrap the Promise
  console.log("Payment Error Params:", params);

  const status = params?.status || 'failed';
  const message = params?.message || 'Something went wrong with your payment.';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold text-red-600">Payment Failed</h1>
      <p className="text-gray-700 mt-2">{message}</p>
      <p className="text-sm text-gray-500 mt-1">Status: {status}</p>
    </div>
  );
}