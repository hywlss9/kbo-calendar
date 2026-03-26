import { KBO_TEAMS } from '@/types';
import type { TeamCode } from '@/types';

// ============================================
// 에러 코드
// ============================================

export type ApiErrorCode =
  | 'MISSING_PARAM'
  | 'INVALID_DATE'
  | 'INVALID_TEAM'
  | 'INVALID_RANGE'
  | 'INVALID_GAME_ID'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

// ============================================
// ValidationResult 타입
// ============================================

export type ValidationError = { code: ApiErrorCode; message: string };
type ValidationOk<T> = { ok: true; value: T };
export type ValidationResult<T> = ValidationOk<T> | ({ ok: false } & ValidationError);

// ============================================
// 날짜 validation
// ============================================

const DATE_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

export function validateDate(
  raw: string | null,
  paramName: string,
): ValidationResult<string> {
  if (raw === null || raw === '') {
    return { ok: false, code: 'MISSING_PARAM', message: `${paramName} is required` };
  }
  if (!DATE_REGEX.test(raw)) {
    return {
      ok: false,
      code: 'INVALID_DATE',
      message: `${paramName} must be in YYYY-MM-DD format`,
    };
  }
  return { ok: true, value: raw };
}

// ============================================
// 팀 코드 validation (선택값)
// ============================================

function isTeamCode(value: string): value is TeamCode {
  return Object.prototype.hasOwnProperty.call(KBO_TEAMS, value);
}

export function validateTeam(
  raw: string | null,
): ValidationResult<TeamCode | undefined> {
  if (raw === null) return { ok: true, value: undefined };
  if (!isTeamCode(raw)) {
    return {
      ok: false,
      code: 'INVALID_TEAM',
      message: `team must be one of: ${Object.keys(KBO_TEAMS).join(', ')}`,
    };
  }
  return { ok: true, value: raw };
}

// ============================================
// 날짜 범위 validation
// ============================================

export function validateDateRange(
  from: string,
  to: string,
): ValidationResult<{ from: string; to: string }> {
  if (from > to) {
    return {
      ok: false,
      code: 'INVALID_RANGE',
      message: 'from must be before or equal to to',
    };
  }
  const diffMs = new Date(to).getTime() - new Date(from).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 92) {
    return {
      ok: false,
      code: 'INVALID_RANGE',
      message: 'date range must not exceed 3 months (92 days)',
    };
  }
  return { ok: true, value: { from, to } };
}

// ============================================
// gameId validation
// ============================================

// 형식: YYYYMMDD + AWAY(2자) + HOME(2자) + INDEX(1자) = 총 13자
// 예: 20260328KTLG0
const GAME_ID_REGEX = /^\d{8}[A-Z]{4}\d$/;

export function validateGameId(raw: string): ValidationResult<string> {
  if (!GAME_ID_REGEX.test(raw)) {
    return {
      ok: false,
      code: 'INVALID_GAME_ID',
      message: 'gameId must be in YYYYMMDD{AWAY}{HOME}{INDEX} format (e.g. 20260328KTLG0)',
    };
  }
  return { ok: true, value: raw };
}

// ============================================
// 에러 응답 변환 헬퍼
// ============================================

export function toErrorResponse(
  err: ValidationError,
): { success: false; error: string; code: string } {
  return { success: false, error: err.message, code: err.code };
}
