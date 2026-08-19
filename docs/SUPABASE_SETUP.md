# 커뮤니티 기능 설정 — Supabase (한줄 리뷰 · 이모지 별점)

이 문서대로 **한 번만** 세팅하면 리뷰·별점·랭킹이 켜집니다.
키를 넣기 전까지는 기능이 자동으로 숨겨지고 기존 식단표는 그대로 동작합니다.

소요 시간: 약 5분. 서버 관리 필요 없음(서버리스).

---

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 가입 → **New project** 생성 (Region은 `Northeast Asia (Seoul)` 권장).
2. 프로젝트가 준비될 때까지 1~2분 대기.

## 2. DB 스키마 실행

1. 좌측 메뉴 **SQL Editor** → **New query**.
2. 저장소의 [`supabase/schema.sql`](../supabase/schema.sql) 내용을 통째로 붙여넣고 **Run**.
   - 테이블 `menu_reviews`, 통계 뷰 `menu_review_stats`, RLS 정책, Realtime 설정이 한 번에 생성됩니다.
   - 다시 실행해도 안전합니다. (맨 마지막 `alter publication ... add table` 만 "이미 있음" 에러가 날 수 있는데, 그 경우 그 줄은 무시하면 됩니다.)

## 3. 익명 로그인 켜기 (필수)

닉네임 없이 바로 참여시키기 위해 익명 로그인을 씁니다.

- **Authentication → Providers → Anonymous sign-ins** 를 **Enable**.
  (또는 Authentication → Sign In / Providers 에서 "Allow anonymous sign-ins" 토글)

> 익명 로그인을 켜지 않으면 리뷰 제출이 실패합니다(읽기는 됨).

## 4. 키 두 개 복사

**Project Settings → API** 에서:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

> `anon` 키는 브라우저에 노출되는 **공개 키**입니다. 실제 권한은 위에서 만든 **RLS 정책**이
> 통제하므로 노출돼도 안전합니다. (절대 `service_role` 키는 프런트엔드에 넣지 마세요.)

## 5. 로컬에서 켜기

프로젝트 루트에 `.env.local` 생성 (`.env.example` 복사):

```bash
cp .env.example .env.local
```

```dotenv
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

```bash
npm run dev     # 이제 각 메뉴에 "＋평가" 칩과 상단 "🏆 랭킹" 버튼이 보입니다
```

`.env.local` 은 `.gitignore` 로 커밋에서 제외됩니다.

## 6. Vercel 배포에 켜기

Vercel 프로젝트 → **Settings → Environment Variables** 에 아래 2개 추가
(Environment: **Production / Preview / Development** 모두 체크):

| Key | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` |

저장 후 **Redeploy** (환경변수는 빌드 시 주입되므로 재배포 필요).

---

## 동작 방식 요약

- **평가**: 메뉴 항목의 `＋평가`(또는 대표 이모지·표 수) 칩 → 🔥/👍/😐/💀 즉시 투표 + 선택적 한줄평.
  유저(브라우저)당 메뉴 1표, 다시 누르면 표가 갱신됩니다.
- **누적/과거 평점**: 리뷰는 **메뉴 이름**으로 누적되어, 다음 주 같은 메뉴가 나와도 과거 평점이 그대로 보입니다.
- **랭킹**: 상단 `🏆 랭킹` → 누적 평균 점수 상위 메뉴. 최소 3표 이상만 노출.
- **실시간**: 다른 사람이 평가하면 Realtime 으로 통계가 자동 갱신됩니다.

## 안전장치

- 모든 쓰기는 **본인 행(`auth.uid() = user_id`)만** 가능하도록 RLS 로 제한.
- 한줄평은 140자 제한.
- 키 미설정 시 커뮤니티 UI는 렌더되지 않음(기존 사이트 무영향).
