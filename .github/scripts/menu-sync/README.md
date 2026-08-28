# 식단 자동 업데이트 (Google Drive → Claude Sonnet → PR)

구글 드라이브 식단 폴더를 주기적으로 확인해서, **새 식단 이미지가 올라오면**
Claude(Sonnet)로 판독 → `src/data/menu-2026-wN.js` 생성 → **PR 을 자동으로 올립니다.**
자동 병합은 하지 않습니다. 사람이 PR 을 확인·수정 후 머지하면 Vercel 이 배포합니다.

## 동작 방식

```
GitHub Actions cron (월·목 08:00 KST)
  → Drive 폴더 최신 이미지 조회
  → 이미 처리했거나 열린 PR 이 있으면 종료 (API 비용 0)
  → 이미지 다운로드 → Claude Sonnet 비전 판독(JSON)
  → 요일 보정 · 다음 주차 id 계산 · 기간 중복 검사
  → 파일 생성 + index.js 등록 + 빌드 검증
  → PR 생성  (사람이 검토·머지)
```

## 최초 1회 설정 (필수 시크릿 3개)

설정 전까지 워크플로우는 **휴면 상태**로 돌며 아무 일도 하지 않습니다(실패 메일 없음).

### 1. `ANTHROPIC_API_KEY`

- [Anthropic Console](https://console.anthropic.com/) → API Keys 에서 발급.
- 판독은 `claude-sonnet-5` 모델을 씁니다. 1회 판독 비용 ≈ $0.05~0.1 수준.

### 2. `GDRIVE_SA_KEY` — 구글 서비스 계정 키(JSON)

1. [Google Cloud Console](https://console.cloud.google.com/) 에서 프로젝트 생성(또는 선택).
2. **APIs & Services → Library → "Google Drive API" 사용 설정.**
3. **APIs & Services → Credentials → Create credentials → Service account** 생성.
4. 그 서비스 계정에서 **Keys → Add key → JSON** 다운로드.
5. **중요:** 식단이 올라오는 **드라이브 폴더를 서비스 계정 이메일에 "뷰어"로 공유**하세요.
   (서비스 계정 이메일은 `xxxx@yyyy.iam.gserviceaccount.com` 형태 — 폴더 우클릭 → 공유 → 이 이메일 추가)
6. 다운로드한 **JSON 파일 내용 전체**를 이 시크릿 값으로 붙여넣습니다.

### 3. `GDRIVE_FOLDER_ID`

- 식단표가 올라오는 드라이브 폴더 URL 의 마지막 부분.
- 예: `https://drive.google.com/drive/folders/1qwHK9iqxGR5R6Ur1ZBxqNVK3Rc4DV85-`
  → 폴더 ID 는 `1qwHK9iqxGR5R6Ur1ZBxqNVK3Rc4DV85-`

### 시크릿 등록 위치

저장소 → **Settings → Secrets and variables → Actions → New repository secret** 에서
위 3개를 각각 추가합니다. (`GITHUB_TOKEN` 은 Actions 가 자동 제공하므로 등록 불필요.)

## 테스트 / 수동 실행

저장소 → **Actions → "식단 자동 업데이트" → Run workflow** 로 즉시 실행할 수 있습니다.
새 이미지가 있으면 PR 이, 없으면 "changed=false" 로 조용히 종료됩니다.

## 스케줄 변경

`.github/workflows/menu-auto-update.yml` 의 `cron` 값을 바꾸세요(UTC 기준).
현재: `0 23 * * 0,3` = 매주 월·목 08:00(KST).

## 중복 방지

- `.github/menu-sync/processed.json` 에 처리한 드라이브 파일 ID 를 기록합니다(PR 에 포함 → 머지 시 확정).
- 이미 같은 **기간(range)** 의 주차 파일이 있으면 건너뜁니다.
- 같은 파일로 **열린 PR 브랜치**가 있으면 새 API 호출 없이 종료합니다.

## 한계 (알아두기)

- 자동 판독은 작은 글씨·사이드 항목·kcal 에서 오차가 날 수 있습니다 → **PR 검토 필수.**
- 무료 cron 은 실행 시각이 수 분~수십 분 지연될 수 있습니다(식단엔 영향 없음).
- 판독 불가 칸은 `(판독불가)` 로 남으니 PR 에서 채워 주세요.
