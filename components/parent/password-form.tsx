"use client";
import { useState } from "react";
import { Check } from "lucide-react";
export function ParentPasswordForm({
  setup = false,
  legacyPinRequired = false,
  onSaved,
}: {
  setup?: boolean;
  legacyPinRequired?: boolean;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [currentPassword, setCurrentPassword] = useState(""),
    [legacyPin, setLegacyPin] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <form
      className="password-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setSaved(false);
        if (password !== confirmation) {
          setError("Passwords do not match.");
          return;
        }
        setBusy(true);
        try {
          const res = await fetch("/api/gate", {
            method: setup ? "POST" : "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: setup ? "setup" : undefined,
              password,
              confirmation,
              currentPassword,
              legacyPin,
            }),
          });
          const value = await res.json();
          if (!res.ok) throw new Error(value.error);
          setPassword("");
          setConfirmation("");
          setCurrentPassword("");
          setLegacyPin("");
          setSaved(true);
          onSaved();
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Could not save your password.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {!setup && (
        <label>
          Current parent password
          <input
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
      )}
      {setup && legacyPinRequired && (
        <label>
          Previous parent PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            required
            maxLength={8}
            value={legacyPin}
            onChange={(e) => setLegacyPin(e.target.value)}
          />
          <span className="field-help">
            Use your existing PIN once to authorize the password upgrade.
          </span>
        </label>
      )}
      <label>
        {setup ? "Parent password" : "New parent password"}
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <p className="field-help">
        Use 8–128 characters. Keep it somewhere safe; there is no email recovery
        yet.
      </p>
      <label>
        Confirm password
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {saved && !setup && (
        <p role="status" className="success-message">
          Password changed. Other parent sessions are now locked.
        </p>
      )}
      <button className="primary" disabled={busy}>
        {busy
          ? "Saving…"
          : setup
            ? "Set password and begin"
            : "Change password"}
        <Check size={18} />
      </button>
    </form>
  );
}
export function FirstRunSetup({
  legacyPinRequired,
  onSaved,
}: {
  legacyPinRequired: boolean;
  onSaved: () => void;
}) {
  return (
    <main className="onboarding-page">
      <section className="settings-card onboarding-card">
        <p className="eyebrow">WELCOME TO LITTLEWORDS</p>
        <h1>A little setup for grown-ups.</h1>
        <p>
          Choose a parent password before your first adventure. It protects word
          editing, photos, levels, and mission progress.
        </p>
        <ParentPasswordForm
          setup
          legacyPinRequired={legacyPinRequired}
          onSaved={onSaved}
        />
      </section>
    </main>
  );
}
