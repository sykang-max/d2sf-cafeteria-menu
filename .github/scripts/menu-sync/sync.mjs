// ─────────────────────────────────────────────────────────────
// 식단 자동 동기화 — Google Drive 새 식단 이미지 → Claude(Sonnet) 판독 → 주차 파일 생성
//
// 흐름:
//   1) Drive 폴더에서 최신 이미지 조회
//   2) 이미 처리했거나(이력) 열린 PR 브랜치가 있으면 종료 (API 비용 절약)
//   3) 이미지 다운로드 → Claude Sonnet 비전으로 JSON 전사
//   4) 요일 보정 · 다음 주차 id 계산 · 중복(기간) 검사
//   5) src/data/menu-2026-wN.js 생성 + index.js 등록 + 처리 이력 기록
//   6) GITHUB_OUTPUT 로 changed/branch 등을 넘겨 워크플로우가 PR 생성
//
// 필요한 환경변수(시크릿): ANTHROPIC_API_KEY, GDRIVE_SA_KEY, GDRIVE_FOLDER_ID
//   (GITHUB_TOKEN, GITHUB_REPOSITORY 는 Actions 가 자동 주입)
// ─────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import Anthropic from "@anthropic-ai/sdk";
import { renderWeekModule, updateIndex, fixWeekdays, systemPrompt } from "./lib.mjs";

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "src", "data");
const STATE_FILE = path.join(REPO_ROOT, ".github", "menu-sync", "processed.json");

function setOutput(k, v) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
  console.log(`[output] ${k}=${v}`);
}
function done(changed, extra = {}) {
  setOutput("changed", changed ? "true" : "false");
  for (const [k, v] of Object.entries(extra)) setOutput(k, v);
  process.exit(0);
}

const { ANTHROPIC_API_KEY, GDRIVE_SA_KEY, GDRIVE_FOLDER_ID, GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;

// ── 0) 시크릿 없으면 조용히 종료(실패 메일 방지). 설정 전까지 워크플로우는 휴면 상태. ──
if (!ANTHROPIC_API_KEY || !GDRIVE_SA_KEY || !GDRIVE_FOLDER_ID) {
  console.log("필수 시크릿(ANTHROPIC_API_KEY / GDRIVE_SA_KEY / GDRIVE_FOLDER_ID) 미설정 → 건너뜁니다.");
  done(false);
}

// ── 1) Drive 최신 이미지 ──
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(GDRIVE_SA_KEY),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = google.drive({ version: "v3", auth });
const { data } = await drive.files.list({
  q: `'${GDRIVE_FOLDER_ID}' in parents and trashed = false and mimeType contains 'image/'`,
  orderBy: "createdTime desc",
  pageSize: 10,
  fields: "files(id,name,mimeType,createdTime)",
});
const list = data.files ?? [];
if (list.length === 0) {
  console.log("폴더에 이미지가 없습니다.");
  done(false);
}
const newest = list[0];
console.log(`최신 파일: ${newest.name} (${newest.id})`);

// ── 2) 이미 처리한 파일이면 종료 ──
const processed = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) : [];
if (processed.includes(newest.id)) {
  console.log("이미 처리된 파일입니다 → 종료.");
  done(false);
}

// ── 3) 열린 PR 브랜치가 있으면 종료(중복 PR·API 비용 방지) ──
const shortId = newest.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
const branch = `auto/menu-${shortId}`;
if (GITHUB_TOKEN && GITHUB_REPOSITORY) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/branches/${branch}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
  });
  if (res.status === 200) {
    console.log(`이미 열린 PR 브랜치(${branch})가 있습니다 → 종료.`);
    done(false);
  }
}

// ── 4) 이미지 다운로드 ──
const media = await drive.files.get({ fileId: newest.id, alt: "media" }, { responseType: "arraybuffer" });
const b64 = Buffer.from(media.data).toString("base64");
const mediaType = newest.mimeType?.startsWith("image/") ? newest.mimeType : "image/png";

// ── 5) Claude Sonnet 비전 판독 ──
const client = new Anthropic(); // ANTHROPIC_API_KEY 자동 사용
const msg = await client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 16000,
  system: systemPrompt(),
  messages: [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
        { type: "text", text: "이 식단표 이미지를 지정된 JSON 스키마로 정확히 전사하세요. 설명 없이 JSON 객체만 출력하세요." },
      ],
    },
  ],
});
const rawText = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
let week;
try {
  week = JSON.parse(jsonText);
} catch (e) {
  console.error("전사 JSON 파싱 실패. 모델 응답 앞부분:\n", rawText.slice(0, 2000));
  process.exit(1);
}
if (!week || !Array.isArray(week.sets) || !Array.isArray(week.days) || week.sets.length === 0) {
  console.error("전사 결과 구조가 올바르지 않습니다.");
  process.exit(1);
}

// ── 6) 요일 라벨 재계산(원문 오타 보정) ──
const yearGuess = week.range?.match(/^(\d{4})/)?.[1] || String(new Date().getFullYear());
week.days = fixWeekdays(week.days, yearGuess);

// ── 7) 다음 주차 id 계산 + 중복(기간) 검사 ──
const existing = fs.readdirSync(DATA_DIR).filter((f) => /^menu-2026-w\d+\.js$/.test(f));
let maxN = 0;
let dup = false;
for (const f of existing) {
  const n = Number(f.match(/w(\d+)\.js$/)[1]);
  if (n > maxN) maxN = n;
  const m = fs.readFileSync(path.join(DATA_DIR, f), "utf8").match(/range:\s*"([^"]+)"/);
  if (m && week.range && m[1] === week.range) dup = true;
}
if (dup) {
  console.log(`이미 등록된 기간(${week.range}) → 종료.`);
  done(false);
}
const nextN = maxN + 1;
week.id = `2026-w${nextN}`;

// ── 8) 파일 렌더 + 인덱스 등록 + 이력 기록 ──
fs.writeFileSync(path.join(DATA_DIR, `menu-2026-w${nextN}.js`), renderWeekModule(week), "utf8");
updateIndex(DATA_DIR, nextN);
processed.push(newest.id);
fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
fs.writeFileSync(STATE_FILE, JSON.stringify(processed, null, 2) + "\n", "utf8");

console.log(`생성: menu-2026-w${nextN}.js  (${week.label} · ${week.range})`);
done(true, { branch, label: week.label || week.id, week_id: week.id, source: newest.name });
