// ─────────────────────────────────────────────────────────────
// 🎃 호박 터뜨리기 — 할로윈 위크 미니게임 + 전 직원 실시간 랭킹
//   모바일은 하단 시트, 데스크탑은 가운데 모달. 게임(좌) + 랭킹(우) 2단.
//   닉네임/소속은 Chat 과 같은 localStorage 정체성(nickname.js)을 공유합니다.
// ─────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Trophy } from "lucide-react";
import { HALLOWEEN, isRankingClosed } from "../lib/halloween.js";
import { createPumpkinGame } from "../lib/halloweenGame.js";
import { fetchLeaderboard, submitScore, subscribeLeaderboard, currentUserId } from "../lib/halloweenScores.js";
import { loadIdentity, saveIdentity } from "../lib/nickname.js";
import { isSupabaseConfigured } from "../lib/supabase.js";

const NIGHT = {
  bg: "#16111F",
  panel: "#221A30",
  line: "#3A2C4D",
  pumpkin: "#F27A1A",
  candle: "#FFD36B",
  bone: "#F1EADF",
  muted: "#A899BB",
};

const MEDAL = ["🥇", "🥈", "🥉"];
const BOARD_SIZE = 20; // 화면에 보여줄 랭킹 줄 수

const SUBMIT_MSG = {
  closed: "랭킹이 마감되어 이번 기록은 저장되지 않았어요.",
  too_fast: "잠깐! 너무 빨리 다시 제출했어요. 한 판 더 해 주세요.",
  unavailable: "랭킹 서버에 연결하지 못했어요. 잠시 후 다시 해 주세요.",
};

