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
  const [pin, setPin] = useState(""),
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
        <p>Enter your parent PIN to manage words, photos, and settings.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const res = await fetch("/api/gate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
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
          <label htmlFor="parent-pin">Parent PIN</label>
          <input
            ref={input}
            id="parent-pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4,8}"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            autoComplete="off"
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
        <small>
          For a fresh local setup, the demo PIN is 2468. Change it in your
          environment settings.
        </small>
      </section>
    </div>
  );
}
