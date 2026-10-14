import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

// index.html 의 og:image / twitter:image 에 붙는 배포 리비전.
// 슬랙·카카오는 "이미지 URL" 단위로 썸네일을 캐시하므로, 배포마다 값이 달라져야
// 매주 같은 주소로 올리는 공지에서도 새 프리뷰가 보입니다.
//   1) OG_REV            — 직접 지정(수동 배포·디버깅용)
//   2) VERCEL_GIT_COMMIT_SHA / GITHUB_SHA — 배포 커밋 해시 앞 7자
//   3) 로컬 git HEAD     — 개발 중
//   4) VERCEL_DEPLOYMENT_ID — 커밋 해시를 못 얻는 배포 환경의 안전망(배포마다 고유)
//   5) "dev"             — 그 무엇도 없을 때(로컬 개발)
function ogRevision() {
  if (process.env.OG_REV) return process.env.OG_REV.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 40) || "dev";
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    /* Vercel 빌드 컨테이너에는 .git 이 없을 수 있다 */
  }
  const dpl = process.env.VERCEL_DEPLOYMENT_ID;
  return dpl ? dpl.replace(/[^A-Za-z0-9]/g, "").slice(-7) : "dev";
}

// index.html 의 %OG_REV% 자리표시자를 치환 (dev 서버·빌드 모두 적용)
function ogRevisionPlugin() {
  const rev = ogRevision();
  return {
    name: "og-revision",
    transformIndexHtml: {
      order: "pre",
      handler: (html) => html.replaceAll("%OG_REV%", rev),
    },
  };
}

// 정적 사이트 빌드 (출력: dist/).
// Vercel / Netlify: 추가 base 설정 없이 그대로 사용.
// GitHub Pages로 배포할 경우에만 아래 base 주석을 해제하고 리포지토리명으로 변경하세요.
//   base: "/<repository-name>/",
export default defineConfig({
  plugins: [react(), ogRevisionPlugin()],
});
