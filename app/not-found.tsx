import Link from "next/link";
export default function NotFound() {
  return (
    <main className="loading-page">
      <h1>Let’s head home</h1>
      <p>This page isn’t available.</p>
      <Link className="primary" href="/">
        Back home
      </Link>
    </main>
  );
}
