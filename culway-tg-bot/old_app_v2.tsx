import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

/** ================== Палитра и утилиты ================== */
const palette = {
  coffee: "#4a2b1a",
  latte: "#efe0d3",
  caramel: "#7b4b31",
  cream: "#f2dfcf",
  shadow: "#00000022",
};

const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : undefined;

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
  | "Наука и образование" | "Активный отдых" | "Искусство" | "Еда и напитки"
  | "Развлечения" | "Мода и красота" | "Музыка";

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
}

interface RouteDetail {
  id: string;
  city: string;
  points: RoutePoint[];
}

/** ================== Данные ================== */
// Лента (как было)
const ALL_ROUTES: RouteCard[] = [
  { id: "rt1", title: "Москва: центр и виды", short: "Красная площадь, Зарядье, Киевская набережная", rating: 4.85, category: "Искусство" },
  { id: "rt2", title: "Сочи: горы и морской бриз", short: "Тропа здоровья, виды и хмели-сунели", rating: 4.82, category: "Активный отдых" },
  { id: "rt3", title: "Казань: вкус жизни", short: "Чак-чак, плов и гастро-рынки", rating: 4.71, category: "Еда и напитки" },
  { id: "rt4", title: "Санкт-Петербург: научные открытия", short: "Планетарий, ИТМО, кунсткамера", rating: 4.76, category: "Наука и образование" },
  { id: "rt5", title: "Москва by night", short: "Арт-кварталы и вечерние концерты", rating: 4.80, category: "Музыка" },
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
    },
    {
      id: "p3",
      title: "Большой театр",
      lat: 55.760126, lon: 37.618698, radiusM: 120,
      summary: "Знаковая сцена классического искусства.",
    },
    {
      id: "p4",
      title: "Китай-город: старые улицы",
      lat: 55.756648, lon: 37.634561, radiusM: 140,
      summary: "Переулки и купеческая архитектура.",
    },
    {
      id: "p5",
      title: "Киевская набережная (финал)",
      lat: 55.744519, lon: 37.566012, radiusM: 180,
      summary: "Набережная с видами на Москва-Сити.",
    },
  ],
};

const FINISH_PLACEHOLDER_FILENAME = "culway_finish.jpg";

/** ================== Хранилище/состояния ================== */
interface Profile {
  avatarDataUrl?: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
}

type Step = "register" | "prefs" | "app";      // онбординг → приложение
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
  });
  const [prefs, setPrefs] = useLocalStorage<Category[]>("cw.prefs", []);
  const [favorites, setFavorites] = useLocalStorage<string[]>("cw.favs", []);
  const [filter, setFilter] = useLocalStorage<"all" | Category>("cw.filter", "all");

  const [progress, setProgress] = useLocalStorage<ProgressMap>("cw.progress", {});
  const [completed, setCompleted] = useLocalStorage<string[]>("cw.completed", []); // routeIds
  const [kuly, setKuly] = useLocalStorage<KulaPhoto[]>("cw.kuly", []);
  const [promos, setPromos] = useLocalStorage<Promo[]>("cw.promos", []);

  // для рейтинга — локальный “скор”
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
      <Header onMapClick={() => {}} onProfileClick={() => setStep("register")} />

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
            <CompletedScreen completed={completed} />
          )}
          {activeTab === "kuly" && (
            <MyKulyScreen kuly={kuly} />
          )}
          {activeTab === "promos" && (
            <PromosScreen promos={promos} />
          )}
          {activeTab === "rating" && (
            <RatingScreen username={userNick} kuly={kuly} passedCount={passedCount} hasVoucher={hasVoucher} />
          )}
        </>
      )}

      {/* Драйвер маршрута rt1 — доступен всегда из “Подробнее” */}
      <RouteLauncher
        onRun={(routeId) => {
          RouteRunnerModal.open({
            routeId,
            getRoute: (id) => id === "rt1" ? ROUTE_RT1 : null,
            progress, setProgress,
            onFinished: (rid) => {
              // после финиша попросим фото
              UploadFinishPhotoModal.open({
                routeId: rid,
                onPhotoSaved: (ph, gavePromo) => {
                  setKuly([...kuly, ph]);
                  if (!completed.includes(rid)) setCompleted([...completed, rid]);
                  if (gavePromo) setPromos([
                    ...promos,
                    { code: genPromoCode(), title: "Вкусная еда — промокод", ts: Date.now() }
                  ]);
                  setActiveTab("kuly");
                }
              });
            }
          });
        }}
      />

      <FooterSupport />
    </div>
  );
}

/** ================== Шапка/вкладки/футер ================== */
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
      <div className="flex gap-2" style={{ background: palette.cream, borderRadius: 14, padding: 6 }}>
        {btn("home", "Лента")}
        {btn("done", "Завершённые")}
        {btn("kuly", "Мои Кулы")}
        {btn("promos", "Мои промокоды")}
        {btn("rating", "Рейтинг")}
      </div>
    </div>
  );
}

function FooterSupport() {
  return (
    <div className="py-8 text-center text-sm text-neutral-600">
      Техническая поддержка:{" "}
      <button type="button" onClick={openSupportChat} className="underline" aria-label="Написать в поддержку">
        Написать
      </button>
    </div>
  );
}

/** ================== Экран: регистрация/настройки ================== */
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
      </div>

      <div className="mt-6">
        <PrimaryButton disabled={!canContinue} onClick={onContinue}>Продолжить</PrimaryButton>
      </div>
    </div>
  );
}

