import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as L from "leaflet";


/** ================== Палитра и утилиты ================== */
const palette = {
  coffee: "#4a2b1a",
  latte: "#efe0d3",
  caramel: "#7b4b31",
  cream: "#f2dfcf",
  shadow: "#00000022",
};

const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : undefined;

const CAT_DESC: Record<Category, string> = {
  "Знания и открытия": "Музеи, планетарии, технопарки, научные шоу.",
  "Движение и энергия": "Хайкинг, тропы здоровья, спорт и панорамы.",
  "Творчество и вдохновение": "Галереи, театры, арт-кварталы, уличное искусство.",
  "Вкус жизни": "Гастромаркеты, локальная кухня, кофе и десерты.",
  "Веселье и игры": "Парки развлечений, квесты, семейные активности.",
  "Стиль и уход": "Мода, шоурумы, мастерские, wellness.",
  "Звуки и ритмы": "Концерты, вечерние маршруты, музыкальные пространства.",
};



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

function metersBetween(lat1:number, lon1:number, lat2:number, lon2:number) {
  const R = 6371e3;
  const toRad = (d:number)=>d*Math.PI/180;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

const SUPPORT = { username: "only_ashes_know" } as const;
function openSupportChat() {
  const url = `https://t.me/${SUPPORT.username}`;
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else window.location.href = url;
}

/** ================== Типы данных ================== */
type Category =
  | "Знания и открытия" | "Движение и энергия" | "Творчество и вдохновение" | "Вкус жизни"
  | "Веселье и игры" | "Стиль и уход" | "Звуки и ритмы";

interface RouteCard {
  id: string;
  title: string;
  short: string;
  rating: number;
  category: Category;
}

interface RoutePoint {
  id: string;
  title: string;
  lat: number;
  lon: number;
  radiusM: number;              // радиус засчёта
  summary: string;              // короткая сводка
  image?: string;
}

interface RouteDetail {
  id: string;
  city: string;
  points: RoutePoint[];
}

/** ================== Данные ================== */
// Лента (как было)
const ALL_ROUTES: RouteCard[] = [
  { id: "rt1", title: "Москва: центр и виды", short: "Красная площадь, Зарядье, Киевская набережная", rating: 4.85, category: "Творчество и вдохновение" },
  { id: "rt2", title: "Сочи: горы и морской бриз", short: "Тропа здоровья, виды и хмели-сунели", rating: 4.82, category: "Движение и энергия" },
  { id: "rt3", title: "Казань: вкус жизни", short: "Чак-чак, плов и гастро-рынки", rating: 4.71, category: "Вкус жизни" },
  { id: "rt4", title: "Санкт-Петербург: научные открытия", short: "Планетарий, ИТМО, кунсткамера", rating: 4.76, category: "Знания и открытия" },
  { id: "rt5", title: "Москва by night", short: "Арт-кварталы и вечерние концерты", rating: 4.80, category: "Звуки и ритмы" },
];

// Маршрут для rt1 — Москва


const ROUTE_RT1: RouteDetail = {
  id: "rt1",
  city: "Москва",
  points: [
    {
      id: "p1",
      title: "Красная площадь (исток)",
      lat: 55.753930, lon: 37.620795, radiusM: 160,
      summary: "Сердце Москвы: Кремль и исторические панорамы.",
    },
    {
      id: "p2",
      title: "Парк Зарядье: видовая",
      lat: 55.752236, lon: 37.628196, radiusM: 120,
      summary: "Парящий мост, ландшафт и вид на Москву-реку.",
      image: "https://images.unsplash.com/photo-1545060894-1a9f94b6a32d?w=800"
    },
    {
      id: "p3",
      title: "Большой театр",
      lat: 55.760126, lon: 37.618698, radiusM: 120,
      summary: "Знаковая сцена классического искусства.",
      image: "https://images.unsplash.com/photo-1591713016723-322ceb2a3f0f?w=800"
    },
    {
      id: "p4",
      title: "Китай-город: старые улицы",
      lat: 55.756648, lon: 37.634561, radiusM: 140,
      summary: "Переулки и купеческая архитектура.",
      image: "https://images.unsplash.com/photo-1605556919189-74a4f0a49c7a?w=800"
    },
    {
      id: "p5",
      title: "Киевская набережная (финал)",
      lat: 55.744519, lon: 37.566012, radiusM: 180,
      summary: "Набережная с видами на Москва-Сити.",
      image: "https://images.unsplash.com/photo-1594653358140-fe2f8c4a3ef2?w=800"
    },
  ],
};

const ROUTE_DETAILS: Record<string, RouteDetail> = {
  rt1: ROUTE_RT1,
  // rt2: ROUTE_RT2,
  // rt3: ROUTE_RT3,
};

// snake_case, как просил
export function get_route(id: string): RouteDetail | null {
  return ROUTE_DETAILS[id] ?? null;
}
export const getRoute = get_route;

const FINISH_PLACEHOLDER_FILENAME = "culway_finish.jpg";

/** ================== Хранилище/состояния ================== */
interface Profile {
  avatarDataUrl?: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  age?: number;
  sex: "male" | "female"| "" ;
  interests?: string; 
}

type Step = "register" | "prefs" | "app" | "account";     // онбординг → приложение
type Tab = "home" | "done" | "kuly" | "promos" | "rating"; // нижняя навигация

type ProgressMap = Record<string /*routeId*/, string[] /*pointIds пройдённые*/>;

interface KulaPhoto {
  id: string;           // uuid
  routeId: string;
  dataUrl: string;
  filename: string;
  ts: number;
}

interface Promo {
  code: string;
  title: string;
  ts: number;
}



export default function CulWayWebApp() {
  const [step, setStep] = useLocalStorage<Step>("cw.step", "register");
  const [activeTab, setActiveTab] = useLocalStorage<Tab>("cw.tab", "home");

const [profile, setProfile] = useLocalStorage<Profile>("cw.profile", {
  email: "", username: "", displayName: "", bio: "",
  age: undefined, sex: "", interests: "",   // ← новое
});
  const [prefs, setPrefs] = useLocalStorage<Category[]>("cw.prefs", []);
  const [favorites, setFavorites] = useLocalStorage<string[]>("cw.favs", []);
  const [filter, setFilter] = useLocalStorage<"all" | Category[]>("cw.filter", "all");

  const [progress, setProgress] = useLocalStorage<ProgressMap>("cw.progress", {});
  const [completed, setCompleted] = useLocalStorage<string[]>("cw.completed", []); // routeIds
  const [kuly, setKuly] = useLocalStorage<KulaPhoto[]>("cw.kuly", []);
  const [promos, setPromos] = useLocalStorage<Promo[]>("cw.promos", []);

  // для рейтинга — локальный “скор”
  const isRegistered =
    Boolean(profile.email) && Boolean(profile.username) && Boolean(profile.displayName);
  const userNick = profile.username || profile.displayName || "гость";
  const passedCount = completed.length;
  const hasVoucher = promos.length > 0;

  // Telegram bootstrap
  useEffect(() => {
    if (!tg) return;
    try {
      tg.ready(); tg.expand();
      tg.setHeaderColor(palette.coffee);
      tg.setBackgroundColor(palette.latte);
      tg.HapticFeedback?.impactOccurred("light");
    } catch {}
  }, []);

  const startApp = () => setStep("prefs");
  const finishPrefs = () => setStep("app");

  // сортировка маршрутов
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

  return (
    <div
      className="min-h-[100svh] w-full pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+64px)]"
      style={{ background: palette.latte }}
    >
      <Header
        onMapClick={() => {}}
        onProfileClick={() => setStep(isRegistered ? "account" : "register")}
      />
      {step === "account" && (
        <AccountScreen
          profile={profile}
          onBack={() => setStep("app")}
          onEditProfile={() => setStep("register")}   // можно переиспользовать форму регистрации как редактор
          onLogout={() => {
            // мягкий «выход»: очистим профиль и вернём на регистрацию
            setProfile({
              email: "",
              username: "",
              displayName: "",
              bio: "",
              avatarDataUrl: undefined,
              age: undefined,
              sex: "",
              interests: "",
            });
            setStep("register");
          }}
        />
      )}
      {step === "register" && (
        <RegistrationScreen profile={profile} setProfile={setProfile} onContinue={startApp} />
      )}
      {step === "prefs" && (
        <PreferencesScreen value={prefs} onChange={setPrefs} onContinue={finishPrefs} />
      )}
      {step === "app" && (
        <>
          <Tabs active={activeTab} setActive={setActiveTab} />
          {activeTab === "home" && (
            <HomeScreen
              routes={sorted} filter={filter} setFilter={setFilter}
              favorites={favorites} setFavorites={setFavorites}
            />
          )}
          {activeTab === "done" && (
            <CompletedScreen completed={completed} onBack={() => setActiveTab("home")} />
          )}
          {activeTab === "kuly" && (
            <MyKulyScreen kuly={kuly} onBack={() => setActiveTab("home")} />
          )}
          {activeTab === "promos" && (
            <PromosScreen promos={promos} onBack={() => setActiveTab("home")} />
          )}
          {activeTab === "rating" && (
            <RatingScreen
              username={userNick}
              kuly={kuly}
              passedCount={passedCount}
              hasVoucher={hasVoucher}
              onBack={() => setActiveTab("home")}
            />
          )}
        </>
      )}

      {/* Драйвер маршрута rt1 — доступен всегда из “Подробнее” */}
      <RouteLauncher
        onRun={(routeId) => {
          RouteRunnerModal.open({
            routeId,
            getRoute: (id) => id === "rt1" ? ROUTE_RT1 : null,
            progress, setProgress, suppressAutoFinish: true,
            onFinished: (rid) => {
              // после финиша попросим фото
              UploadFinishPhotoModal.open({
                routeId: rid,
                onPhotoSaved: (ph, gavePromo) => {
                  // лучше функциональные апдейты, чтобы не поймать устаревшие значения из замыкания
                  setKuly(prev => [...prev, ph]);
                  setCompleted(prev => (prev.includes(rid) ? prev : [...prev, rid]));
                  if (gavePromo) {
                    setPromos(prev => [
                      ...prev,
                      { code: genPromoCode(), title: "Вкусная еда — промокод", ts: Date.now() },
                    ]);
                  }
                  setActiveTab("kuly");
                },
                onEdit: () => {
                  // повторно открыть чек-лист для этого маршрута
                  RouteRunnerModal.open({
                    routeId: rid,
                    getRoute,
                    progress,
                    setProgress,
                    suppressAutoFinish: true,
                    onFinished: (r) => {
                      // повторное завершение — снова фото-модалка
                      UploadFinishPhotoModal.open({
                        routeId: r,
                        onPhotoSaved: (ph2, gavePromo2) => {
                          setKuly(prev => [...prev, ph2]);
                          setCompleted(prev => (prev.includes(r) ? prev : [...prev, r]));
                          if (gavePromo2) {
                            setPromos(prev => [
                              ...prev,
                              { code: genPromoCode(), title: "Вкусная еда — промокод", ts: Date.now() },
                            ]);
                          }
                          setActiveTab("kuly");
                        },
                        onEdit: () => {
                          // при необходимости можно снова открыть чек-лист
                          RouteRunnerModal.open({
                            routeId: r,
                            getRoute,
                            progress,
                            setProgress,
                            onFinished: () => {},
                          });
                  },
                });
              },
            });
          },
        });
      },
    });
  }}
/>

      <FooterSupport />
    </div>
  );
}

/** ================== Шапка/вкладки/футер/lk ================== */
function Header({ onMapClick, onProfileClick }: { onMapClick: () => void; onProfileClick: () => void }) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3"
         style={{ background: palette.coffee, color: "#f8efe7" }}>
      <div className="text-2xl font-semibold tracking-wide" style={{ fontFamily: "'Amatic SC', cursive" }}>
        CulWay
      </div>
      <div className="flex items-center gap-5">
        <button aria-label="Map" onClick={onMapClick} className="text-3xl" title="Карта">🗺️</button>
        <button aria-label="Profile" onClick={onProfileClick} className="text-3xl" title="Профиль">👤</button>
      </div>
    </div>
  );
}

