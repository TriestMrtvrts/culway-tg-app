import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * CulWay — Telegram WebApp (single-file React component)
 *
 * Features implemented:
 * - Registration screen: avatar upload (camera/gallery), email, login, display name, bio
 * - Preferences screen: multi-select interests
 * - Home screen: routes feed with filter & favorites ("map" icon), detail drawer
 * - Camera + Geolocation permission requests (with graceful fallbacks)
 * - Telegram Web Apps SDK integration (safe if not present): theme sync, expand, haptics, MainButton
 * - Lightweight state persistence via localStorage (profile, prefs, favorites)
 * - Mobile-first UI styled with Tailwind (brown/beige palette matching provided mockups)
 *
 * How to use in Telegram:
 * 1) Deploy this app (any static hosting). Ensure it’s served over HTTPS (required for camera/geo).
 * 2) In your Telegram bot, send a reply keyboard button with `web_app` pointing to your URL.
 * 3) The app uses `window.Telegram?.WebApp` if available; otherwise it works in a normal browser too.
 */

// ---- Palette & small helpers ----
const palette = {
  coffee: "#4a2b1a", // dark brown header
  latte: "#efe0d3", // light background
  caramel: "#7b4b31", // buttons
  cream: "#f2dfcf", // cards
  shadow: "#00000022",
};

const SUPPORT = { username: "only_ashes_know" } as const; // ← впиши свой ник без @
function openSupportChat() {
  const url = `https://t.me/${SUPPORT.username}`;
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else window.location.href = url;
}

const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : undefined;
// Telegram user helper (Mini Apps)
function getTelegramUser() {
  try {
    const u = (tg as any)?.initDataUnsafe?.user;
    if (!u) return null;
    return { id: u.id, username: u.username, first_name: u.first_name, last_name: u.last_name, language_code: u.language_code };
  } catch { return null; }
}

async function persistUserIfAny() {
  const u = getTelegramUser();
  if (!u) return;
  try { localStorage.setItem("cw.tg_user", JSON.stringify(u)); } catch {}
  // OPTIONAL: отправить на ваш бэкенд для верификации initData (см. раздел 3)
  // await fetch("/api/save-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: (tg as any)?.initData, user: u }) });
}

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

// ---- Types ----
interface Profile {
  avatarDataUrl?: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
}

type Category =
  | "Наука и образование"
  | "Активный отдых"
  | "Искусство"
  | "Еда и напитки"
  | "Развлечения"
  | "Мода и красота"
  | "Музыка";

interface RouteCard {
  id: string;
  title: string;
  short: string;
  rating: number;
  category: Category;
  image?: string; // placeholder gray block if not provided
}

// ---- Mock data ----
const ALL_ROUTES: RouteCard[] = [
  {
    id: "rt1",
    title: "Калининград: арт & набережные",
    short: "Музеи, набережные, кофе и закаты",
    rating: 4.78,
    category: "Искусство",
  },
  {
    id: "rt2",
    title: "Сочи: горы и морской бриз",
    short: "Тропа здоровья, виды и хмели-сунели",
    rating: 4.82,
    category: "Активный отдых",
  },
  {
    id: "rt3",
    title: "Казань: вкус жизни",
    short: "Чак-чак, плов и гастро-рынки",
    rating: 4.71,
    category: "Еда и напитки",
  },
  {
    id: "rt4",
    title: "Санкт-Петербург: научные открытия",
    short: "Планетарий, ИТМО, кунсткамера",
    rating: 4.76,
    category: "Наука и образование",
  },
  {
    id: "rt5",
    title: "Москва by night",
    short: "Арт-кварталы и вечерние концерты",
    rating: 4.80,
    category: "Музыка",
  },
];

