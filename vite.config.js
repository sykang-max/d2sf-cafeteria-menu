import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 정적 사이트 빌드 (출력: dist/).
// Vercel / Netlify: 추가 base 설정 없이 그대로 사용.
// GitHub Pages로 배포할 경우에만 아래 base 주석을 해제하고 리포지토리명으로 변경하세요.
//   base: "/<repository-name>/",
export default defineConfig({
  plugins: [react()],
});
