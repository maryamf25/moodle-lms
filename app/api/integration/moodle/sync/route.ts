import { NextRequest, NextResponse } from 'next/server';
import { runScheduledMoodleSyncs } from '@/lib/moodle/sync-scheduler';

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = process.env.MOODLE_SYNC_CRON_SECRET;
  if (!configuredSecret) {
    return false;
  }

  const headerSecret = request.headers.get('x-sync-secret');
  const authHeader = request.headers.get('authorization');
  const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  return headerSecret === configuredSecret || bearerSecret === configuredSecret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized sync trigger' }, { status: 401 });
  }

  try {
    const results = await runScheduledMoodleSyncs();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync route failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
