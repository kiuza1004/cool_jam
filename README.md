# Cool Jam 🌙

잠 못 드는 밤을 위한 수면 보조 웹앱.

## 기능

- **사운드 믹서** — 빗소리, 파도 소리, 백색·핑크·브라운 노이즈, 명상 톤을 자유롭게 섞을 수 있어요. Web Audio API로 실시간 합성되므로 외부 파일이 필요 없습니다.
- **4-7-8 호흡 가이드** — 4초 들이쉬고, 7초 멈추고, 8초 내쉬는 호흡법을 시각적인 원으로 안내해요.
- **슬립 타이머** — 지정한 시간 후 소리가 부드럽게 사라지며 자연스럽게 잠들 수 있도록 도와줘요.

## 개발

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 으로 접속하세요.

## 기술 스택

- Next.js 16 (App Router) + Turbopack
- React 19
- TypeScript
- Tailwind CSS 4
- Web Audio API
