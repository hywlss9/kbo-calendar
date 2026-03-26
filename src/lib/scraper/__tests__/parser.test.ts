// @vitest-environment node
import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import {
  parseScoreBoardHtml,
  parseBatterTableHtml,
  parsePitcherTableHtml,
  parseScheduleTableHtml,
  safeInt,
  safeIntOrNull,
  safeFloat,
  type ScoreBoardMeta,
} from "../parser";

// fixture 로딩 헬퍼
const fixture = (name: string) =>
  readFileSync(join(__dirname, "fixtures", name), "utf-8");

// ---- safeInt / safeIntOrNull / safeFloat ----

describe("safeInt", () => {
  it("정상 숫자 문자열 → 정수 반환", () => {
    expect(safeInt("42")).toBe(42);
  });
  it("공백 포함 문자열 → trim 후 파싱", () => {
    expect(safeInt("  7  ")).toBe(7);
  });
  it("NaN 문자열 → 0 반환", () => {
    expect(safeInt("abc")).toBe(0);
  });
  it("빈 문자열 → 0 반환", () => {
    expect(safeInt("")).toBe(0);
  });
  it("null → 0 반환", () => {
    expect(safeInt(null)).toBe(0);
  });
  it("undefined → 0 반환", () => {
    expect(safeInt(undefined)).toBe(0);
  });
});

describe("safeIntOrNull", () => {
  it("정상 숫자 → 정수 반환", () => {
    expect(safeIntOrNull("15")).toBe(15);
  });
  it("빈 문자열 → null 반환", () => {
    expect(safeIntOrNull("")).toBeNull();
  });
  it("null → null 반환", () => {
    expect(safeIntOrNull(null)).toBeNull();
  });
  it("NaN → null 반환", () => {
    expect(safeIntOrNull("xyz")).toBeNull();
  });
});

describe("safeFloat", () => {
  it("소수점 문자열 → float 반환", () => {
    expect(safeFloat("3.14")).toBeCloseTo(3.14);
  });
  it("빈 문자열 → null", () => {
    expect(safeFloat("")).toBeNull();
  });
  it("NaN → null", () => {
    expect(safeFloat("n/a")).toBeNull();
  });
});

// ---- parseScoreBoardHtml ----

describe("parseScoreBoardHtml", () => {
  const html = fixture("innings-table.html");
  const meta: ScoreBoardMeta = {
    winningPitcher: "김승리",
    losingPitcher: "박패배",
    savePitcher: null,
    homeRuns: "홍길동,김철수",
    duration: "3:12",
    attendance: "15,234",
  };

  it("9이닝 ScoreBoard 정상 파싱", () => {
    const result = parseScoreBoardHtml(html, "20260328KTLG0", "KT", "LG", meta);

    expect(result.gameId).toBe("20260328KTLG0");
    expect(result.innings).toHaveLength(9);
  });

  it("원정/홈 팀 코드 설정", () => {
    const result = parseScoreBoardHtml(html, "20260328KTLG0", "KT", "LG", meta);

    expect(result.away.team).toBe("KT");
    expect(result.home.team).toBe("LG");
  });

  it("이닝 점수 정확성 (원정 2이닝=1, 홈 4이닝=2)", () => {
    const result = parseScoreBoardHtml(html, "20260328KTLG0", "KT", "LG", meta);

    expect(result.innings[1].away).toBe(1); // 2이닝 원정
    expect(result.innings[3].home).toBe(2); // 4이닝 홈
  });

  it("9회 말 'x' → home null 처리", () => {
    const result = parseScoreBoardHtml(html, "20260328KTLG0", "KT", "LG", meta);

    expect(result.innings[8].home).toBeNull(); // 9회 말 'x'
  });

  it("R/H/E/B 합계 파싱", () => {
    const result = parseScoreBoardHtml(html, "20260328KTLG0", "KT", "LG", meta);

    expect(result.away.runs).toBe(3);
    expect(result.away.hits).toBe(7);
    expect(result.away.errors).toBe(1);
    expect(result.home.runs).toBe(5);
  });

  it("meta.homeRuns 쉼표 구분 → string[] 변환", () => {
    const result = parseScoreBoardHtml(html, "20260328KTLG0", "KT", "LG", meta);

    expect(result.homeRuns).toEqual(["홍길동", "김철수"]);
  });

  it("meta.attendance 쉼표 포함 숫자 → number 변환", () => {
    const result = parseScoreBoardHtml(html, "20260328KTLG0", "KT", "LG", meta);

    expect(result.attendance).toBe(15234);
  });

  it("meta 필드 없음 → null 처리", () => {
    const result = parseScoreBoardHtml(html, "20260328KTLG0", "KT", "LG", {});

    expect(result.winningPitcher).toBeNull();
    expect(result.homeRuns).toEqual([]);
    expect(result.attendance).toBeNull();
  });

  it("tbody 없는 HTML → Error throw", () => {
    const emptyHtml = "<table><thead><tr><th>1</th></tr></thead><tbody></tbody></table>";
    expect(() =>
      parseScoreBoardHtml(emptyHtml, "x", "KT", "LG", {})
    ).toThrow("[parser] 이닝 테이블 파싱 실패");
  });
});

