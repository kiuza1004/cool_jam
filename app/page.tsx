import { Breathing } from "./_components/breathing";
import { SleepTimer } from "./_components/sleep-timer";
import { SoundMixer } from "./_components/sound-mixer";
import { Stars } from "./_components/stars";

export default function Home() {
  return (
    <div className="relative flex-1 overflow-hidden">
      <Stars />
      <main className="relative z-10 max-w-5xl mx-auto px-5 py-10 sm:py-16">
        <header className="mb-10 sm:mb-14 text-center">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-[var(--fg-muted)] glass rounded-full px-3 py-1">
            <span aria-hidden>🌙</span>
            <span>Cool Jam</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">
            오늘 밤,
            <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] bg-clip-text text-transparent">
              {" "}
              더 깊은 잠으로
            </span>
          </h1>
          <p className="mt-4 text-[var(--fg-muted)] text-sm sm:text-base max-w-xl mx-auto">
            잔잔한 소리, 호흡 가이드, 그리고 슬립 타이머. 잠들기까지의 길을 부드럽게 안내해요.
          </p>
        </header>

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <SoundMixer />
          </div>
          <Breathing />
          <SleepTimer />
        </div>

        <footer className="mt-14 text-center text-xs text-[var(--fg-muted)]">
          편안한 밤 보내세요 · 화면을 어둡게 두고 사용해보세요
        </footer>
      </main>
    </div>
  );
}
