"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Download, Smartphone } from "lucide-react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const Context = createContext({
  online: true,
  installed: false,
  ios: false,
  canInstall: false,
  install: async () => {},
});
export function PwaProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true),
    [installed, setInstalled] = useState(false),
    [ios, setIos] = useState(false),
    [deferred, setDeferred] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const updateOnline = () => setOnline(navigator.onLine);
    const updateInstalled = () =>
      setInstalled(
        display.matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    const offer = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallEvent);
    };
    const finished = () => {
      setInstalled(true);
      setDeferred(null);
    };
    setIos(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    updateOnline();
    updateInstalled();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", finished);
    display.addEventListener("change", updateInstalled);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", finished);
      display.removeEventListener("change", updateInstalled);
    };
  }, []);
  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      setDeferred(null);
    }
  }
  return (
    <Context.Provider
      value={{ online, installed, ios, canInstall: !!deferred, install }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePwa() {
  return useContext(Context);
}
export function InstallCard() {
  const { installed, ios, canInstall, install, online } = usePwa();
  const [error, setError] = useState("");
  return (
    <article className="settings-card install-card">
      <Smartphone size={26} />
      <h2>
        {installed
          ? "Ready on your home screen"
          : "LittleWords on your home screen"}
      </h2>
      <p>
        {installed
          ? "Open LittleWords like an app, for a few moments together."
          : "Keep your little learning space a tap away."}
      </p>
      {!installed &&
        (canInstall ? (
          <button
            className="secondary"
            onClick={() =>
              void install().catch(() =>
                setError(
                  "Installation paused. Use your browser menu to add LittleWords to your home screen.",
                ),
              )
            }
          >
            <Download size={18} />
            Install LittleWords
          </button>
        ) : (
          <p className="install-steps">
            {ios
              ? "In Safari, tap Share, then Add to Home Screen. Choose Open as Web App if offered."
              : "Open your browser menu and choose Install app or Add to Home screen, if available."}
          </p>
        ))}
      {error && <p role="alert">{error}</p>}
      <p className="field-help">
        {online
          ? "Online learning saves progress to your account. Offline, a short real-world activity is available; full sessions still need a connection."
          : "You're offline. Connect again to open cards and save progress."}
      </p>
    </article>
  );
}
