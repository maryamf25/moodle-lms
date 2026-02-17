'use server';

import { prisma } from '@/lib/db/prisma';
import { requireAppAuth } from '@/lib/auth/server-session';
import { revalidatePath } from 'next/cache';

export interface CartActionResult {
  ok: boolean;
  message: string;
  data?: unknown;
}

interface MoodleCustomField {
  shortname: string;
  value: string;
}

interface MoodleCourse {
  id: number;
  fullname: string;
  shortname: string;
  summary?: string;
  categoryid?: number;
  customfields?: MoodleCustomField[];
}

/**
 * Fetch course from Moodle API
 */
async function fetchCourseFromMoodle(moodleCourseId: number): Promise<MoodleCourse | null> {
  const moodleUrl = process.env.NEXT_PUBLIC_MOODLE_URL;
  const token = process.env.MOODLE_TOKEN;

  if (!moodleUrl || !token) {
    return null;
  }

  const params = new URLSearchParams({
    wstoken: token,
    wsfunction: 'core_course_get_courses_by_field',
    moodlewsrestformat: 'json',
    field: 'id',
    value: moodleCourseId.toString(),
  });

  try {
    const response = await fetch(`${moodleUrl}/webservice/rest/server.php?${params.toString()}`, {
      cache: 'no-store',
    });
    const data = await response.json();

    if (data.courses && data.courses.length > 0) {
      return data.courses[0];
    }
    return null;
  } catch (error) {
    console.error('[cart] Error fetching course from Moodle:', error);
    return null;
  }
}

/**
 * Add a course to the user's cart
 */
export async function addToCartAction(courseId: string): Promise<CartActionResult> {
  try {
    const auth = await requireAppAuth();

    // Get the user's internal ID
    const user = await prisma.user.findUnique({
      where: { moodleUserId: auth.moodleUserId },
    });

    if (!user) {
      return { ok: false, message: 'User not found' };
    }

    const moodleCourseId = parseInt(courseId);

    // Verify course exists or fetch from Moodle
    let course = await prisma.courseCatalog.findUnique({
      where: { moodleCourseId },
    });

    // If not found locally, fetch from Moodle and create it
    if (!course) {
      const moodleCourse = await fetchCourseFromMoodle(moodleCourseId);
      
      if (!moodleCourse) {
        return { ok: false, message: 'Course not found in system' };
      }

      // Extract price from customfields
      const priceField = moodleCourse.customfields?.find(
        (f: MoodleCustomField) => f.shortname === 'price' || f.shortname === 'course_price'
      );
      const price = priceField ? parseFloat(priceField.value || '0') : 0;

      // Create the course in catalog
      course = await prisma.courseCatalog.create({
        data: {
          moodleCourseId: moodleCourse.id,
          fullname: moodleCourse.fullname,
          shortname: moodleCourse.shortname,
          summary: moodleCourse.summary || '',
          categoryId: moodleCourse.categoryid,
          price,
        },
      });

      console.log('[cart] Created new course catalog entry:', {
        moodleCourseId: moodleCourse.id,
        fullname: moodleCourse.fullname,
        price,
      });
    }

    // Add or update cart item (upsert)
    const cartItem = await prisma.cartItem.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
      update: {
        quantity: { increment: 1 },
      },
      create: {
        userId: user.id,
        courseId: course.id,
        quantity: 1,
      },
    });

    revalidatePath('/cart');
    revalidatePath('/course/[id]', 'page');

    return {
      ok: true,
      message: `${course.fullname} added to cart`,
      data: {
        id: cartItem.id,
        quantity: cartItem.quantity,
      },
    };
  } catch (error) {
    console.error('[cart] addToCart error:', error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to add to cart',
    };
  }
}

/**
 * Remove a course from the user's cart
 */
