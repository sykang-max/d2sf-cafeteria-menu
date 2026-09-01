// ─────────────────────────────────────────────────────────────
// Slack 알림 — 새 식단이 main 에 반영된 "그 순간" 공지 채널로 1건 전송.
//
// 링크에는 주차별 버전 파라미터(?v=주차id)를 붙입니다.
//   → 같은 사이트지만 Slack 이 "새 URL" 로 보고 링크 프리뷰를 다시 가져오므로,
//     지난주 캐시된 미리보기가 그대로 남는 문제를 피합니다.
//
// 필요한 환경변수(시크릿): SLACK_BOT_TOKEN, SLACK_CHANNEL_NOTICE
//   (선택) SITE_URL — 공지에 붙일 사이트 주소
//   워크플로우가 주입: MENU_LABEL, MENU_RANGE, MENU_WEEK_ID
// 봇은 해당 채널에 초대돼 있어야 하고 chat:write 권한이 필요합니다.
// ─────────────────────────────────────────────────────────────
const { SLACK_BOT_TOKEN, SLACK_CHANNEL_NOTICE, SITE_URL, MENU_LABEL, MENU_RANGE, MENU_WEEK_ID } = process.env;

if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_NOTICE) {
  console.log("SLACK_BOT_TOKEN / SLACK_CHANNEL_NOTICE 미설정 → 알림을 건너뜁니다.");
  process.exit(0);
}

// URL 에 캐시버스터(?v=버전) 부착. 앱 동작엔 영향 없고 Slack/브라우저 캐시만 무효화.
function withVersion(url, v) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (v) u.searchParams.set("v", v);
    return u.toString();
  } catch {
    if (!v) return url;
    return url + (url.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(v);
  }
}

const version = MENU_WEEK_ID || new Date().toISOString().slice(0, 10).replace(/-/g, "");
const link = withVersion(SITE_URL, version);
const range = MENU_RANGE ? ` (${MENU_RANGE})` : "";
const text =
  `📢 *이번 주 식단이 업데이트됐습니다!*\n${MENU_LABEL}${range}` + (link ? `\n👉 ${link}` : "");

const res = await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
  },
  body: JSON.stringify({ channel: SLACK_CHANNEL_NOTICE, text, unfurl_links: true }),
});
const j = await res.json();
if (!j.ok) {
  console.error(`Slack 전송 실패(${SLACK_CHANNEL_NOTICE}): ${j.error}`);
  process.exit(1);
}
console.log(`Slack 공지 전송 완료(${SLACK_CHANNEL_NOTICE}) · link=${link}`);
