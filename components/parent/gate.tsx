"use client";
import { useState, useRef, useEffect } from "react";
import { LockKeyhole, X, ArrowRight } from "lucide-react";
export function ParentGate({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: () => void;
}) {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="modal-backdrop">
      <section
        className="gate-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-title"
      >
        <button
          className="close-modal icon-button"
          onClick={onClose}
          aria-label="Close parent gate"
        >
          <X />
        </button>
        <div className="round-symbol">
          <LockKeyhole size={30} />
        </div>
        <h2 id="gate-title">A space for grown-ups</h2>
        <p>Enter your parent password to manage words, photos, and settings.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const res = await fetch("/api/gate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error);
              onOpen();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="parent-password">Parent password</label>
          <input
            ref={input}
            id="parent-password"
            type="password"
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Opening…" : "Open parent area"}
            <ArrowRight size={19} />
          </button>
        </form>
      </section>
    </div>
  );
}