export async function removeFromCartAction(courseId: string): Promise<CartActionResult> {
  try {
    const auth = await requireAppAuth();

    const user = await prisma.user.findUnique({
      where: { moodleUserId: auth.moodleUserId },
    });

    if (!user) {
      return { ok: false, message: 'User not found' };
    }

    // Look up by moodleCourseId to get the UUID
    const course = await prisma.courseCatalog.findUnique({
      where: { moodleCourseId: parseInt(courseId) },
    });

    if (!course) {
      return { ok: false, message: 'Course not found' };
    }

    await prisma.cartItem.delete({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
    });

    revalidatePath('/cart');

    return {
      ok: true,
      message: 'Item removed from cart',
    };
  } catch (error) {
    console.error('[cart] removeFromCart error:', error);
    return {
      ok: false,
      message: 'Failed to remove item',
    };
  }
}

/**
 * Get all items in the user's cart
 */
export async function getCartAction() {
  try {
    const auth = await requireAppAuth();

    const user = await prisma.user.findUnique({
      where: { moodleUserId: auth.moodleUserId },
    });

    if (!user) {
      return {
        ok: false,
        message: 'User not found',
        data: [],
      };
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: {
        course: {
          select: {
            id: true,
            moodleCourseId: true,
            fullname: true,
            shortname: true,
            price: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    return {
      ok: true,
      data: cartItems,
    };
  } catch (error) {
    console.error('[cart] getCart error:', error);
    return {
      ok: false,
      message: 'Failed to fetch cart',
      data: [],
    };
  }
}

/**
 * Clear all items from the user's cart
 */
export async function clearCartAction(): Promise<CartActionResult> {
  try {
    const auth = await requireAppAuth();

    const user = await prisma.user.findUnique({
      where: { moodleUserId: auth.moodleUserId },
    });

    if (!user) {
      return { ok: false, message: 'User not found' };
    }

    await prisma.cartItem.deleteMany({
      where: { userId: user.id },
    });

    revalidatePath('/cart');

    return {
      ok: true,
      message: 'Cart cleared',
    };
  } catch (error) {
    console.error('[cart] clearCart error:', error);
    return {
      ok: false,
      message: 'Failed to clear cart',
    };
  }
}

/**
 * Validate and apply a coupon to calculate discount
 */
export async function validateCouponAction(couponCode: string, cartTotal: number) {
  try {
    const code = couponCode.toUpperCase().trim();

    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      return {
        ok: false,
        message: 'Coupon code not found',
      };
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return {
        ok: false,
        message: 'This coupon is no longer active',
      };
    }

    // Check if coupon has expired
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return {
        ok: false,
        message: 'This coupon has expired',
      };
    }

    // Check if coupon has reached max usage
    if (coupon.maxUsage && coupon.currentUsage >= coupon.maxUsage) {
      return {
        ok: false,
        message: 'This coupon has reached its usage limit',
      };
    }

    // Check minimum purchase requirement
    if (Number(coupon.minPurchase) > 0 && cartTotal < Number(coupon.minPurchase)) {
      return {
        ok: false,
        message: `Minimum purchase of PKR ${coupon.minPurchase} required`,
      };
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (cartTotal * Number(coupon.discountValue)) / 100;
    } else {
      discountAmount = Number(coupon.discountValue);
    }

    const finalTotal = Math.max(0, cartTotal - discountAmount);

    return {
      ok: true,
      message: 'Coupon applied successfully',
      data: {
        coupon,
        discountAmount,
        finalTotal,
      },
    };
  } catch (error) {
    console.error('[cart] validateCoupon error:', error);
    return {
      ok: false,
      message: 'Failed to validate coupon',
    };
  }
}

/**
 * Apply coupon to cart (increment usage)
 */
export async function applyCouponToCartAction(couponCode: string): Promise<CartActionResult> {
  try {
    const code = couponCode.toUpperCase().trim();

    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      return {
        ok: false,
        message: 'Invalid coupon',
      };
    }

    // Note: actual increment will happen after payment confirmation
    // Here we just validate
    return {
      ok: true,
      message: 'Coupon is valid',
      data: coupon,
    };
  } catch (error) {
    console.error('[cart] applyCouponToCart error:', error);
    return {
      ok: false,
      message: 'Failed to apply coupon',
    };
  }
}
