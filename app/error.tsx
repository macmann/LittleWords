"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="loading-page">
      <h1>A little pause</h1>
      <p>Something interrupted the page. Please try again.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
