import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Dev-only inspection endpoint.
 *
 * ⚠️ This route used to select `whatsappAccessToken` for every school and
 * return it as plain JSON, with no authentication and no tenant scoping — a
 * public dump of every school's Meta credentials. The token is never needed to
 * inspect messages, so it is no longer read at all, and the route is closed
 * outside development.
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        whatsappPhoneNumberId: true,
        // Presence only — the value must never leave the server.
        whatsappConnectionStatus: true,
      }
    });

    const messages = await prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return NextResponse.json({ schools, messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
