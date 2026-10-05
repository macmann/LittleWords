"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  House,
  Shapes,
  Camera,
  LockKeyhole,
  Heart,
  Volume2,
  Sun,
  ChevronRight,
  Clock3,
  Menu,
  X,
  Leaf,
  Check,
  RefreshCw,
  Route,
} from "lucide-react";
import type { Bootstrap, Session, Language } from "@/types";
import { CategoryIcon } from "./icons";
import { LearningSession, LanguageControls } from "./child/learning-session";
import { ParentGate } from "./parent/gate";
import { VocabularyManager } from "./parent/words";
import { ContentEditor } from "./parent/content-editor";
import { Settings } from "./parent/settings";
import { MissionTrack } from "./parent/mission-track";
import { FirstRunSetup } from "./parent/password-form";
import { audioService } from "@/lib/audio/service";
type Page =
  "home" | "words" | "categories" | "world" | "parent" | "admin" | "track";
const nav: {
  page: Page;
  label: string;
  icon: typeof House;
  parent?: boolean;
}[] = [
  { page: "home", label: "Home", icon: House },
  { page: "words", label: "My words", icon: BookOpen, parent: true },
  { page: "track", label: "Missions", icon: Route },
  { page: "categories", label: "Categories", icon: Shapes },
  { page: "world", label: "My world", icon: Camera, parent: true },
];
export function AppShell() {
  const [data, setData] = useState<Bootstrap | null>(null),
    [loadError, setLoadError] = useState(""),
    [page, setPage] = useState<Page>("home"),
    [session, setSession] = useState<Session | null>(null),
    [language, setLanguage] = useState<Language>("EN"),
    [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(
      null,
    ),
    [pending, setPending] = useState<Page | null>(null),
    [parent, setParent] = useState(false),
    [mobileMenu, setMobileMenu] = useState(false),
    [starting, setStarting] = useState(false),
    [error, setError] = useState(""),
    [browserVoice, setBrowserVoice] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      const value = await res.json();
      if (!res.ok) throw new Error(value.error);
      setData(value);
      setLoadError("");
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : "We couldn’t load your words. Please try again.",
      );
    }
  }, []);
  useEffect(() => {
    void refresh();
    setBrowserVoice(localStorage.getItem("lw-device-voice") !== "off");
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, [refresh]);
  useEffect(() => {
    if (data) setLanguage(data.profile.primaryLanguage);
  }, [data?.profile.primaryLanguage]); // eslint-disable-line
  function voice(v: boolean) {
    setBrowserVoice(v);
    localStorage.setItem("lw-device-voice", v ? "on" : "off");
  }
  async function navigate(target: Page) {
    setMobileMenu(false);
    setError("");
    if (["words", "world", "parent", "admin"].includes(target)) {
      try {
        const check = await fetch("/api/gate");
        if (!check.ok) {
          setParent(false);
          setPending(target);
          return;
        }
      } catch {
        setPending(target);
        return;
      }
    }
    setPage(target);
  }
  async function withParent(action: () => Promise<void>) {
    try {
      const check = await fetch("/api/gate", { cache: "no-store" });
      if (!check.ok) {
        setPendingAction(() => action);
        setPending("track");
        return;
      }
      setParent(true);
      await action();
    } catch {
      setError("Could not open parent tools. Please try again.");
    }
  }
  async function confirmMission(missionId: string) {
    if (starting) return;
    await withParent(async () => {
      setStarting(true);
      setError("");
      try {
        const res = await fetch("/api/track", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ missionId, language, offlineDone: true }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        await refresh();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not save mission progress.",
        );
      } finally {
        setStarting(false);
      }
    });
  }
  async function startMission(missionId: string) {
    if (starting) return;
    await withParent(() => start(undefined, missionId));
  }
  async function start(category?: string, missionId?: string) {
    if (!data || starting) return;
    setStarting(true);
    setError("");
    audioService.stop();
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: data.profile.id,
          language,
          numberOfCards: data.profile.cardsPerSession,
          category,
          missionId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSession(json);
      setMobileMenu(false);
      setParent(false);
      await fetch("/api/gate", { method: "DELETE" });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not start. Please try again.",
      );
    } finally {
      setStarting(false);
    }
  }
  async function lock() {
    await fetch("/api/gate", { method: "DELETE" });
    setParent(false);
    setPage("home");
  }
  if (!data)
    return (
      <main className="loading-page">
        <Brand />
        {loadError ? (
          <>
            <h1>A little pause</h1>
            <p role="alert">{loadError}</p>
            <button className="primary" onClick={() => void refresh()}>
              <RefreshCw size={18} />
              Try again
            </button>
          </>
        ) : (
          <>
            <div className="loading-sun">
              <Sun size={40} />
            </div>
            <p>Getting your little words ready…</p>
          </>
        )}
      </main>
    );
  if (!data.demo && !data.security.configured)
    return (
      <FirstRunSetup
        legacyPinRequired={data.security.legacyPinRequired}
        onSaved={() => {
          setParent(true);
          setData((current) =>
            current
              ? {
                  ...current,
                  security: { configured: true, legacyPinRequired: false },
                }
              : current,
          );
          void refresh();
        }}
      />
    );
  if (session)
    return (
      <LearningSession
        data={data}
        session={session}
        browserVoice={browserVoice}
        onRefresh={() => void refresh()}
        onExit={() => {
          audioService.stop();
          setSession(null);
          setPage(session.missionId ? "track" : "home");
          void refresh();
        }}
      />
    );
  const known = data.vocabulary.filter((v) => v.status === "KNOWN").length;
  return (
    <div className="app-layout">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            onClick={() => setMobileMenu(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
        <p className="sidebar-tagline">Little words. Big discoveries.</p>
        <nav aria-label="Main navigation">
          {nav.map(({ page: target, label, icon: Icon }) => (
            <button
              key={target}
              className={`nav-item ${page === target ? "active" : ""}`}
              onClick={() => void navigate(target)}
            >
              <Icon size={21} strokeWidth={1.8} />
              {label}
              {target === "words" && <span className="nav-count">{known}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="together-card">
            <div className="sun-mark">
              <Sun size={26} />
            </div>
            <h3>Better together.</h3>
            <p>
              A little screen time.
              <br />A lot of real-world wonder.
            </p>
            <div className="tiny-leaves">
              <Leaf size={18} />
              <Leaf size={14} />
            </div>
          </div>
          <button
            className={`nav-item parent-nav ${page === "parent" || page === "admin" ? "active" : ""}`}
            onClick={() => void navigate("parent")}
          >
            <LockKeyhole size={19} />
            Parent area
            <ChevronRight size={17} />
          </button>
          <div className="profile-mini">
            <span className="profile-avatar">D</span>
            <div>
              <strong>{data.profile.name}</strong>
              <small>{parent ? "Parent mode" : "Learning together"}</small>
            </div>
            {parent && (
              <button
                title="Lock parent mode"
                aria-label="Lock parent mode"
                className="icon-button"
                onClick={() => void lock()}
              >
                <LockKeyhole size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <button
              className="icon-button"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(true)}
            >
              <Menu />
            </button>
            <Brand />
          </div>
          <div className="breadcrumb">
            A little learning, a lot of connection <Heart size={15} />
          </div>
          <div className="topbar-right">
            <LanguageControls
              language={language}
              enabled={data.profile.enabledLanguages}
              onChange={setLanguage}
            />
            <span className="profile-avatar top-avatar">D</span>
          </div>
        </header>
        <main className="main-content">
          {loadError && (
            <div className="notice" role="alert">
              {loadError}
              <button className="text-button" onClick={() => void refresh()}>
                Retry
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {page === "home" && (
            <>
              <div className="home-heading">
                <div>
                  <p className="eyebrow">A LITTLE EVERY DAY</p>
                  <h1>
                    Big discoveries start
                    <br className="desktop-break" /> with little words
                    <span className="heading-dot">.</span>
                  </h1>
                  <p>See it. Say it. Make a little connection.</p>
                </div>
                <div className="hand-drawn-sun">
                  <Sun size={63} strokeWidth={1.2} />
                  <span>
                    Let’s grow
                    <br />
                    together
                  </span>
                </div>
              </div>
              <section className="hero-card">
                <div className="hero-copy">
                  <span className="pill">
                    <span /> MADE FOR LITTLE LEARNERS
                  </span>
                  <h2>
                    One word.
                    <br />A world of possibilities.
                  </h2>
                  <p>
                    Turn familiar words into little phrases,
                    <br className="desktop-break" /> one happy moment at a time.
                  </p>
                  <button
                    className="primary hero-button"
                    disabled={starting}
                    onClick={() => void start()}
                  >
                    {starting ? "Getting ready…" : "Start learning"}
                    <ArrowRight size={21} />
                  </button>
                  <div className="session-meta">
                    <Clock3 size={16} />
                    <span>
                      {data.profile.cardsPerSession} cards · includes pauses
                    </span>
                    <span className="meta-dot">·</span>
                    <span>At your child’s pace</span>
                  </div>
                </div>
                <div className="hero-art">
                  <div className="hero-orbit orbit-one" />
                  <div className="hero-orbit orbit-two" />
                  <span className="art-spark spark-one">✧</span>
                  <span className="art-spark spark-two">✦</span>
                  <img
                    src="/images/hero-truck.svg"
                    alt="A friendly yellow toy truck"
                  />
                  <div className="word-sticker">
                    <Volume2 size={19} />
                    <strong>
                      {language === "DE"
                        ? "Großer gelber Lastwagen"
                        : language === "MY"
                          ? "အဝါရောင် ကုန်တင်ကားကြီး"
                          : "Big yellow truck"}
                    </strong>
                    <Heart size={17} />
                  </div>
                </div>
              </section>
              <button
                className="home-track-banner"
                onClick={() => void navigate("track")}
              >
                <span className="round-symbol">
                  <Route size={27} />
                </span>
                <div>
                  <h3>Follow our little mission path</h3>
                  <p>
                    Four levels. Shared words, longer phrases, and real-world
                    adventures.
                  </p>
                </div>
                <ArrowRight size={21} />
              </button>
              <section className="discovery-section">
                <div className="section-heading">
                  <h2>A little of what they love</h2>
                  <button
                    className="text-button"
                    onClick={() => setPage("categories")}
                  >
                    All categories
                    <ArrowRight size={17} />
                  </button>
                </div>
                <div className="category-grid home-categories">
                  {data.categories.slice(0, 4).map((c) => (
                    <button
                      disabled={starting}
                      key={c.id}
                      className={`category-tile category-${c.slug}`}
                      onClick={() => void start(c.id)}
                    >
                      <span className="category-illustration">
                        <img src={`/images/category-${c.slug}.svg`} alt="" />
                      </span>
                      <strong>{c.name}</strong>
                      <span>
                        {
                          data.concepts.filter(
                            (x) =>
                              x.categoryId === c.id && x.active && !x.childId,
                          ).length
                        }{" "}
                        little discoveries
                        <ArrowRight size={15} />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="home-lower">
                <button
                  className="familiar-panel"
                  onClick={() => void navigate("words")}
                >
                  <span className="panel-symbol">
                    <BookOpen size={27} />
                  </span>
                  <div>
                    <h3>Start with what they know</h3>
                    <p>{known} familiar words. So many ways to grow.</p>
                    <span>
                      Explore my words
                      <ArrowRight size={15} />
                    </span>
                  </div>
                  <div className="little-word-tags">
                    <span>car</span>
                    <span>blue</span>
                    <span>truck</span>
                  </div>
                </button>
                <article className="parent-tip">
                  <div>
                    <Heart size={19} />
                    <span>A LITTLE TIP FOR GROWN-UPS</span>
                  </div>
                  <p>
                    When they say <strong>“truck,”</strong> try
                    <br />
                    <strong>“Yes! A big truck!”</strong>
                  </p>
                  <small>A little more language. A lot of encouragement.</small>
                </article>
              </section>
              <footer className="home-footer">
                <Leaf size={16} />
                <span>Small moments. Real connections. No rush.</span>
                <Heart size={14} />
              </footer>
            </>
          )}
          {page === "categories" && (
            <section className="parent-page">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">FOLLOW THEIR CURIOSITY</p>
                  <h1>
                    A world to discover<span className="heading-dot">.</span>
                  </h1>
                  <p>Choose something they love. Explore it together.</p>
                </div>
              </div>
              <button
                className="mixed-card"
                disabled={starting}
                onClick={() => void start()}
              >
                <div className="round-symbol">
                  <Shapes size={30} />
                </div>
                <div>
                  <h2>A little bit of everything</h2>
                  <p>Familiar favorites, mixed with new discoveries.</p>
                </div>
                <ArrowRight />
              </button>
              <div className="all-categories">
                {data.categories.map((c) => (
                  <button
                    key={c.id}
                    disabled={starting}
                    className={`category-choice category-${c.slug}`}
                    onClick={() => void start(c.id)}
                  >
                    <span className="round-symbol">
                      <CategoryIcon name={c.icon} size={32} />
                    </span>
                    <h2>{c.name}</h2>
                    <p>
                      {
                        data.concepts.filter(
                          (x) => x.active && x.categoryId === c.id,
                        ).length
                      }{" "}
                      word cards
                    </p>
                    <ArrowRight size={20} />
                  </button>
                ))}
              </div>
            </section>
          )}
          {page === "track" && (
            <MissionTrack
              data={data}
              language={language}
              busy={starting}
              onStart={(id) => void startMission(id)}
              onConfirm={(id) => void confirmMission(id)}
            />
          )}
          {page === "words" && (
            <VocabularyManager data={data} onRefresh={() => void refresh()} />
          )}
          {page === "world" && (
            <ContentEditor
              data={data}
              custom
              onRefresh={() => void refresh()}
            />
          )}
          {page === "admin" && (
            <ContentEditor
              data={data}
              custom={false}
              onRefresh={() => void refresh()}
            />
          )}
          {page === "parent" && (
            <Settings
              data={data}
              onRefresh={() => void refresh()}
              browserVoice={browserVoice}
              onVoiceChange={voice}
              onAdmin={() => void navigate("admin")}
            />
          )}
        </main>
        <nav className="mobile-bottom" aria-label="Mobile navigation">
          {nav.map(({ page: target, label, icon: Icon }) => (
            <button
              aria-current={page === target ? "page" : undefined}
              key={target}
              className={page === target ? "active" : ""}
              onClick={() => void navigate(target)}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          ))}
          <button
            onClick={() => void navigate("parent")}
            className={page === "parent" ? "active" : ""}
          >
            <LockKeyhole size={20} />
            <span>Parent</span>
          </button>
        </nav>
      </div>
      {pending && (
        <ParentGate
          onClose={() => {
            setPending(null);
            setPendingAction(null);
          }}
          onOpen={() => {
            setParent(true);
            setPage(pending);
            setPending(null);
            if (pendingAction) {
              const action = pendingAction;
              setPendingAction(null);
              void action();
            }
          }}
        />
      )}
    </div>
  );
}
function Brand() {
  return (
    <span className="brand">
      <span className="brand-icon">
        <span />
        <span />
        <span />
      </span>
      littlewords<span className="brand-dot">.</span>
    </span>
  );
}
