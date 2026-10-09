"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Heart, ShieldCheck } from "lucide-react";
export function AccountScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<"signup" | "login" | "adopt">("signup"),
    [available, setAvailable] = useState(false),
    [databaseReady, setDatabaseReady] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmation: "",
    childName: "",
    years: "2",
    months: "0",
    primaryLanguage: "EN",
    legacyPassword: "",
  });
  useEffect(() => {
    fetch("/api/auth", { cache: "no-store" })
      .then(async (res) => {
        const value = await res.json();
        if (!res.ok) throw new Error(value.error);
        setAvailable(value.legacyAvailable);
        setDatabaseReady(value.databaseReady);
      })
      .catch((e) => setError(e.message || "Please try again."));
  }, []);
  function change(key: keyof typeof form, value: string) {
    setForm((old) => ({ ...old, [key]: value }));
  }
  return (
    <main className="account-page">
      <div className="account-intro">
        <span className="brand">
          littlewords<span className="brand-dot">.</span>
        </span>
        <h1>
          Little words.
          <br />
          Your family's discoveries.
        </h1>
        <p>
          See, hear, and say it together. Keep your child's familiar words and
          little adventures in one place.
        </p>
        <div className="account-promise">
          <Heart size={23} />
          <span>Made for moments together.</span>
        </div>
      </div>
      <section className="settings-card account-card">
        <div className="account-tabs">
          <button
            aria-pressed={mode !== "login"}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            Create account
          </button>
          <button
            aria-pressed={mode === "login"}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Sign in
          </button>
        </div>
        <h2>
          {mode === "login"
            ? "Welcome back."
            : mode === "adopt"
              ? "Bring your little words with you."
              : "A simple start."}
        </h2>
        <p>
          {mode === "login"
            ? "Pick up where you left off."
            : "No email verification. Just a few details, then you're ready."}
        </p>
        {!databaseReady && (
          <p role="alert" className="notice">
            Accounts need PostgreSQL. Configure the database and apply
            migrations before signing up.
          </p>
        )}
        <form
          className="password-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (mode !== "login" && form.password !== form.confirmation) {
              setError("Passwords do not match.");
              return;
            }
            setBusy(true);
            try {
              const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...form,
                  action: mode,
                  ageMonths: Number(form.years) * 12 + Number(form.months),
                }),
              });
              const value = await res.json();
              if (!res.ok) throw new Error(value.error);
              setForm((old) => ({
                ...old,
                password: "",
                confirmation: "",
                legacyPassword: "",
              }));
              onSignedIn();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not sign in.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {mode !== "login" && (
            <label>
              Your name
              <input
                autoComplete="name"
                required
                maxLength={60}
                value={form.name}
                onChange={(e) => change("name", e.target.value)}
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={form.email}
              onChange={(e) => change("email", e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "login" ? 1 : 8}
              maxLength={128}
              value={form.password}
              onChange={(e) => change("password", e.target.value)}
            />
          </label>
          {mode === "login" && (
            <p className="field-help">
              Use the password you chose at signup. It also opens the parent
              area.
            </p>
          )}
          {mode !== "login" && (
            <>
              <p className="field-help">
                Use at least 8 characters. This also opens the parent area.
              </p>
              <label>
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={form.confirmation}
                  onChange={(e) => change("confirmation", e.target.value)}
                />
              </label>
              <label>
                Child's name <span className="field-help">Optional</span>
                <input
                  maxLength={50}
                  value={form.childName}
                  onChange={(e) => change("childName", e.target.value)}
                />
              </label>
              <fieldset>
                <legend>How old is your child?</legend>
                <div className="age-fields">
                  <label>
                    Years
                    <select
                      aria-label="Years"
                      value={form.years}
                      onChange={(e) => change("years", e.target.value)}
                    >
                      {Array.from({ length: 8 }, (_, i) => (
                        <option value={i} key={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Months
                    <select
                      aria-label="Months"
                      value={form.months}
                      onChange={(e) => change("months", e.target.value)}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option value={i} key={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="field-help">
                  Age helps us prepare content for your child as they grow. No
                  birth date is needed.
                </p>
              </fieldset>
              <label>
                Primary language
                <select
                  value={form.primaryLanguage}
                  onChange={(e) => change("primaryLanguage", e.target.value)}
                >
                  <option value="EN">English</option>
                  <option value="MY">မြန်မာ</option>
                  <option value="DE">Deutsch</option>
                </select>
              </label>
            </>
          )}
          {mode === "adopt" && (
            <label>
              Previous parent password or PIN
              <input
                type="password"
                autoComplete="off"
                required
                maxLength={128}
                value={form.legacyPassword}
                onChange={(e) => change("legacyPassword", e.target.value)}
              />
              <span className="field-help">
                Authorizes moving your existing vocabulary, photos, and mission
                progress into this account.
              </span>
            </label>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy || !databaseReady}>
            {busy
              ? "Getting ready…"
              : mode === "login"
                ? "Sign in"
                : mode === "adopt"
                  ? "Link my saved words"
                  : "Create account and begin"}
            <ArrowRight size={19} />
          </button>
        </form>
        {available && mode !== "adopt" && (
          <button
            className="text-button legacy-link"
            onClick={() => {
              setMode("adopt");
              setError("");
            }}
          >
            Already used LittleWords? Keep your saved words.
          </button>
        )}
        <p className="account-footer">
          <ShieldCheck size={16} />
          Your family's photos and progress belong to your account.
        </p>
      </section>
    </main>
  );
}
