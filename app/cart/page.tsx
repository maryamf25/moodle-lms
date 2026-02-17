'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { removeFromCartAction, clearCartAction, validateCouponAction, getCartAction } from '@/app/dashboard/cart/actions';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: string;
  courseId: string;
  quantity: number;
  course: {
    id: string;
    moodleCourseId: number;
    fullname: string;
    shortname: string;
    price: string;
  };
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Fetch cart items on mount
  useEffect(() => {
    async function loadCart() {
      try {
        const result = await getCartAction();
        if (result.ok) {
          setCartItems(result.data as CartItem[]);
        }
      } catch (error) {
        console.error('Failed to load cart:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCart();
  }, []);

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.course.price) * item.quantity,
    0
  );

  const tax = Math.round(subtotal * 0.15); // 15% tax
  let total = subtotal + tax;

  if (appliedCoupon?.discountAmount) {
    total -= appliedCoupon.discountAmount;
  }

  // Remove item
  const handleRemoveItem = (courseId: string) => {
    startTransition(async () => {
      const result = await removeFromCartAction(courseId);
      if (result.ok) {
        setCartItems(cartItems.filter((item) => item.courseId !== courseId));
      }
    });
  };

  // Clear cart
  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      startTransition(async () => {
        const result = await clearCartAction();
        if (result.ok) {
          setCartItems([]);
          setAppliedCoupon(null);
        }
      });
    }
  };

  // Apply coupon
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');

    if (!couponCode.trim()) {
      setCouponError('Enter a coupon code');
      return;
    }

    const result = await validateCouponAction(couponCode, subtotal);
    if (result.ok) {
      setAppliedCoupon(result.data);
      setCouponCode('');
    } else {
      setCouponError(result.message);
    }
  };

  // Proceed to checkout
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }
    // For now, redirect to a checkout page
    // In the final implementation, this will integrate with SafePay
    router.push(`/checkout?total=${Math.round(total * 100)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block">
            ← Back to Courses
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Start adding courses to build your learning path</p>
            <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg">
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-6 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{item.course.fullname}</h3>
                      <p className="text-sm text-gray-500 mt-1">{item.course.shortname}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">PKR {Number(item.course.price).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.courseId)}
                      disabled={isPending}
                      className="ml-4 text-red-600 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {cartItems.length > 0 && (
                <button
                  onClick={handleClearCart}
                  disabled={isPending}
                  className="text-gray-600 hover:text-gray-700 text-sm font-medium disabled:opacity-50"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Cart Summary */}
            <div className="h-fit">
              {/* Coupon Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Apply Coupon</h2>
                <form onSubmit={handleApplyCoupon} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={!!appliedCoupon || isPending}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                  {!appliedCoupon ? (
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 rounded-lg disabled:opacity-50"
                    >
                      Apply
                    </button>
                  ) : (
                    <div
                      onClick={() => setAppliedCoupon(null)}
                      className="w-full bg-green-100 text-green-700 font-bold py-2 rounded-lg text-center cursor-pointer hover:bg-green-200"
                    >
                      ✓ Applied ({appliedCoupon.coupon.code})
                    </div>
                  )}
                </form>
                {couponError && <p className="text-sm text-red-600 mt-2">{couponError}</p>}
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-20">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

                <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span className="font-bold">PKR {subtotal.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-gray-700">
                    <span>Tax (15%)</span>
                    <span className="font-bold">PKR {tax.toLocaleString()}</span>
                  </div>

                  {appliedCoupon?.discountAmount && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({appliedCoupon.coupon.code})</span>
                      <span className="font-bold">-PKR {appliedCoupon.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-xl font-bold text-gray-900 mb-6">
                  <span>Total</span>
                  <span>PKR {Math.round(total).toLocaleString()}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isPending || cartItems.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                >
                  Proceed to Checkout
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  Secure checkout powered by SafePay
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