const ALL_CATEGORIES: Category[] = ["Наука и образование","Активный отдых","Искусство","Еда и напитки","Развлечения","Мода и красота","Музыка"];

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
          <button key={c} onClick={()=>toggle(c)}
                  className="w-full rounded-2xl border-2 px-4 py-3 text-left text-lg"
                  style={{ borderColor: palette.caramel, background: value.includes(c)? palette.caramel : "transparent",
                           color: value.includes(c)? "#f8efe7" : palette.coffee }}>
            {c}
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
  routes: RouteCard[]; filter: "all" | Category; setFilter: (f: "all"|Category)=>void;
  favorites: string[]; setFavorites: (ids:string[])=>void;
}) {
  const [detail, setDetail] = useState<RouteCard|null>(null);
  const filtered = routes.filter((r)=> filter==="all" ? true : r.category===filter);
  const toggleFav = (id:string)=> setFavorites(favorites.includes(id)? favorites.filter(x=>x!==id) : [...favorites,id]);

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
            <FilterChip key={c} active={filter===c} onClick={()=>setFilter(c)}>{c}</FilterChip>
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
function CompletedScreen({ completed }: { completed: string[] }) {
  return (
    <div className="px-5 py-6">
      <BackTitle title="Завершённые маршруты" />
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
function MyKulyScreen({ kuly }: { kuly: KulaPhoto[] }) {
  return (
    <div className="px-5 py-6">
      <BackTitle title="Мои Кулы" />
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
function PromosScreen({ promos }: { promos: Promo[] }) {
  return (
    <div className="px-5 py-6">
      <BackTitle title="Мои промокоды" />
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
function RatingScreen({ username, kuly, passedCount, hasVoucher }: { username:string; kuly:KulaPhoto[]; passedCount:number; hasVoucher:boolean; }) {
  return (
    <div className="px-5 py-6">
      <BackTitle title="Рейтинг" />
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
function RouteRunnerModalInner({ routeId, getRoute, progress, setProgress, onFinished, onClose }: RouteRunnerProps & { onClose: ()=>void }) {
  const detail = getRoute(routeId);
  const [pos, setPos] = useState<{lat:number;lon:number}|null>(null);
  const [sum, setSum] = useState<string>("");

  useEffect(()=>{
    if (!detail) return;
    let watchId:number|undefined;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (p)=> setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
        ()=>{},
        { enableHighAccuracy:true, maximumAge: 1500, timeout: 8000 }
      );
    }
    return ()=> { if (watchId!==undefined) navigator.geolocation.clearWatch(watchId); };
  },[detail]);

  if (!detail) return null;

  const done = new Set(progress[routeId] || []);
  const markDone = (pid:string)=> {
    const current = new Set(progress[routeId] || []);
    current.add(pid);
    const next = { ...progress, [routeId]: Array.from(current) };
    setProgress(next);
  };

  const allDone = detail.points.every(p=>done.has(p.id));

  useEffect(()=>{
    if (allDone) {
      // завершили — показываем финальный шаг (фото)
      onClose();
      onFinished(routeId);
    }
  },[allDone, onClose, onFinished, routeId]);

  return (
    <Drawer onClose={onClose}>
      <div className="text-2xl font-semibold" style={{ color: palette.coffee }}>Маршрут: {detail.city}</div>
      <div className="mt-2 text-sm opacity-80">Идёт отслеживание. Можно отмечать точки вручную.</div>

      <div className="mt-4 space-y-3">
        {detail.points.map((p)=> {
          const reached = pos ? metersBetween(pos.lat,pos.lon,p.lat,p.lon) <= p.radiusM : false;
        const isDone = done.has(p.id) || reached;
          return (
            <div key={p.id} className="rounded-xl p-3" style={{ background: isDone? "#d9f6da" : palette.cream, color: palette.coffee }}>
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{p.title}</div>
                <div className="text-sm">{isDone? "✓" : "—"}</div>
              </div>
              <div className="mt-1 text-sm opacity-90">{p.summary}</div>
              <div className="mt-2 flex gap-6 text-sm opacity-80">
                <span>Радиус засчёта: {p.radiusM} м</span>
                {pos && <span>До точки: {Math.max(0, Math.round(metersBetween(pos.lat,pos.lon,p.lat,p.lon)))} м</span>}
              </div>
              <div className="mt-2 flex gap-2">
                {!isDone && (
                  <button className="rounded-md px-3 py-2" style={{ background: palette.caramel, color:"#fff" }}
                          onClick={()=>markDone(p.id)}>Я на месте</button>
                )}
                <button className="rounded-md px-3 py-2" style={{ background: palette.cream, color: palette.coffee }}
                        onClick={()=>setSum(p.summary)}>Сводка</button>
              </div>
            </div>
          );
        })}
      </div>

      {sum && (
        <div className="mt-4 rounded-xl p-3" style={{ background: "#fff4cc", color: "#533" }}>
          <div className="font-semibold">Сводка</div>
          <div className="mt-1 text-sm">{sum}</div>
        </div>
      )}
    </Drawer>
  );
}

/** ================== Модалка загрузки фото-завершалки ================== */
function UploadFinishPhotoModalInner({ routeId, onClose, onPhotoSaved }: { routeId:string; onClose:()=>void; onPhotoSaved:(ph:KulaPhoto, gavePromo:boolean)=>void; }) {
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
    </Drawer>
  );
}

const UploadFinishPhotoModal = {
  open(opts:{ routeId:string; onPhotoSaved:(ph:KulaPhoto, gavePromo:boolean)=>void }) {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    const onClose = () => { root.unmount(); div.remove(); };
    root.render(
      <UploadFinishPhotoModalInner
        routeId={opts.routeId}
        onPhotoSaved={opts.onPhotoSaved}
        onClose={onClose}
      />
    );
  }
};

/** ================== Переиспользуемые UI ================== */
function BackTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-3xl">‹</span>
      <h1 className="text-4xl" style={{ color: palette.coffee, fontFamily: "'Amatic SC', cursive" }}>{title}</h1>
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