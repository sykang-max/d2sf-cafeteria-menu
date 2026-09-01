// ─────────────────────────────────────────────────────────────
// Slack 알림 — 새 식단이 main 에 반영된 "그 순간" 공지 채널로 1건 전송.
//
// 필요한 환경변수(시크릿): SLACK_BOT_TOKEN, SLACK_CHANNEL_NOTICE
//   (선택) SITE_URL — 공지에 붙일 사이트 주소
//   워크플로우가 주입: MENU_LABEL, MENU_RANGE
// 봇은 해당 채널에 초대돼 있어야 하고 chat:write 권한이 필요합니다.
// ─────────────────────────────────────────────────────────────
const { SLACK_BOT_TOKEN, SLACK_CHANNEL_NOTICE, SITE_URL, MENU_LABEL, MENU_RANGE } = process.env;

if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_NOTICE) {
  console.log("SLACK_BOT_TOKEN / SLACK_CHANNEL_NOTICE 미설정 → 알림을 건너뜁니다.");
  process.exit(0);
}

const range = MENU_RANGE ? ` (${MENU_RANGE})` : "";
const text =
  `📢 *이번 주 식단이 업데이트됐습니다!*\n${MENU_LABEL}${range}` +
  (SITE_URL ? `\n👉 ${SITE_URL}` : "");

const res = await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
  },
  body: JSON.stringify({ channel: SLACK_CHANNEL_NOTICE, text, unfurl_links: false }),
});
const j = await res.json();
if (!j.ok) {
  console.error(`Slack 전송 실패(${SLACK_CHANNEL_NOTICE}): ${j.error}`);
  process.exit(1);
}
console.log(`Slack 공지 전송 완료(${SLACK_CHANNEL_NOTICE})`);
