/** @type {import('tailwindcss').Config} */
// content 글롭이 index.html과 src의 모든 jsx를 포함하므로
// text-[14px], gap-x-4 등 arbitrary 유틸리티가 JIT로 정상 생성됩니다.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        subway: {
          green: "#008C15",
          "green-dark": "#007512",
          "green-soft": "#E6F4E8",
          yellow: "#FFC500",
          "yellow-soft": "#FFF4CC",
          charcoal: "#1A1A1A",
        },
      },
    },
  },
  plugins: [],
};
