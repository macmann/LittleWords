"use client";
import { useState } from "react";
import { Check } from "lucide-react";
export function ParentPasswordForm({ onSaved }: { onSaved: () => void }) {
  const [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [currentPassword, setCurrentPassword] = useState(""),
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
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, password, confirmation }),
          });
          const value = await res.json();
          if (!res.ok) throw new Error(value.error);
          setPassword("");
          setConfirmation("");
          setCurrentPassword("");
          setSaved(true);
          onSaved();
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Could not change your password.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Current account password
        <input
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </label>
      <label>
        New account password
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
        Use 8–128 characters. Keep it somewhere safe; email recovery is not
        available yet.
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
      {saved && (
        <p role="status" className="success-message">
          Password changed. Other account sessions are now signed out.
        </p>
      )}
      <button className="primary" disabled={busy}>
        {busy ? "Saving…" : "Change password"}
        <Check size={18} />
      </button>
    </form>
  );
}