function Tabs({ active, setActive }: { active: Tab; setActive: (t:Tab)=>void }) {
  const btn = (id:Tab, label:string)=>(
    <button
      onClick={()=>setActive(id)}
      className="flex-1 px-3 py-2"
      style={{ background: active===id? palette.caramel : "#0000", color: active===id? "#fff":"#412", borderRadius: 12 }}
    >
      {label}
    </button>
  );
  return (
    <div className="px-4 pt-3">
      <div className="flex gap-2" style={{ background: palette.cream, borderRadius: 14, padding: 6, overflowX: "auto" }}>
        {btn("home", "Лента")}
        {btn("done", "Завершённые")}
        {btn("kuly", "Мои Кулы")}
        {btn("promos", "Мои промокоды")}
        {btn("rating", "Рейтинг")}
      </div>
    </div>
  );
}
function OrgInfoModalInner({ onClose }: { onClose: () => void }) {
  return (
    <Drawer onClose={onClose}>
      <div className="text-2xl font-semibold" style={{ color: palette.coffee }}>
        Информация об организации
      </div>
      <div className="mt-3 space-y-2 text-sm" style={{ color: palette.coffee }}>
        <p><b>Название:</b> CulWay</p>
        <p><b>ИНН/ОГРН:</b> 0000000000 / 0000000000000</p>
        <p><b>Адрес:</b> г. Москва, ул. Примерная, д. 1</p>
        <p><b>Почта:</b> info@culway.example</p>
        <p><b>Политика конфиденциальности:</b> доступна по запросу в поддержке</p>
      </div>
      <div className="mt-4">
        <button
          className="w-full rounded-xl px-4 py-3"
          style={{ background: palette.caramel, color: "#fff" }}
          onClick={onClose}
        >
          Понятно
        </button>
      </div>
    </Drawer>
  );
}