// ---- parseBatterTableHtml ----

describe("parseBatterTableHtml", () => {
  const html = fixture("batter-table.html");

  it("빈 html → 빈 배열 반환", () => {
    expect(parseBatterTableHtml("")).toEqual([]);
  });

  it("13컬럼 정상 행 파싱 (2개 유효 행)", () => {
    const result = parseBatterTableHtml(html);
    expect(result).toHaveLength(2);
  });

  it("첫 번째 타자 정보 정확성", () => {
    const [batter] = parseBatterTableHtml(html);

    expect(batter.order).toBe(1);
    expect(batter.position).toBe("CF");
    expect(batter.name).toBe("홍길동");
    expect(batter.atBats).toBe(4);
    expect(batter.hits).toBe(2);
    expect(batter.rbi).toBe(1);
    expect(batter.average).toBe(".310");
  });

  it("average 빈 문자열 → null", () => {
    const [, second] = parseBatterTableHtml(html);
    expect(second.average).toBeNull();
  });

  it("컬럼 수 부족 행(colspan) → skip", () => {
    const result = parseBatterTableHtml(html);
    // 합계 행(colspan=5)은 skip되어 2개만 파싱
    expect(result).toHaveLength(2);
  });
});

// ---- parsePitcherTableHtml ----

describe("parsePitcherTableHtml — 10컬럼", () => {
  const html = fixture("pitcher-table-10col.html");

  it("빈 html → 빈 배열", () => {
    expect(parsePitcherTableHtml("")).toEqual([]);
  });

  it("3개 행 파싱", () => {
    expect(parsePitcherTableHtml(html)).toHaveLength(3);
  });

  it("선발 투수 (승리) 정보", () => {
    const [starter] = parsePitcherTableHtml(html);

    expect(starter.name).toBe("박선발");
    expect(starter.result).toBe("승");
    expect(starter.inningsPitched).toBe("6.0");
    expect(starter.strikeOuts).toBe(7);
    expect(starter.pitchCount).toBe(95);
    expect(starter.era).toBe("3.45");
  });

  it("result/era 빈 문자열 → null", () => {
    const pitchers = parsePitcherTableHtml(html);
    const last = pitchers[2];

    expect(last.result).toBeNull();
    expect(last.era).toBeNull();
    expect(last.pitchCount).toBeNull();
  });
});

describe("parsePitcherTableHtml — 9컬럼 (삼진 없음)", () => {
  const html = fixture("pitcher-table-9col.html");

  it("2개 행 파싱", () => {
    expect(parsePitcherTableHtml(html)).toHaveLength(2);
  });

  it("9컬럼: strikeOuts=0, pitchCount/era 올바른 위치", () => {
    const [starter] = parsePitcherTableHtml(html);

    expect(starter.strikeOuts).toBe(0); // 9컬럼 fallback
    expect(starter.pitchCount).toBe(88);
    expect(starter.era).toBe("4.80");
  });

  it("era 빈 문자열 → null", () => {
    const pitchers = parsePitcherTableHtml(html);
    expect(pitchers[1].era).toBeNull();
  });
});

// ---- parseScheduleTableHtml ----

