import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, whatsappPhoneNumberId: true, whatsappAccessToken: true }
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