export default function HalloweenGame({ onClose, fxOn, onToggleFx }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const scoreRef = useRef(null);
  const timeRef = useRef(null);
  const [phase, setPhase] = useState("ready"); // ready | playing | done
  // 창을 연 시점에 랭킹이 마감됐으면 최종 결과 모드 (마감 후 게임은 기록 없이 "그냥 한 판")
  const [closed] = useState(() => isRankingClosed());
  const [lastScore, setLastScore] = useState(0);
  const [result, setResult] = useState(null); // { best, rank } | { error }
  const [board, setBoard] = useState([]);
  const [boardLoaded, setBoardLoaded] = useState(false);
  const [myId, setMyId] = useState(null);
  const [identity, setIdentity] = useState(() => (isSupabaseConfigured ? loadIdentity() : { nickname: "", affiliation: "" }));
  const [draft, setDraft] = useState(identity);
  const identityRef = useRef(identity);
  identityRef.current = identity;

  // 랭킹 전체(닉네임·소속 기준 1인 1줄)를 다시 읽고 반환
  const reloadBoard = useCallback(async () => {
    const list = await fetchLeaderboard();
    setBoard(list);
    setBoardLoaded(true);
    return list;
  }, []);

  // 랭킹 로드 + 실시간 구독 (변동이 몰리면 0.8초 모아서 한 번만 다시 읽기)
  useEffect(() => {
    reloadBoard();
    currentUserId().then(setMyId);
    let t = 0;
    const unsub = subscribeLeaderboard(() => {
      clearTimeout(t);
      t = setTimeout(reloadBoard, 800);
    });
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [reloadBoard]);

  // 게임 엔진은 캔버스가 붙은 뒤 한 번만 만듭니다
  useEffect(() => {
    const game = createPumpkinGame(canvasRef.current, {
      seconds: HALLOWEEN.gameSeconds,
      onHud: (score, left) => {
        if (scoreRef.current) scoreRef.current.textContent = `${score}점`;
        if (timeRef.current) timeRef.current.textContent = `${left.toFixed(1)}초`;
      },
      onEnd: async (score) => {
        setLastScore(score);
        setPhase("done");
        setResult(null);
        // 마감 후에는 서버에 보내지 않고 바로 안내 (서버도 같은 시각부터 거절)
        const res = isRankingClosed() ? { error: "closed" } : await submitScore(score, identityRef.current);
        if (res.userId) setMyId(res.userId);
        const list = await reloadBoard();
        if (!res.error) {
          // 순위·최고점은 1인 1줄로 합친 랭킹 기준 (다른 기기에서 낸 더 높은 점수도 반영)
          const i = list.findIndex((r) => r.userIds.includes(res.userId));
          if (i >= 0) {
            res.rank = i + 1;
            res.best = list[i].best_score;
          }
        }
        setResult(res);
      },
    });
    gameRef.current = game;
    return () => game.destroy();
  }, [reloadBoard]);

  // ESC 로 닫기 (게임 중에는 실수 방지를 위해 무시)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && phase !== "playing") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  // 닉네임·소속 저장 (빈 닉네임은 랜덤으로 다시 채워짐). 바뀐 게 없으면 아무것도 안 함
  const commitName = () => {
    const cur = identityRef.current;
    if (draft.nickname.trim() === cur.nickname && draft.affiliation.trim() === cur.affiliation) return;
    const next = saveIdentity(draft);
    identityRef.current = next;
    setIdentity(next);
    setDraft(next);
  };

  const start = () => {
    commitName();
    setPhase("playing");
    gameRef.current?.start();
  };

  const saveName = (e) => {
    e.preventDefault();
    commitName();
    document.activeElement?.blur?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-6"
      onClick={() => phase !== "playing" && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="호박 터뜨리기"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
        style={{ backgroundColor: NIGHT.bg, color: NIGHT.bone, boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)", fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5" style={{ borderBottom: `1px solid ${NIGHT.line}` }}>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: NIGHT.muted }}>Halloween Week</p>
            <h3 className="text-[19px] font-extrabold tracking-tight">🎃 호박 터뜨리기</h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onToggleFx}
              className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2"
              style={{ border: `1px solid ${NIGHT.line}`, color: NIGHT.bone, outlineColor: NIGHT.candle }}
            >
              배경 효과 {fxOn ? "끄기" : "켜기"}
            </button>
            <button
              onClick={onClose}
              disabled={phase === "playing"}
              aria-label="닫기"
              className="rounded-lg p-1.5 transition-transform hover:bg-white/10 active:scale-90 disabled:opacity-30 focus-visible:outline focus-visible:outline-2"
              style={{ outlineColor: NIGHT.candle }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_280px]">
          {/* 게임 */}
          <div className="flex min-w-0 flex-col gap-2">
            <div className="relative overflow-hidden rounded-xl" style={{ border: `1px solid ${NIGHT.line}`, background: "linear-gradient(180deg,#1C1428 0%,#2A1C22 100%)" }}>
              <canvas ref={canvasRef} className="block h-[340px] w-full touch-manipulation sm:h-[400px]" style={{ cursor: "crosshair" }} />
              <div
                className={`pointer-events-none absolute inset-x-3 top-2.5 flex justify-between text-[15px] font-extrabold tabular-nums ${closed && phase === "ready" ? "invisible" : ""}`}
                style={{ textShadow: "0 1px 4px #000" }}
              >
                <span ref={scoreRef}>0점</span>
                <span ref={timeRef}>{HALLOWEEN.gameSeconds.toFixed(1)}초</span>
              </div>

              {/* 랭킹 마감 후: 게임 대신 최종 결과 시상대 */}
              {closed && phase === "ready" && (
                <FinalPodium top3={board.slice(0, 3)} loaded={boardLoaded} onPlay={start} />
              )}

              {phase !== "playing" && !(closed && phase === "ready") && (
                <div className="absolute inset-0 grid place-content-center justify-items-center gap-3 p-4 text-center" style={{ backgroundColor: "rgba(22,17,31,0.74)" }}>
                  {phase === "ready" ? (
                    <>
                      <h4 className="text-[24px] font-extrabold">준비됐나요?</h4>
                      <p className="max-w-[30ch] text-[14px]" style={{ color: NIGHT.muted }}>
                        {HALLOWEEN.gameSeconds}초 동안 떠오르는 호박을 클릭(터치)하세요. 유령은 피하세요!
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[13px] font-bold" style={{ color: NIGHT.muted }}>이번 판</p>
                      <p className="text-[56px] font-black leading-none tabular-nums" style={{ color: NIGHT.candle }}>{lastScore}</p>
                      <p className="min-h-[1.5em] text-[14px]" aria-live="polite">
                        {!result
                          ? "기록 저장 중…"
                          : result.error
                            ? SUBMIT_MSG[result.error]
                            : `내 최고 ${result.best}점 · 현재 ${result.rank ?? "-"}위`}
                      </p>
                    </>
                  )}
                  <button
                    onClick={start}
                    className="rounded-xl px-6 py-2.5 text-[15px] font-extrabold transition-transform hover:brightness-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ backgroundColor: NIGHT.pumpkin, color: "#1B0F05", outlineColor: NIGHT.candle }}
                  >
                    {phase === "ready" ? "게임 시작" : "다시 하기"}
                  </button>
                  {closed && phase === "done" && (
                    <button
                      onClick={() => setPhase("ready")}
                      className="rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2"
                      style={{ border: `1px solid ${NIGHT.line}`, outlineColor: NIGHT.candle }}
                    >
                      🏆 최종 결과 보기
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]" style={{ color: NIGHT.muted }}>
              <span>🎃 호박 <b style={{ color: "#9BD06A" }}>+1</b></span>
              <span>✨ 황금 호박 <b style={{ color: NIGHT.candle }}>+5</b></span>
              <span>👻 유령 <b style={{ color: "#FF6B7D" }}>−3</b></span>
            </div>
          </div>

          {/* 랭킹 + 내 닉네임 */}
          <aside className="flex min-w-0 flex-col gap-3">
            {/* 랭킹 이름: 닉네임(랜덤 기본값, 수정 가능) + 소속 — 칸을 벗어나면 바로 저장. 마감 후에는 숨김 */}
            {!closed && (
            <form onSubmit={saveName} className="grid gap-2.5 rounded-xl p-3.5" style={{ backgroundColor: NIGHT.panel, border: `1px solid ${NIGHT.line}` }}>
              <p className="text-[12px] font-bold" style={{ color: NIGHT.muted }}>랭킹에 표시될 이름</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid min-w-0 gap-1">
                  <span className="text-[11px]" style={{ color: NIGHT.muted }}>닉네임</span>
                  <input
                    id="hw-nickname"
                    value={draft.nickname}
                    onChange={(e) => setDraft({ ...draft, nickname: e.target.value })}
                    onBlur={commitName}
                    disabled={phase === "playing"}
                    maxLength={20}
                    placeholder="예: 애호박"
                    className="w-full min-w-0 rounded-lg bg-black/30 px-2.5 py-1.5 text-[14px] outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-[#F27A1A] disabled:opacity-50"
                  />
                </label>
                <label className="grid min-w-0 gap-1">
                  <span className="text-[11px]" style={{ color: NIGHT.muted }}>소속</span>
                  <input
                    id="hw-affiliation"
                    value={draft.affiliation}
                    onChange={(e) => setDraft({ ...draft, affiliation: e.target.value })}
                    onBlur={commitName}
                    disabled={phase === "playing"}
                    maxLength={20}
                    placeholder="예: 에봄"
                    className="w-full min-w-0 rounded-lg bg-black/30 px-2.5 py-1.5 text-[14px] outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-[#F27A1A] disabled:opacity-50"
                  />
                </label>
              </div>
              <p className="truncate text-[13px]">
                <span style={{ color: NIGHT.muted }}>미리보기 </span>
                <b>{draft.nickname.trim() || identity.nickname}</b>
                {draft.affiliation.trim() && <span style={{ color: NIGHT.muted }}> · {draft.affiliation.trim()}</span>}
              </p>
              {!draft.affiliation.trim() && (
                <p className="text-[12px] font-semibold" style={{ color: NIGHT.candle }}>상품 수령을 위해 소속을 적어 주세요</p>
              )}
              <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
            )}

            <div className="flex min-h-0 flex-1 flex-col rounded-xl" style={{ backgroundColor: NIGHT.panel, border: `1px solid ${NIGHT.line}` }}>
              <h4 className="flex items-center gap-1.5 px-3.5 pb-2 pt-3 text-[14px] font-extrabold">
                <Trophy size={15} style={{ color: NIGHT.candle }} /> 전 직원 랭킹
                <span className="ml-auto text-[11px] font-medium" style={{ color: closed ? NIGHT.candle : NIGHT.muted }}>{closed ? "최종" : "실시간"}</span>
              </h4>
              <ol className="max-h-[300px] overflow-y-auto px-2 pb-2 md:max-h-none md:flex-1">
                {!boardLoaded ? (
                  <li className="px-2 py-6 text-center text-[13px]" style={{ color: NIGHT.muted }}>불러오는 중…</li>
                ) : board.length === 0 ? (
                  <li className="px-2 py-6 text-center text-[13px]" style={{ color: NIGHT.muted }}>아직 기록이 없어요. 첫 번째 호박 사냥꾼이 되어 보세요!</li>
                ) : (
                  board.slice(0, BOARD_SIZE).map((r, i) => {
                    const mine = myId && r.userIds.includes(myId);
                    return (
                      <li
                        key={r.user_id}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13.5px]"
                        style={mine ? { backgroundColor: "rgba(242,122,26,0.18)", boxShadow: `inset 0 0 0 1px ${NIGHT.pumpkin}` } : undefined}
                      >
                        <span className="w-7 shrink-0 text-center font-extrabold tabular-nums" style={{ color: i < 3 ? NIGHT.candle : NIGHT.muted }}>
                          {MEDAL[i] ?? i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {r.nickname}
                          {r.affiliation && <span style={{ color: NIGHT.muted }}> · {r.affiliation}</span>}
                          {mine && <span className="ml-1 text-[11px] font-bold" style={{ color: NIGHT.pumpkin }}>나</span>}
                        </span>
                        <span className="shrink-0 font-extrabold tabular-nums">{r.best_score}</span>
                      </li>
                    );
                  })
                )}
              </ol>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: NIGHT.muted }}>{closed ? HALLOWEEN.footnoteClosed : HALLOWEEN.footnote}</p>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── 랭킹 마감 후 최종 결과 시상대 ── 2위 · 1위 · 3위 순서로 단상 높이를 다르게
const PODIUM = [
  { rank: 1, color: "#FFD36B", height: 84, medal: 40 }, // 금
  { rank: 2, color: "#CFC8DC", height: 64, medal: 30 }, // 은
  { rank: 3, color: "#D9925A", height: 50, medal: 30 }, // 동
];
const PODIUM_ORDER = [1, 0, 2];

function FinalPodium({ top3, loaded, onPlay }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center"
      style={{ background: "radial-gradient(ellipse at 50% 35%, rgba(242,122,26,0.22), transparent 60%), rgba(22,17,31,0.94)" }}
    >
      <div>
        <p className="text-[11px] font-bold tracking-[0.12em]" style={{ color: NIGHT.muted }}>10/29(목) 12:00 마감</p>
        <h4 className="text-[24px] font-extrabold tracking-tight">🏆 최종 결과</h4>
      </div>

      {!loaded ? (
        <p className="text-[13px]" style={{ color: NIGHT.muted }}>불러오는 중…</p>
      ) : (
        <ol className="grid w-full max-w-[520px] grid-cols-3 items-end gap-2 sm:gap-3" aria-label="최종 1~3위">
          {PODIUM_ORDER.map((i) => {
            const p = PODIUM[i];
            const r = top3[i];
            return (
              <li key={p.rank} className="flex min-w-0 flex-col items-center gap-1">
                <span aria-hidden="true" style={{ fontSize: p.medal, lineHeight: 1 }}>{MEDAL[i]}</span>
                <p className="w-full truncate text-[14px] font-extrabold sm:text-[15px]">{r?.nickname ?? "—"}</p>
                <p className="w-full truncate text-[12px]" style={{ color: NIGHT.muted }}>{r?.affiliation || " "}</p>
                <div
                  className="flex w-full flex-col items-center gap-0.5 rounded-t-lg pt-2"
                  style={{ height: p.height, background: `linear-gradient(180deg, ${p.color}33 0%, ${p.color}0D 100%)`, borderTop: `3px solid ${p.color}` }}
                >
                  <span className="text-[20px] font-black leading-none tabular-nums" style={{ color: p.color }}>
                    {r ? r.best_score : "-"}
                    <span className="ml-0.5 text-[11px] font-bold">점</span>
                  </span>
                  <span className="text-[11px] font-bold leading-tight">{HALLOWEEN.prizes[i]}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid justify-items-center gap-1">
        <button
          onClick={onPlay}
          className="rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors hover:bg-white/10 active:scale-95 focus-visible:outline focus-visible:outline-2"
          style={{ border: `1px solid ${NIGHT.line}`, outlineColor: NIGHT.candle }}
        >
          🎃 그냥 한 판 하기
        </button>
        <p className="text-[11px]" style={{ color: NIGHT.muted }}>마감 후 기록은 랭킹에 반영되지 않아요</p>
      </div>
    </div>
  );
}