describe("parseScheduleTableHtml", () => {
  it(".tbl-type06 없는 HTML → 빈 배열 반환", () => {
    const result = parseScheduleTableHtml("<html><body><p>없음</p></body></html>", 2026, 3);
    expect(result).toEqual([]);
  });

  it("정상 일정 파싱 — 3개 경기", () => {
    const html = fixture("schedule-table.html");
    const result = parseScheduleTableHtml(html, 2026, 3);
    expect(result).toHaveLength(3);
  });

  it("날짜 파싱 정확성 (03.28 → 2026-03-28)", () => {
    const html = fixture("schedule-table.html");
    const [first] = parseScheduleTableHtml(html, 2026, 3);
    expect(first.date).toBe("2026-03-28");
  });

  it("rowspan 행 — lastDate 상속", () => {
    const html = fixture("schedule-table.html");
    const [, second] = parseScheduleTableHtml(html, 2026, 3);
    expect(second.date).toBe("2026-03-28"); // rowspan으로 같은 날짜
  });

  it("스코어 있음 → status: 'final'", () => {
    const html = fixture("schedule-table.html");
    const [first] = parseScheduleTableHtml(html, 2026, 3);
    expect(first.status).toBe("final");
  });

  it("스코어 없음 → status: 'scheduled'", () => {
    const html = fixture("schedule-table.html");
    const games = parseScheduleTableHtml(html, 2026, 3);
    const scheduled = games.find((g) => g.gameId === "20260329NCHT0");
    expect(scheduled?.status).toBe("scheduled");
  });

  it("스코어 파싱 (3:5 → awayScore=3, homeScore=5)", () => {
    const html = fixture("schedule-table.html");
    const [first] = parseScheduleTableHtml(html, 2026, 3);
    expect(first.awayScore).toBe(3);
    expect(first.homeScore).toBe(5);
  });

  it("팀 코드 파싱 (away=KT, home=LG)", () => {
    const html = fixture("schedule-table.html");
    const [first] = parseScheduleTableHtml(html, 2026, 3);
    expect(first.awayTeam).toBe("KT");
    expect(first.homeTeam).toBe("LG");
  });

  it("gameId 파싱", () => {
    const html = fixture("schedule-table.html");
    const [first] = parseScheduleTableHtml(html, 2026, 3);
    expect(first.gameId).toBe("20260328KTLG0");
  });
});

describe("parseScheduleTableHtml — 특수 상태", () => {
  it("우천취소 → status: 'cancelled'", () => {
    const html = fixture("schedule-cancelled.html");
    const games = parseScheduleTableHtml(html, 2026, 4);
    expect(games[0].status).toBe("cancelled");
  });

  it("연기 → status: 'postponed'", () => {
    const html = fixture("schedule-cancelled.html");
    const games = parseScheduleTableHtml(html, 2026, 4);
    expect(games[1].status).toBe("postponed");
  });

  it("서스펜디드 → status: 'suspended'", () => {
    const html = fixture("schedule-cancelled.html");
    const games = parseScheduleTableHtml(html, 2026, 4);
    expect(games[2].status).toBe("suspended");
  });
});

describe("parseScheduleTableHtml — 연도 경계", () => {
  it("12월 페이지에 1월 경기 → year+1 처리", () => {
    const html = `
      <html><body>
      <table class="tbl-type06">
        <tbody>
          <tr>
            <td>01.03 (토)</td>
            <td>14:00</td>
            <td><img alt="LG">LG</td>
            <td><a href="/Schedule/GameCenter/Main?gameId=20270103LGSS0">vs</a></td>
            <td><img alt="SS">SS</td>
            <td>잠실</td><td></td><td></td>
          </tr>
        </tbody>
      </table>
      </body></html>
    `;
    const games = parseScheduleTableHtml(html, 2026, 12);
    expect(games[0].date).toBe("2027-01-03");
  });

  it("1월 페이지에 12월 경기 → year-1 처리", () => {
    const html = `
      <html><body>
      <table class="tbl-type06">
        <tbody>
          <tr>
            <td>12.28 (일)</td>
            <td>14:00</td>
            <td><img alt="NC">NC</td>
            <td><a href="/Schedule/GameCenter/Main?gameId=20251228NCHT0">vs</a></td>
            <td><img alt="HT">HT</td>
            <td>광주</td><td></td><td></td>
          </tr>
        </tbody>
      </table>
      </body></html>
    `;
    const games = parseScheduleTableHtml(html, 2026, 1);
    expect(games[0].date).toBe("2025-12-28");
  });
});
