// ─────────────────────────────────────────────────────────────
// Slack 알림 — 새 식단이 main 에 반영된 "그 순간" 두 채널로 전송.
//   · 관리자 채널: 자동 반영 사실 + 원문 대조 권장(커밋 링크 포함)
//   · 공지 채널: 이번 주 식단 업데이트 안내(사이트 링크 + 링크 프리뷰)
//
// ▶ 프리뷰 캐시 무효화
//   슬랙은 "올린 링크의 URL" 단위로 unfurl(프리뷰)을 캐시합니다. 매주 같은 주소를
//   올리면 지난주에 캐시된 프리뷰가 그대로 다시 붙습니다. 그래서 공지 링크에는
//   주차 버전 파라미터를 붙여 매주 다른 URL 로 만듭니다:
//       https://what2eat-d2sf.vercel.app/?v=2026-w15
//   (프리뷰 "이미지"의 캐시는 index.html 의 /api/og?r=<커밋해시> 가 담당 — vite.config.js)
//
// 필요한 환경변수(시크릿): SLACK_BOT_TOKEN, SLACK_CHANNEL_ADMIN, SLACK_CHANNEL_NOTICE
//   (선택) SITE_URL — 공지에 붙일 사이트 주소
//   워크플로우가 주입: MENU_LABEL, MENU_RANGE, MENU_SOURCE, MENU_WEEK_ID,
//                     COMMIT_URL, OG_REV, OG_STATUS
// 봇은 각 채널에 초대돼 있어야 하고 chat:write 권한이 필요합니다.
// ─────────────────────────────────────────────────────────────
const {
  SLACK_BOT_TOKEN,
  SLACK_CHANNEL_ADMIN,
  SLACK_CHANNEL_NOTICE,
  SITE_URL,
  MENU_LABEL,
  MENU_RANGE,
  MENU_SOURCE,
  MENU_WEEK_ID,
  COMMIT_URL,
  OG_REV,
  OG_STATUS,
} = process.env;

if (!SLACK_BOT_TOKEN) {
  console.log("SLACK_BOT_TOKEN 미설정 → 알림을 건너뜁니다.");
  process.exit(0);
}

/** 사이트 주소에 버전 파라미터(?v=<주차id>)를 붙여 슬랙 unfurl 캐시를 우회 */
export function versionedUrl(base, version) {
  if (!base) return "";
  if (!version) return base;
  try {
    const u = new URL(base);
    u.searchParams.set("v", version);
    return u.toString();
  } catch {
    // SITE_URL 이 절대주소가 아니면 문자열로 안전하게 이어 붙인다.
    return `${base}${base.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
  }
}

async function post(channel, text, label, unfurl) {
  if (!channel) {
    console.log(`${label} 채널 미설정 → 건너뜀`);
    return;
  }
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({ channel, text, unfurl_links: unfurl, unfurl_media: unfurl }),
  });
  const j = await res.json();
  if (!j.ok) console.error(`Slack 전송 실패(${label} · ${channel}): ${j.error}`);
  else console.log(`Slack 전송 완료(${label} · ${channel})`);
}

const range = MENU_RANGE ? ` (${MENU_RANGE})` : "";
const noticeUrl = versionedUrl(SITE_URL, MENU_WEEK_ID);

const adminText =
  `🍚 *새 식단 자동 반영* — ${MENU_LABEL}${range}\n` +
  (MENU_SOURCE ? `• 원본: ${MENU_SOURCE}\n` : "") +
  (COMMIT_URL ? `• 커밋: ${COMMIT_URL}\n` : "") +
  (noticeUrl ? `• 공지 링크: ${noticeUrl}${OG_REV ? ` (프리뷰 r=${OG_REV})` : ""}\n` : "") +
  (OG_STATUS && OG_STATUS !== "success"
    ? `🖼️ *OG 프리뷰 이미지 생성 실패* — 프리뷰가 지난 주차로 남습니다. 로컬에서 \`npm run og\` 후 커밋해 주세요.\n`
    : "") +
  `⚠️ 자동 판독이라 오탈자 가능 — 원문과 대조해 주세요.`;

const noticeText =
  `📢 *이번 주 식단이 업데이트됐습니다!*\n${MENU_LABEL}${range}` +
  (noticeUrl ? `\n👉 ${noticeUrl}` : "");

// 관리자 알림은 링크가 많아 프리뷰를 끄고, 공지에는 프리뷰(썸네일)를 띄운다.
await post(SLACK_CHANNEL_ADMIN, adminText, "관리자", false);
await post(SLACK_CHANNEL_NOTICE, noticeText, "공지", true);
