// ─────────────────────────────────────────────────────────────
// Slack 알림 — 새 식단이 main 에 반영된 "그 순간" 두 채널로 전송.
//   · 관리자 채널: 자동 반영 사실 + 원문 대조 권장(커밋 링크 포함)
//   · 공지 채널: 이번 주 식단 업데이트 안내(사이트 링크)
//
// 필요한 환경변수(시크릿): SLACK_BOT_TOKEN, SLACK_CHANNEL_ADMIN, SLACK_CHANNEL_NOTICE
//   (선택) SITE_URL — 공지에 붙일 사이트 주소
//   워크플로우가 주입: MENU_LABEL, MENU_RANGE, MENU_SOURCE, COMMIT_URL
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
  COMMIT_URL,
} = process.env;

if (!SLACK_BOT_TOKEN) {
  console.log("SLACK_BOT_TOKEN 미설정 → 알림을 건너뜁니다.");
  process.exit(0);
}

async function post(channel, text, label) {
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
    body: JSON.stringify({ channel, text, unfurl_links: false }),
  });
  const j = await res.json();
  if (!j.ok) console.error(`Slack 전송 실패(${label} · ${channel}): ${j.error}`);
  else console.log(`Slack 전송 완료(${label} · ${channel})`);
}

const range = MENU_RANGE ? ` (${MENU_RANGE})` : "";
const adminText =
  `🍚 *새 식단 자동 반영* — ${MENU_LABEL}${range}\n` +
  (MENU_SOURCE ? `• 원본: ${MENU_SOURCE}\n` : "") +
  (COMMIT_URL ? `• 커밋: ${COMMIT_URL}\n` : "") +
  `⚠️ 자동 판독이라 오탈자 가능 — 원문과 대조해 주세요.`;

const noticeText =
  `📢 *이번 주 식단이 업데이트됐습니다!*\n${MENU_LABEL}${range}` +
  (SITE_URL ? `\n👉 ${SITE_URL}` : "");

await post(SLACK_CHANNEL_ADMIN, adminText, "관리자");
await post(SLACK_CHANNEL_NOTICE, noticeText, "공지");
