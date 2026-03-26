import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, GameSchedule } from '@/types';
import {
  getCachedGamesByDate,
  getCachedGamesByRange,
  getCachedGamesByTeam,
} from '@/lib/db/queries';
import {
  validateDate,
  validateTeam,
  validateDateRange,
  toErrorResponse,
} from '@/lib/api/validation';

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<GameSchedule[]>>> {
  try {
    const { searchParams } = request.nextUrl;
    const date = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const team = searchParams.get('team');

    // 분기 1: ?date= 단일 날짜 조회
    if (date !== null) {
      const dateResult = validateDate(date, 'date');
      if (!dateResult.ok) {
        return NextResponse.json(toErrorResponse(dateResult), { status: 400 });
      }
      const games = await getCachedGamesByDate(dateResult.value);
      return NextResponse.json({ success: true, data: games });
    }

    // 분기 2: ?from=&to= 범위 조회 (팀 필터 포함)
    if (from !== null || to !== null) {
      const fromResult = validateDate(from, 'from');
      if (!fromResult.ok) {
        return NextResponse.json(toErrorResponse(fromResult), { status: 400 });
      }
      const toResult = validateDate(to, 'to');
      if (!toResult.ok) {
        return NextResponse.json(toErrorResponse(toResult), { status: 400 });
      }
      const rangeResult = validateDateRange(fromResult.value, toResult.value);
      if (!rangeResult.ok) {
        return NextResponse.json(toErrorResponse(rangeResult), { status: 400 });
      }
      const teamResult = validateTeam(team);
      if (!teamResult.ok) {
        return NextResponse.json(toErrorResponse(teamResult), { status: 400 });
      }

      const { from: validFrom, to: validTo } = rangeResult.value;
      const games =
        teamResult.value !== undefined
          ? await getCachedGamesByTeam(teamResult.value, validFrom, validTo)
          : await getCachedGamesByRange(validFrom, validTo);

      return NextResponse.json({ success: true, data: games });
    }

    // 분기 3: 아무 파라미터도 없음
    return NextResponse.json(
      toErrorResponse({ code: 'MISSING_PARAM', message: 'date or from/to is required' }),
      { status: 400 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[GET /api/games]', message);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
