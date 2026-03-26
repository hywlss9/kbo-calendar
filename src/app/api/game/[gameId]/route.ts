import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, BoxScore } from '@/types';
import { getCachedGameById } from '@/lib/db/queries';
import { validateGameId, toErrorResponse } from '@/lib/api/validation';

type RouteParams = { params: Promise<{ gameId: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<BoxScore>>> {
  try {
    const { gameId } = await params;

    const validationResult = validateGameId(gameId);
    if (!validationResult.ok) {
      return NextResponse.json(toErrorResponse(validationResult), { status: 400 });
    }

    const boxScore = await getCachedGameById(validationResult.value);

    if (boxScore === null) {
      return NextResponse.json(
        { success: false, error: 'Game not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: boxScore });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[GET /api/game/[gameId]]', message);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
