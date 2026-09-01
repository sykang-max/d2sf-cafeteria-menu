# 식단 자동 업데이트 (Google Drive → Claude Sonnet → main 반영 → Slack)

구글 드라이브 식단 폴더를 주기적으로 확인해서, **새 식단 이미지가 올라오면**
Claude(Sonnet)로 판독 → `src/data/menu-2026-wN.js` 생성 → **main 에 자동 반영** →
**Slack 알림 2건**(관리자 채널 + 공지 채널)을 보냅니다. main 반영 시 Vercel 이 배포합니다.

## 동작 방식

```
GitHub Actions cron (월 11:00 · 목 18:00 KST)
  → Drive 폴더 최신 이미지 조회
  → 이미 처리한 파일이면 종료 (API 비용 0)
  → 이미지 다운로드 → Claude Sonnet 비전 판독(JSON)
  → 요일 보정 · 다음 주차 id 계산 · 기간 중복 검사
  → 파일 생성 + index.js 등록 + 빌드 검증
  → main 에 커밋·푸시 (자동 반영) → Vercel 배포
  → Slack 공지:  공지 채널에 "이번 주 식단 업데이트" 1건
```

> ⚠️ 검토 없이 **자동 반영**되므로, 자동 판독 오차가 그대로 게시될 수 있습니다.
> 관리자 채널 알림의 커밋 링크로 확인하고, 필요하면 수정 커밋으로 바로잡으세요.

## 최초 1회 설정 (GitHub Secrets)

저장소 → **Settings → Secrets and variables → Actions → New repository secret**.
설정 전까지 워크플로우는 **휴면 상태**로 돌며 아무 일도 하지 않습니다(실패 메일 없음).

### 판독 · 드라이브 (필수)

| 시크릿 | 값 |
|---|---|
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) 발급 키. 판독은 `claude-sonnet-5`. |
| `GDRIVE_SA_KEY` | 구글 서비스 계정 JSON 키 **전체 내용** (아래 참고) |
| `GDRIVE_FOLDER_ID` | 식단 폴더 URL 끝부분 ID (예: `.../folders/1qwHK9i...` → `1qwHK9i...`) |

`GDRIVE_SA_KEY` 만드는 법(한 번만):
1. [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트에서 **Google Drive API** 사용 설정.
2. **Credentials → Create credentials → Service account** 생성 → **Keys → Add key → JSON** 다운로드.
3. **식단 폴더를 서비스 계정 이메일(`...@....iam.gserviceaccount.com`)에 "뷰어"로 공유.**
4. JSON 파일 내용 전체를 시크릿 값으로 붙여넣기.

### Slack 공지 (선택 — 없으면 알림만 건너뜀)

식단 반영 시 **공지 채널 1곳에 1건** 보냅니다.

| 시크릿 | 값 |
|---|---|
| `SLACK_BOT_TOKEN` | 슬랙 앱(봇) 토큰 `xoxb-...` — 봇에 `chat:write` 권한 필요 |
| `SLACK_CHANNEL_NOTICE` | 공지 채널 ID (예: `C0123ABCD`) |
| `SITE_URL` | (선택) 공지에 붙일 사이트 주소 |

- 봇을 **공지 채널에 초대**(`/invite @봇이름`)해야 전송됩니다.
- 채널 ID 는 슬랙에서 채널 이름 클릭 → 팝업 하단, 또는 채널 링크 끝부분.
- (참고) `SLACK_CHANNEL_ADMIN` 은 더 이상 사용하지 않습니다.

## 테스트 / 수동 실행

저장소 → **Actions → "식단 자동 업데이트" → Run workflow**.
새 이미지가 있으면 반영+알림이, 없으면 "changed=false" 로 조용히 종료됩니다.

## 스케줄 변경

`.github/workflows/menu-auto-update.yml` 의 `cron`(UTC 기준)을 수정하세요. 현재:
- `0 2 * * 1` = 월 11:00 KST
- `0 9 * * 4` = 목 18:00 KST

## 중복 방지

- `.github/menu-sync/processed.json` 에 처리한 드라이브 파일 ID 를 기록(같은 커밋에 포함).
- 이미 같은 **기간(range)** 의 주차 파일이 있으면 건너뜁니다.

## 한계

- 자동 판독은 작은 글씨·사이드 항목·kcal 에서 오차가 날 수 있습니다.
- 판독 불가 칸은 `(판독불가)` 로 남으니 커밋에서 채워 주세요.
- 무료 cron 은 실행 시각이 수 분~수십 분 지연될 수 있습니다(식단엔 영향 없음).