// ---- Root App ----
export default function CulWayWebApp() {
  const [step, setStep] = useLocalStorage<"register" | "prefs" | "home">(
    "cw.step",
    "register"
  );

  const [profile, setProfile] = useLocalStorage<Profile>("cw.profile", {
    email: "",
    username: "",
    displayName: "",
    bio: "",
  });

  const [prefs, setPrefs] = useLocalStorage<Category[]>("cw.prefs", []);
  const [favorites, setFavorites] = useLocalStorage<string[]>("cw.favs", []);
  const [filter, setFilter] = useLocalStorage<"all" | Category>("cw.filter", "all");

  // Telegram bootstrap
  useEffect(() => {
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor(palette.coffee);
      tg.setBackgroundColor(palette.latte);
      tg.HapticFeedback?.impactOccurred("light");
      persistUserIfAny();
    } catch {}
  }, []);

  const startApp = () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
    setStep("prefs");
  };

  const finishPrefs = () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");
    setStep("home");
  };

  return (
    <div
      className="min-h-[100svh] w-full pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+64px)]"
      style={{ background: palette.latte }}
    >
      <Header onMapClick={() => {}} onProfileClick={() => setStep("register")} />

      {step === "register" && (
        <RegistrationScreen
          profile={profile}
          setProfile={setProfile}
          onContinue={startApp}
        />
      )}

      {step === "prefs" && (
        <PreferencesScreen
          value={prefs}
          onChange={setPrefs}
          onContinue={finishPrefs}
        />
      )}

      {step === "home" && (
        <HomeScreen
          prefs={prefs}
          favorites={favorites}
          setFavorites={setFavorites}
          filter={filter}
          setFilter={setFilter}
        />
      )}

      <FooterSupport />
    </div>
  );
}

// ---- UI: Header & Footer ----
function Header({ onMapClick, onProfileClick }: { onMapClick: () => void; onProfileClick: () => void }) {
  return (
    <div
      className="sticky top-0 z-20 flex items-center justify-between px-5 py-3"
      style={{ background: palette.coffee, color: "#f8efe7" }}
    >
      <div className="text-2xl font-semibold tracking-wide" style={{ fontFamily: "'Amatic SC', cursive" }}>
        CulWay
      </div>
      <div className="flex items-center gap-5">
        <button
          aria-label="Map"
          onClick={onMapClick}
          className="text-3xl"
          title="Карта"
        >
          🗺️
        </button>
        <button
          aria-label="Profile"
          onClick={onProfileClick}
          className="text-3xl"
          title="Профиль"
        >
          👤
        </button>
      </div>
    </div>
  );
}

function FooterSupport() {
  return (
    <div className="py-10 text-center text-sm text-neutral-600">
      Техническая поддержка:{" "}
      <button
        type="button"
        onClick={openSupportChat}
        className="underline"
        aria-label="Написать в поддержку"
      >
        Написать
      </button>
    </div>
  );
}

