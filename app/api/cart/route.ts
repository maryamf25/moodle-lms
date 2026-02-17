import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { getUserSessionContext } from '@/lib/moodle/user';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('moodle_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getUserSessionContext(token);

    // Get the user's internal ID
    const user = await prisma.user.findUnique({
      where: { moodleUserId: session.userid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

    return NextResponse.json(cartItems);
  } catch (error) {
    console.error('[api][cart] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}
