// ─────────────────────────────────────────────────────────────
// 익명 닉네임 + 소속(선택) — 브라우저 localStorage 에 저장하는 "정체성"
//   닉네임: 형용사 + 동물 (예: "배고픈 라쿤"). 부담 없이 참여하도록 랜덤 부여.
//   소속:   선택 입력(예: "3층 개발팀"). 익명은 유지하되 원하면 식별 정보로 표시.
// ─────────────────────────────────────────────────────────────

const ADJ = [
  "배고픈", "든든한", "느긋한", "행복한", "나른한", "용감한", "수줍은", "엉뚱한",
  "포근한", "날렵한", "심심한", "까칠한", "상큼한", "묵직한", "부지런한", "졸린",
  "신난", "차분한", "몽글한", "발랄한", "겸손한", "우아한", "장난꾸러기", "따뜻한",
];

const ANIMAL = [
  "라쿤", "너구리", "판다", "수달", "고양이", "다람쥐", "펭귄", "알파카",
  "햄스터", "여우", "곰", "토끼", "올빼미", "고슴도치", "코알라", "물개",
  "카피바라", "돌고래", "치타", "미어캣", "두더지", "왈라비", "삵", "청설모",
];

const KEY = "what2eat-identity";

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** "배고픈 라쿤" 형태의 랜덤 닉네임 */
export const randomNickname = () => `${pick(ADJ)} ${pick(ANIMAL)}`;

/** 저장된 정체성을 읽어옵니다. 없으면 랜덤 닉으로 새로 만들어 저장 후 반환. */
export function loadIdentity() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (v && v.nickname) return { nickname: v.nickname, affiliation: v.affiliation || "" };
    }
  } catch {}
  const fresh = { nickname: randomNickname(), affiliation: "" };
  saveIdentity(fresh);
  return fresh;
}

/** 정체성 저장. nickname 은 비면 랜덤으로 대체, 길이 제한 적용. */
export function saveIdentity({ nickname, affiliation }) {
  const clean = {
    nickname: (nickname || "").trim().slice(0, 20) || randomNickname(),
    affiliation: (affiliation || "").trim().slice(0, 20),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {}
  return clean;
}