// ---- Screen: Registration ----
function RegistrationScreen({
  profile,
  setProfile,
  onContinue,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  onContinue: () => void;
}) {
  const [reqPending, setReqPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const requestCamera = async () => {
    setReqPending(true);
    try {
      const stream = await navigator.mediaDevices?.getUserMedia({ video: true });
      stream?.getTracks().forEach((t) => t.stop());
      tg?.HapticFeedback?.notificationOccurred("success");
      alert("Камера доступна ✅");
    } catch (e) {
      tg?.HapticFeedback?.notificationOccurred("error");
      alert("Не удалось получить доступ к камере. Разрешите доступ в браузере.");
    } finally {
      setReqPending(false);
    }
  };

  const requestGeo = async () => {
    setReqPending(true);
    try {
      await new Promise<void>((resolve, reject) => {
        if (!navigator.geolocation) return reject("Geo not supported");
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          () => reject("denied"),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
      tg?.HapticFeedback?.notificationOccurred("success");
      alert("Геопозиция доступна ✅");
    } catch {
      tg?.HapticFeedback?.notificationOccurred("error");
      alert("Нет доступа к геопозиции. Разрешите доступ в настройках.");
    } finally {
      setReqPending(false);
    }
  };

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile({ ...profile, avatarDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const canContinue = profile.email && profile.username && profile.displayName;

  return (
    <div className="px-5 py-6">
      <BackTitle title="Регистрация" />

      <div className="mt-6 flex flex-col items-center gap-5">
        <div
          className="h-48 w-48 rounded-2xl bg-neutral-300"
          style={{ boxShadow: `8px 12px 0 ${palette.shadow}` }}
        >
          {profile.avatarDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="avatar"
              src={profile.avatarDataUrl}
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-500">Аватар</div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            className="rounded-xl px-4 py-2 text-base"
            style={{ background: palette.caramel, color: "#f7efe7" }}
            onClick={() => fileRef.current?.click()}
          >
            Загрузить
          </button>
          <input
            ref={fileRef}
            onChange={onPickAvatar}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          <button
            disabled={reqPending}
            className="rounded-xl px-4 py-2 text-base disabled:opacity-60"
            style={{ background: palette.caramel, color: "#f7efe7" }}
            onClick={requestCamera}
          >
            Камера
          </button>
          <button
            disabled={reqPending}
            className="rounded-xl px-4 py-2 text-base disabled:opacity-60"
            style={{ background: palette.caramel, color: "#f7efe7" }}
            onClick={requestGeo}
          >
            Гео
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <LabeledInput
          label="Почта"
          placeholder="you@example.com"
          type="email"
          value={profile.email}
          onChange={(v: string) => setProfile({ ...profile, email: v })}
        />

        <LabeledInput
          label="Логин"
          placeholder="nickname"
          value={profile.username}
          onChange={(v: string) => setProfile({ ...profile, username: v })}
        />

        <LabeledInput
          label="Имя пользователя"
          placeholder="Ваше имя"
          value={profile.displayName}
          onChange={(v: string) => setProfile({ ...profile, displayName: v })}
        />

        <LabeledTextarea
          label="Расскажите о себе"
          placeholder="Пара слов о ваших интересах"
          value={profile.bio}
          onChange={(v: string) => setProfile({ ...profile, bio: v })}
        />
      </div>

      <div className="mt-8">
        <PrimaryButton disabled={!canContinue} onClick={onContinue}>
          Продолжить
        </PrimaryButton>
      </div>
    </div>
  );
}

// ---- Screen: Preferences ----
const ALL_CATEGORIES: Category[] = [
  "Наука и образование",
  "Активный отдых",
  "Искусство",
  "Еда и напитки",
  "Развлечения",
  "Мода и красота",
  "Музыка",
];

function PreferencesScreen({
  value,
  onChange,
  onContinue,
}: {
  value: Category[];
  onChange: (c: Category[]) => void;
  onContinue: () => void;
}) {
  const toggle = (cat: Category) => {
    if (value.includes(cat)) onChange(value.filter((c) => c !== cat));
    else onChange([...value, cat]);
  };

  return (
    <div className="px-5 py-6">
      <div className="mt-3 text-center text-3xl font-bold" style={{ color: palette.latte }}>
        <div
          className="mx-auto mb-6 max-w-[90%] rounded-2xl px-3 py-4 text-2xl leading-snug"
          style={{ background: palette.coffee, color: "#f6eae0" }}
        >
          Выберите направления, которые вам интересны
          <div className="mt-2 text-base opacity-80">
            Маршруты в ленте будут подбираться с учётом ваших интересов
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {ALL_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            className={`w-full rounded-2xl border-2 px-4 py-4 text-left text-xl ${
              value.includes(c)
                ? "border-transparent"
                : "border-[" + palette.coffee + "]"
            }`}
            style={{
              background: value.includes(c) ? palette.caramel : "transparent",
              color: value.includes(c) ? "#f8efe7" : palette.coffee,
            }}
          >
            {labelFromCategory(c)}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <PrimaryButton onClick={onContinue}>Продолжить</PrimaryButton>
      </div>
    </div>
  );
}

function labelFromCategory(c: Category) {
  const map: Record<Category, string> = {
    "Наука и образование": "Знания и открытия (\"наука и образование\")",
    "Активный отдых": "Движение и энергия (активный отдых)",
    "Искусство": "Творчество и вдохновение (искусство)",
    "Еда и напитки": "Вкус жизни (еда и напитки)",
    "Развлечения": "Веселье и игры (развлечения)",
    "Мода и красота": "Стиль и уход (мода и красота)",
    "Музыка": "Звуки и ритмы (музыка)",
  };
  return map[c];
}

// ---- Screen: Home ----
function HomeScreen({
  prefs,
  favorites,
  setFavorites,
  filter,
  setFilter,
}: {
  prefs: Category[];
  favorites: string[];
  setFavorites: (ids: string[]) => void;
  filter: "all" | Category;
  setFilter: (f: "all" | Category) => void;
}) {
  const [queryOpen, setQueryOpen] = useState(false);
  const [detail, setDetail] = useState<RouteCard | null>(null);

  // Prefer categories selected in prefs at the top
  const sorted = useMemo(() => {
    const list = [...ALL_ROUTES];
    list.sort((a, b) => {
      const ai = prefs.includes(a.category) ? 0 : 1;
      const bi = prefs.includes(b.category) ? 0 : 1;
      if (ai !== bi) return ai - bi;
      return b.rating - a.rating;
    });
    return list;
  }, [prefs]);

  const filtered = sorted.filter((r) => (filter === "all" ? true : r.category === filter));

  const toggleFav = (id: string) => {
    setFavorites(
      favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id]
    );
    tg?.HapticFeedback?.impactOccurred("light");
  };

  return (
    <div className="px-5 py-6">
      <BackTitle title="Лента маршрутов" />

      {/* Filter */}
      <div className="mt-3">
        <button
          className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-xl"
          style={{ background: palette.coffee, color: "#f6eae0" }}
          onClick={() => setQueryOpen((x) => !x)}
        >
          Фильтр
          <span className="text-2xl">▾</span>
        </button>
        {queryOpen && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Все</FilterChip>
            {ALL_CATEGORIES.map((c) => (
              <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
                {c}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="mt-4 space-y-5">
        {filtered.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl p-4"
            style={{ background: palette.caramel + "cc", color: "#f7efe7", boxShadow: `8px 12px 0 ${palette.shadow}` }}
          >
            <div className="flex gap-4">
              <div className="h-28 w-28 flex-shrink-0 rounded-xl bg-neutral-300" />
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-2xl font-semibold" style={{ fontFamily: "'Amatic SC', cursive" }}>
                    {r.title}
                  </div>
                  <button
                    title="В избранное"
                    aria-label="favorite"
                    onClick={() => toggleFav(r.id)}
                    className={`text-2xl ${favorites.includes(r.id) ? "opacity-100" : "opacity-70"}`}
                  >
                    🗺️
                  </button>
                </div>
                <div className="mt-1 text-base opacity-95">{r.short}</div>
                <div className="mt-2 flex items-center gap-2 text-lg">
                  <span>⭐</span>
                  <span>{r.rating.toFixed(2)}</span>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => setDetail(r)}
                    className="rounded-xl px-4 py-2"
                    style={{ background: palette.cream, color: palette.coffee }}
                  >
                    Подробнее
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail drawer */}
      {detail && (
        <Drawer onClose={() => setDetail(null)}>
          <div className="mb-4 h-48 w-full rounded-2xl bg-neutral-300" />
          <div className="text-3xl font-semibold" style={{ fontFamily: "'Amatic SC', cursive", color: palette.coffee }}>
            {detail.title}
          </div>
          <div className="mt-2 text-base text-neutral-700">
            {detail.short}. Ниже — краткий маршрут: 3–4 точки, 6–8 км, кафе и видовая точка.
          </div>
          <div className="mt-4 flex items-center gap-2 text-lg text-neutral-800">
            ⭐ {detail.rating.toFixed(2)} · {detail.category}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => alert("Маршрут начат! (демо)")}
              className="rounded-xl px-4 py-3"
              style={{ background: palette.cream, color: palette.coffee }}
            >
              Начать
            </button>
            <button
              onClick={() => {
                setDetail(null);
                tg?.HapticFeedback?.impactOccurred("medium");
              }}
              className="rounded-xl px-4 py-3"
              style={{ background: palette.caramel, color: "#f7efe7" }}
            >
              К маршрутам
            </button>
          </div>
        </Drawer>
      )}
    </div>
  );
}

// ---- Reusable UI ----
function BackTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-3xl">‹</span>
      <h1
        className="text-4xl"
        style={{ color: palette.coffee, fontFamily: "'Amatic SC', cursive" }}
      >
        {title}
      </h1>
    </div>
  );
}

function LabeledInput({ label, value, onChange, ...rest }: any) {
  return (
    <div>
      <div className="mb-1 text-base" style={{ color: palette.caramel }}>{label}</div>
      <input
        className="w-full rounded-xl border px-4 py-3 outline-none"
        style={{ borderColor: palette.caramel }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}

function LabeledTextarea({ label, value, onChange, ...rest }: any) {
  return (
    <div>
      <div className="mb-1 text-base" style={{ color: palette.caramel }}>{label}</div>
      <textarea
        className="w-full rounded-xl border px-4 py-3 outline-none"
        style={{ borderColor: palette.caramel }}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled }: React.PropsWithChildren<{ onClick: () => void; disabled?: boolean }>) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-2xl px-6 py-4 text-xl font-semibold disabled:opacity-60"
      style={{ background: palette.caramel, color: "#f7efe7", boxShadow: `8px 12px 0 ${palette.shadow}` }}
    >
      {children}
    </button>
  );
}

function FilterChip({ active, onClick, children }: React.PropsWithChildren<{ active?: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm ${active ? "font-semibold" : "opacity-90"}`}
      style={{
        borderColor: palette.caramel,
        background: active ? palette.cream : "transparent",
        color: palette.coffee,
      }}
    >
      {children}
    </button>
  );
}

function Drawer({ children, onClose }: React.PropsWithChildren<{ onClose: () => void }>) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85%] translate-y-2 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl transition-transform will-change-transform"
      >
        <div className="mx-auto h-1.5 w-14 rounded-full bg-neutral-300" />
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