const OrgInfoModal = {
  open() {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    const onClose = () => { root.unmount(); div.remove(); };
    root.render(<OrgInfoModalInner onClose={onClose} />);
  }
};

function FooterSupport() {
  return (
    <div className="py-8 text-center text-sm text-neutral-600">
      Техническая поддержка:{" "}
      <button type="button" onClick={openSupportChat} className="underline" aria-label="Написать в поддержку">
        Написать
      </button>
      <div className="mt-3">
        <button
          type="button"
          onClick={()=>OrgInfoModal.open()}
          className="rounded-xl px-4 py-2"
          style={{ background: palette.cream, color: palette.coffee }}
        >
          Информация об организации
        </button>
      </div>
    </div>
  );
}

/** ================== Экран: регистрация/настройки ================== */
function AccountScreen({
  profile,
  onBack,
  onEditProfile,
  onLogout
}: {
  profile: Profile;
  onBack: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="px-5 py-6">
      <BackTitle title="Личный кабинет" onBack={onBack} />
      <div className="mt-6 flex items-center gap-4">
        <div className="h-20 w-20 rounded-2xl bg-neutral-300 overflow-hidden">
          {profile.avatarDataUrl ? (
            <img src={profile.avatarDataUrl} alt="avatar" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1">
          <div className="text-xl font-semibold" style={{ color: palette.coffee }}>
            {profile.displayName || "Без имени"}
          </div>
          <div className="text-sm opacity-80">@{profile.username || "username"}</div>
          <div className="text-sm opacity-80">{profile.email || "email"}</div>
        </div>
      </div>

      {profile.bio ? (
        <div className="mt-4 rounded-xl p-3" style={{ background: palette.cream, color: palette.coffee }}>
          {profile.bio}
        </div>
      ) : null}

      <div className="mt-6 space-y-2">
        <button
          className="w-full rounded-xl px-4 py-3"
          style={{ background: palette.caramel, color: "#f7efe7" }}
          onClick={onEditProfile}
        >
          Редактировать профиль
        </button>
        <button
          className="w-full rounded-xl px-4 py-3"
          style={{ background: "#E2E8F0", color: "#1f2937" }}
          onClick={onLogout}
        >
          Выйти
        </button>
      </div>
    </div>
  );
}


function RegistrationScreen({ profile, setProfile, onContinue }: { profile: Profile; setProfile: (p: Profile) => void; onContinue: () => void; }) {
  const [reqPending, setReqPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const requestCamera = async () => {
    setReqPending(true);
    try {
      const stream = await navigator.mediaDevices?.getUserMedia({ video: true });
      stream?.getTracks().forEach((t) => t.stop());
      tg?.HapticFeedback?.notificationOccurred("success");
      alert("Камера доступна ✅");
    } catch { tg?.HapticFeedback?.notificationOccurred("error"); alert("Нет доступа к камере."); }
    finally { setReqPending(false); }
  };
  const requestGeo = async () => {
    setReqPending(true);
    try {
      await new Promise<void>((res, rej) => {
        if (!navigator.geolocation) return rej("no geo");
        navigator.geolocation.getCurrentPosition(()=>res(), ()=>rej("denied"), { enableHighAccuracy:true, timeout: 8000 });
      });
      tg?.HapticFeedback?.notificationOccurred("success");
      alert("Геопозиция доступна ✅");
    } catch { tg?.HapticFeedback?.notificationOccurred("error"); alert("Нет доступа к геопозиции."); }
    finally { setReqPending(false); }
  };
  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = ()=> setProfile({ ...profile, avatarDataUrl: String(r.result) }); r.readAsDataURL(f);
  };
  const canContinue = profile.email && profile.username && profile.displayName;

  return (
    <div className="px-5 py-6">
      <BackTitle title="Регистрация" />
      <div className="mt-6 flex flex-col items-center gap-5">
        <div className="h-40 w-40 rounded-2xl bg-neutral-300" style={{ boxShadow: `8px 12px 0 ${palette.shadow}` }}>
          {profile.avatarDataUrl ? (
            <img alt="avatar" src={profile.avatarDataUrl} className="h-full w-full rounded-2xl object-cover" />
          ) : <div className="flex h-full w-full items-center justify-center text-neutral-500">Аватар</div>}
        </div>
        <div className="flex gap-3">
          <button className="rounded-xl px-4 py-2 text-base" style={{ background: palette.caramel, color: "#f7efe7" }}
                  onClick={()=>fileRef.current?.click()}>Загрузить</button>
          <input ref={fileRef} onChange={onPickAvatar} type="file" accept="image/*" capture="environment" className="hidden"/>
          <button disabled={reqPending} className="rounded-xl px-4 py-2 text-base disabled:opacity-60"
                  style={{ background: palette.caramel, color: "#f7efe7" }} onClick={requestCamera}>Камера</button>
          <button disabled={reqPending} className="rounded-xl px-4 py-2 text-base disabled:opacity-60"
                  style={{ background: palette.caramel, color: "#f7efe7" }} onClick={requestGeo}>Гео</button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <LabeledInput label="Почта" placeholder="you@example.com" type="email"
                      value={profile.email} onChange={(v:string)=>setProfile({ ...profile, email:v })}/>
        <LabeledInput label="Логин" placeholder="nickname"
                      value={profile.username} onChange={(v:string)=>setProfile({ ...profile, username:v })}/>
        <LabeledInput label="Имя пользователя" placeholder="Ваше имя"
                      value={profile.displayName} onChange={(v:string)=>setProfile({ ...profile, displayName:v })}/>
        <LabeledTextarea label="Расскажите о себе" placeholder="Пара слов о ваших интересах"
                         value={profile.bio} onChange={(v:string)=>setProfile({ ...profile, bio:v })}/>
        <LabeledInput
          label="Возраст"
          placeholder="18"
          type="number"
          min={1}
          value={profile.age ?? ""}
          onChange={(v:string)=>setProfile({ ...profile, age: v ? Number(v) : undefined })}
        />
        <div>
          <div className="mb-1 text-base" style={{ color: palette.caramel }}>Пол</div>
          <div className="flex gap-2">
            {[
              {k:"male",   label:"Мужской"},
              {k:"female", label:"Женский"},
            ].map(opt=>(
              <button
                key={opt.k}
                type="button"
                onClick={()=>setProfile({ ...profile, sex: opt.k as any })}
                className={`rounded-xl border px-3 py-2 text-sm ${profile.sex===opt.k? "font-semibold":"opacity-90"}`}
                style={{ borderColor: palette.caramel, background: profile.sex===opt.k? palette.cream : "transparent", color: palette.coffee }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <LabeledTextarea
          label="Круг интересов"
          placeholder="Коротко перечислите интересы (через запятую)"
          value={profile.interests ?? ""}
          onChange={(v:string)=>setProfile({ ...profile, interests:v })}
        />
      </div>

      <div className="mt-6">
        <PrimaryButton disabled={!canContinue} onClick={onContinue}>Продолжить</PrimaryButton>
      </div>
    </div>
  );
}

const ALL_CATEGORIES: Category[] = ["Знания и открытия" , "Движение и энергия" , "Творчество и вдохновение" , "Вкус жизни", "Веселье и игры" , "Стиль и уход" , "Звуки и ритмы"];

function PreferencesScreen({ value, onChange, onContinue }: { value: Category[]; onChange: (c: Category[]) => void; onContinue: () => void; }) {
  const toggle = (cat: Category) => value.includes(cat) ? onChange(value.filter(c=>c!==cat)) : onChange([...value, cat]);
  return (
    <div className="px-5 py-6">
      <div className="mx-auto mb-4 max-w-[90%] rounded-2xl px-3 py-4 text-2xl leading-snug text-center"
           style={{ background: palette.coffee, color: "#f6eae0" }}>
        Выберите направления, которые вам интересны
        <div className="mt-2 text-base opacity-80">Лента подстроится под интересы</div>
      </div>
      <div className="mt-2 space-y-3">
        {ALL_CATEGORIES.map((c)=>(
          <button
            key={c}
            onClick={()=>toggle(c)}
            className="w-full rounded-2xl border-2 px-4 py-3 text-left"
            style={{
              borderColor: palette.caramel,
              background: value.includes(c)? palette.caramel : "transparent",
              color: value.includes(c)? "#f8efe7" : palette.coffee
            }}
          >
            <div className="text-lg font-semibold">{c}</div>
            <div className="mt-1 text-sm opacity-90">{CAT_DESC[c]}</div>
          </button>
        ))}
      </div>
      <div className="mt-6"><PrimaryButton onClick={onContinue}>Продолжить</PrimaryButton></div>
    </div>
  );
}

/** ================== Экран: Лента + запуск маршрута ================== */
function HomeScreen({
  routes, filter, setFilter, favorites, setFavorites,
}: {
  routes: RouteCard[];
  filter: "all" | Category[];
  setFilter: (f: "all" | Category[]) => void;
  favorites: string[];
  setFavorites: (ids:string[])=>void;
}) {
  const [detail, setDetail] = useState<RouteCard|null>(null);

  const activeCats = filter === "all" ? null : new Set(filter);
  const filtered = routes.filter(r => !activeCats || activeCats.has(r.category));

  const toggleFav = (id:string)=>
    setFavorites(favorites.includes(id)? favorites.filter(x=>x!==id) : [...favorites,id]);
  const toggleCat = (cat: Category) => {
      if (filter === "all") {
        setFilter([cat]);
        return;
      }
      const arr = [...filter];
      const i = arr.indexOf(cat);
      if (i >= 0) arr.splice(i,1); else arr.push(cat);
      setFilter(arr.length ? arr : "all");
    };

    const isActive = (cat: Category) => filter !== "all" && (filter as Category[]).includes(cat);

  return (
    <div className="px-5 py-6">
      <BackTitle title="Лента маршрутов" />
      {/* Фильтр */}
      <div className="mt-3">
        <button className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-xl"
                style={{ background: palette.coffee, color: "#f6eae0" }}>
          Фильтр
          <span className="text-2xl">▾</span>
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <FilterChip active={filter==="all"} onClick={()=>setFilter("all")}>Все</FilterChip>
          {ALL_CATEGORIES.map((c)=>(
            <FilterChip key={c} active={isActive(c)} onClick={()=>toggleCat(c)}>{c}</FilterChip>
          ))}
        </div>
      </div>

      {/* Карточки */}
      <div className="mt-4 space-y-5">
        {filtered.map((r)=>(
          <div key={r.id} className="rounded-2xl p-4"
               style={{ background: palette.caramel+"cc", color:"#f7efe7", boxShadow:`8px 12px 0 ${palette.shadow}` }}>
            <div className="flex gap-4">
              <div className="h-28 w-28 flex-shrink-0 rounded-xl bg-neutral-300" />
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-2xl font-semibold" style={{ fontFamily: "'Amatic SC', cursive" }}>{r.title}</div>
                  <button title="В избранное" aria-label="favorite"
                          onClick={()=>toggleFav(r.id)} className={`text-2xl ${favorites.includes(r.id)?"opacity-100":"opacity-70"}`}>🗺️</button>
                </div>
                <div className="mt-1 text-base opacity-95">{r.short}</div>
                <div className="mt-2 flex items-center gap-2 text-lg"><span>⭐</span><span>{r.rating.toFixed(2)}</span></div>
                <div className="mt-3">
                  <button onClick={()=>setDetail(r)} className="rounded-xl px-4 py-2"
                          style={{ background: palette.cream, color: palette.coffee }}>Подробнее</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer “Подробнее” + кнопка “Начать маршрут” */}
      {detail && (
        <Drawer onClose={()=>setDetail(null)}>
          <div className="mb-4 h-48 w-full rounded-2xl bg-neutral-300" />
          <div className="text-3xl font-semibold" style={{ fontFamily: "'Amatic SC', cursive", color: palette.coffee }}>
            {detail.title}
          </div>
          <div className="mt-2 text-base text-neutral-700">{detail.short}</div>
          <div className="mt-4 flex items-center gap-2 text-lg text-neutral-800">⭐ {detail.rating.toFixed(2)} · {detail.category}</div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={()=>{ RouteRunnerModal.emitRun(detail.id); setDetail(null); }}
                    className="rounded-xl px-4 py-3" style={{ background: palette.cream, color: palette.coffee }}>
              Начать маршрут
            </button>
            <button onClick={()=>setDetail(null)} className="rounded-xl px-4 py-3"
                    style={{ background: palette.caramel, color: "#f7efe7" }}>
              К маршрутам
            </button>
          </div>
        </Drawer>
      )}
    </div>
  );
}

/** ================== Экран: Завершённые ================== */
function CompletedScreen({ completed, onBack }: { completed: string[]; onBack: () => void }) {
  return (
    <div className="px-5 py-6">
      <BackTitle title="Завершённые маршруты" onBack={onBack}/>
      <div className="mt-4 space-y-3">
        {completed.length===0 && <div className="opacity-70">Пока пусто.</div>}
        {completed.map((rid)=>(
          <div key={rid} className="rounded-xl p-4" style={{ background: palette.cream, color: palette.coffee }}>
            Маршрут <b>{rid}</b> завершён ✅
          </div>
        ))}
      </div>
    </div>
  );
}

/** ================== Экран: Мои Кулы ================== */
function MyKulyScreen({ kuly, onBack }: { kuly: KulaPhoto[]; onBack: () => void }) {
  return (
    <div className="px-5 py-6">
      <BackTitle title="Мои Кулы" onBack={onBack} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {kuly.length===0 && <div className="opacity-70">Фотографии ещё не загружены.</div>}
        {kuly.map(ph=>(
          <div key={ph.id} className="rounded-xl overflow-hidden" style={{ background: palette.cream, color: palette.coffee }}>
            <div className="h-36 w-full bg-neutral-300">
              <img src={ph.dataUrl} alt={ph.filename} className="h-36 w-full object-cover"/>
            </div>
            <div className="p-2 text-sm">Файл: {ph.filename}<br/>Маршрут: {ph.routeId}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** ================== Экран: Промокоды ================== */
function PromosScreen({ promos, onBack }: { promos: Promo[]; onBack: () => void }) {
  return (
    <div className="px-5 py-6">
      <BackTitle title="Мои промокоды" onBack={onBack}/>
      <div className="mt-4 space-y-3">
        {promos.length===0 && <div className="opacity-70">Промокодов пока нет.</div>}
        {promos.map((p,i)=>(
          <div key={i} className="rounded-xl p-4" style={{ background: palette.cream, color: palette.coffee }}>
            <div className="text-lg font-semibold">{p.title}</div>
            <div className="mt-1">Код: <b>{p.code}</b></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** ================== Экран: Рейтинг ================== */
function RatingScreen({
  username, kuly, passedCount, hasVoucher, onBack
}: {
  username:string; kuly:KulaPhoto[]; passedCount:number; hasVoucher:boolean; onBack: () => void;
}) {  return (
    <div className="px-5 py-6">
      <BackTitle title="Рейтинг" onBack={onBack}/>
      {!hasVoucher ? (
        <div className="mt-4 opacity-70">Чтобы попасть в рейтинг, завершите маршрут: загрузите фото-завершалку и получите промокод.</div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: palette.cream, color: palette.coffee }}>
            <div className="h-14 w-14 rounded-lg overflow-hidden bg-neutral-300">
              {kuly[0] ? <img src={kuly[0].dataUrl} alt="avatar" className="h-full w-full object-cover"/> : null}
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold">@{username}</div>
              <div className="text-sm opacity-80">Пройдено маршрутов: {passedCount}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** ================== Лончер/Модалки маршрута ================== */
function RouteLauncher({ onRun }: { onRun:(routeId:string)=>void }) {
  useEffect(()=>{
    RouteRunnerModal._onRun = onRun;
  },[onRun]);
  return null;
}

type RouteGetter = (id:string)=>RouteDetail|null;
type RouteRunnerProps = {
  routeId: string;
  getRoute: RouteGetter;
  progress: ProgressMap;
  setProgress: (pm:ProgressMap)=>void;
  onFinished: (routeId:string)=>void;
  suppressAutoFinish?: boolean;
};

const RouteRunnerModal = {
  _onRun: null as null | ((rid:string)=>void),
  emitRun(rid:string){ this._onRun?.(rid); },
  open(props: RouteRunnerProps){
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    const onClose = () => { root.unmount(); div.remove(); };
    root.render(<RouteRunnerModalInner {...props} onClose={onClose} />);
  }
};
/**let ReactDOMRoot:any = (window as any).__culway_last_modal_root;

/** Внутренняя модалка с отслеживанием GPS и ручным чек-ином */
function RouteRunnerModalInner(
  {
    routeId,
    getRoute,
    progress,
    setProgress,
    onFinished,
    onClose,
    suppressAutoFinish = false,
  }: RouteRunnerProps & { onClose: () => void }
) {
  const detail = getRoute(routeId);
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const [sum, setSum] = useState<string>("");
  const [mapOpen, setMapOpen] = useState(false);

  // ЛОКАЛЬНЫЙ оптимистический прогресс — мгновенно даёт "✓" в UI
  const [localDone, setLocalDone] = useState<Set<string>>(
    new Set(progress[routeId] || [])
  );

  // GPS-трекинг (мягкие настройки для Телеги)
  useEffect(() => {
    if (!detail) return;
    let watchId: number | undefined;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, maximumAge: 1500, timeout: 8000 }
      );
    }
    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [detail]);

  if (!detail) return null;

  // Отметить точку пройденной (локально + записать в общее состояние)
  const markDone = (pid: string) => {
    setLocalDone((prev) => {
      const next = new Set(prev);
      next.add(pid);
      return next;
    });
    const current = new Set(progress[routeId] || []);
    current.add(pid);
    setProgress({ ...progress, [routeId]: Array.from(current) });
  };
  const unmarkDone = (pid: string) => {
    setLocalDone(prev => {
      const next = new Set(prev); next.delete(pid); return next;
    });
    const current = new Set(progress[routeId] || []);
    current.delete(pid);
    setProgress({ ...progress, [routeId]: Array.from(current) });
  };

  // Все точки пройдены → закрываем модалку и запускаем шаг с фото
  const allDone = detail.points.every((p) => localDone.has(p.id));
  useEffect(() => {
    if (allDone && !suppressAutoFinish) {
      onClose();
      onFinished(routeId);
    }
  }, [allDone, suppressAutoFinish, onClose, onFinished, routeId]);

  return (
    <Drawer onClose={onClose}>
      <div className="text-2xl font-semibold" style={{ color: palette.coffee }}>
        Маршрут: {detail.city}
      </div>
      <div className="mt-1 text-sm opacity-80">
        Идёт отслеживание геопозиции (если разрешено). Можно отмечать точки вручную.
      </div>

      {/* Кнопка карты */}
      <div className="mt-3">
        <button
          className="rounded-md px-4 py-2"
          style={{ background: palette.cream, color: palette.coffee }}
          onClick={() => setMapOpen(true)}
        >
          Открыть карту
        </button>
      </div>

      {/* Список точек */}
      <div className="mt-4 space-y-3">
        {detail.points.map((p) => {
          const reached = pos
            ? metersBetween(pos.lat, pos.lon, p.lat, p.lon) <= p.radiusM
            : false;
          const isDone = localDone.has(p.id) || reached;

          return (
            <div
              key={p.id}
              className="rounded-xl p-3"
              style={{
                background: isDone ? "#d9f6da" : palette.cream,
                color: palette.coffee,
              }}
            >
              {/* превью места */}
              {"image" in p && (p as any).image ? (
                <div className="mb-2 h-28 w-full overflow-hidden rounded-lg bg-neutral-200">
                  <img
                    src={(p as any).image}
                    alt={p.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{p.title}</div>
                <div className="text-sm">{isDone ? "✓" : "—"}</div>
              </div>

              <div className="mt-1 text-sm opacity-90">{p.summary}</div>

              <div className="mt-2 flex flex-wrap gap-4 text-sm opacity-80">
                <span>Радиус засчёта: {p.radiusM} м</span>
                {pos && (
                  <span>
                    До точки:{" "}
                    {Math.max(
                      0,
                      Math.round(metersBetween(pos.lat, pos.lon, p.lat, p.lon))
                    )}{" "}
                    м
                  </span>
                )}
              </div>

              <div className="mt-2 flex gap-2">
                {isDone ? (
                  <button
                    className="rounded-md px-3 py-2"
                    style={{ background: "#E2E8F0", color: "#1f2937" }}
                    onClick={() => unmarkDone(p.id)}
                  >
                    Отменить
                  </button>
                ) : (
                  <button
                    className="rounded-md px-3 py-2"
                    style={{ background: palette.caramel, color: "#fff" }}
                    onClick={() => markDone(p.id)}
                  >
                    Я на месте
                  </button>
                )}
                <button
                  className="rounded-md px-3 py-2"
                  style={{ background: palette.cream, color: palette.coffee }}
                  onClick={() => setSum(p.summary)}
                >
                  Сводка
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Блок сводки выбранной точки */}
      {sum && (
        <div
          className="mt-4 rounded-xl p-3"
          style={{ background: "#fff4cc", color: "#533" }}
        >
          <div className="font-semibold">Сводка</div>
          <div className="mt-1 text-sm">{sum}</div>
        </div>
      )}

      {/* Модалка карты */}
      {mapOpen && (
        <MapModal
          points={detail.points}
          pos={pos}
          onClose={() => setMapOpen(false)}
        />
      )}
      {/* Кнопка ЗАВЕРШИТЬ МАРШРУТ */}
      <div className="mt-5">
        <button
          className="w-full rounded-xl px-4 py-3"
          style={{ background: palette.caramel, color: "#fff", opacity: allDone ? 1 : 0.6 }}
          disabled={!allDone}
          onClick={() => {
            onClose();
            onFinished(routeId);
          }}
        >
          Завершить маршрут
        </button>
        {!allDone && (
          <div className="mt-2 text-xs opacity-70">
            Отметьте все точки, чтобы завершить.
          </div>
        )}
      </div>
    </Drawer>
  );
}



function MapModal({
  points,
  pos,
  onClose,
}: {
  points: RoutePoint[];
  pos: { lat: number; lon: number } | null;
  onClose: () => void;
}) {
  const mapId = "culway-map";

  useEffect(() => {
    // @ts-ignore: глобальный L из leaflet
    const map = L.map(mapId, { zoomControl: true }).setView(
      pos ? [pos.lat, pos.lon] : [points[0].lat, points[0].lon],
      13
    );

    // @ts-ignore
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    // Точки + радиусы
    points.forEach((p) => {
      // @ts-ignore
      L.marker([p.lat, p.lon]).addTo(map).bindPopup(p.title);
      // @ts-ignore
      L.circle([p.lat, p.lon], {
        radius: p.radiusM,
        color: "#7b4b31",
        opacity: 0.8,
      }).addTo(map);
    });

    // Текущая позиция
    if (pos) {
      // @ts-ignore
      const me = L.circleMarker([pos.lat, pos.lon], { radius: 6 });
      me.addTo(map).bindPopup("Вы здесь");
    }

    return () => {
      map.remove();
    };
  }, [mapId, points, pos]);

  return (
    <Drawer onClose={onClose}>
      <div className="text-lg font-semibold mb-2" style={{ color: palette.coffee }}>
        Карта маршрута
      </div>
      <div
        id={mapId}
        style={{ height: 360, width: "100%", borderRadius: 12, overflow: "hidden" }}
      />
    </Drawer>
  );
}

/** ================== Модалка загрузки фото-завершалки ================== */
function UploadFinishPhotoModalInner({ routeId, onEdit, onClose, onPhotoSaved }: { routeId:string; onClose:()=>void; onPhotoSaved:(ph:KulaPhoto, gavePromo:boolean)=>void; onEdit: () => void; }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>("");

  const onPick = (e: React.ChangeEvent<HTMLInputElement>)=>{
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ()=> setPreview(String(r.result));
    r.readAsDataURL(f);
  };
  const onSave = ()=>{
    if (!preview) { alert("Добавьте фото"); return; }
    const filename = (fileRef.current?.files?.[0]?.name || "").trim();
    const gavePromo = filename === FINISH_PLACEHOLDER_FILENAME;
    const ph: KulaPhoto = { id: String(Date.now()), routeId, dataUrl: preview, filename: filename || "photo.jpg", ts: Date.now() };
    onPhotoSaved(ph, gavePromo);
    onClose();
  };

  return (
    <Drawer onClose={onClose}>
      <div className="text-2xl font-semibold" style={{ color: palette.coffee }}>Финальное фото</div>
      <div className="mt-1 text-sm opacity-80">Загрузите фото из финиша маршрута. Для бонуса используйте файл с именем <b>{FINISH_PLACEHOLDER_FILENAME}</b>.</div>
      <div className="mt-3">
        <div className="h-40 w-full rounded-xl bg-neutral-300 overflow-hidden">
          {preview ? <img src={preview} alt="preview" className="h-full w-full object-cover"/> : <div className="h-full w-full flex items-center justify-center opacity-60">Предпросмотр</div>}
        </div>
        <div className="mt-3 flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" onChange={onPick}/>
          <button className="rounded-md px-4 py-2" style={{ background: palette.caramel, color:"#fff" }} onClick={onSave}>Сохранить</button>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          className="rounded-md px-4 py-2"
          style={{ background: "#E2E8F0", color: "#111827" }}
          onClick={onEdit}
        >
          Редактировать
        </button>
        <button
          className="rounded-md px-4 py-2"
          style={{ background: palette.cream, color: palette.coffee }}
          onClick={onClose}
        >
          Отмена
        </button>
        

      </div>
    </Drawer>
   
  );
}

const UploadFinishPhotoModal = {
  open(opts:{
    routeId: string;
    onPhotoSaved: (ph: KulaPhoto, gavePromo: boolean) => void;
    onEdit: () => void; // ← НОВОЕ
  }) {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    const onClose = () => { root.unmount(); div.remove(); };
    root.render(
      <UploadFinishPhotoModalInner
        routeId={opts.routeId}
        onPhotoSaved={opts.onPhotoSaved}
        onEdit={() => { onClose(); opts.onEdit(); }} // ← закрыть и перейти к редактированию
        onClose={onClose}
      />
    );
  }
};

/** ================== Переиспользуемые UI ================== */
function BackTitle({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="flex items-center gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Назад"
          className="text-3xl leading-none select-none"
          style={{ cursor: "pointer", color: palette.coffee, background: "transparent" }}
        >
          ‹
        </button>
      ) : null}
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
      <input className="w-full rounded-xl border px-4 py-3 outline-none" style={{ borderColor: palette.caramel }}
             value={value} onChange={(e)=>onChange(e.target.value)} {...rest}/>
    </div>
  );
}
function LabeledTextarea({ label, value, onChange, ...rest }: any) {
  return (
    <div>
      <div className="mb-1 text-base" style={{ color: palette.caramel }}>{label}</div>
      <textarea className="w-full rounded-xl border px-4 py-3 outline-none" style={{ borderColor: palette.caramel }}
                rows={4} value={value} onChange={(e)=>onChange(e.target.value)} {...rest}/>
    </div>
  );
}
function PrimaryButton({ children, onClick, disabled }: React.PropsWithChildren<{ onClick: () => void; disabled?: boolean }>) {
  return (
    <button disabled={disabled} onClick={onClick} className="w-full rounded-2xl px-6 py-4 text-xl font-semibold disabled:opacity-60"
            style={{ background: palette.caramel, color: "#f7efe7", boxShadow: `8px 12px 0 ${palette.shadow}` }}>
      {children}
    </button>
  );
}
function FilterChip({ active, onClick, children }: React.PropsWithChildren<{ active?: boolean; onClick: () => void }>) {
  return (
    <button onClick={onClick} className={`rounded-xl border px-3 py-2 text-sm ${active? "font-semibold":"opacity-90"}`}
            style={{ borderColor: palette.caramel, background: active? palette.cream : "transparent", color: palette.coffee }}>
      {children}
    </button>
  );
}
function Drawer({ children, onClose }: React.PropsWithChildren<{ onClose: () => void }>) {
  useEffect(()=>{ document.body.style.overflow = "hidden"; return ()=>{ document.body.style.overflow = ""; }; },[]);
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity" onClick={onClose}/>
      <div className="absolute inset-x-0 bottom-0 max-h-[85%] translate-y-2 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl transition-transform will-change-transform">
        <div className="mx-auto h-1.5 w-14 rounded-full bg-neutral-300" />
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

/** ================== Вспомогательные генераторы ================== */
function genPromoCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "CW-";
  for (let i=0;i<8;i++) s += alphabet[Math.floor(Math.random()*alphabet.length)];
  return s;
}