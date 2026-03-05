import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET /api/settings/coefficients — return all active coefficient sets */
export async function GET() {
  const sets = await prisma.coefficientSet.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ coefficients: sets });
}

/** PUT /api/settings/coefficients — update a coefficient set by name */
export async function PUT(request: Request) {
  const body = await request.json();
  const {
    name,
    emailWeight,
    emailLastUse,
    filesEdited,
    filesViewed,
    driveLastUse,
    filesCreated,
    chatWeight,
    meetingsWeight,
  } = body;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const updated = await prisma.coefficientSet.update({
    where: { name },
    data: {
      emailWeight: Number(emailWeight),
      emailLastUse: Number(emailLastUse),
      filesEdited: Number(filesEdited),
      filesViewed: Number(filesViewed),
      driveLastUse: Number(driveLastUse),
      filesCreated: Number(filesCreated),
      chatWeight: Number(chatWeight),
      meetingsWeight: Number(meetingsWeight),
    },
  });

  return NextResponse.json({ coefficient: updated });
}
