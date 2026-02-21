import { NextRequest, NextResponse } from 'next/server';
import { exportSubmissionsAsCSV } from '@/app/actions/forms';

export async function GET(
  request: NextRequest,
  { params }: { params: { formId: string } }
) {
  try {
    const result = await exportSubmissionsAsCSV(params.formId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}
