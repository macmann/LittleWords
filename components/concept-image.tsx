"use client";
import { useId, useState } from "react";
import type { Concept } from "@/types";
import { meaningVisual } from "@/lib/content/visuals";
/** Shared renderer keeps word library, previews and child activities consistent. */
export function ConceptImage({
  concept,
  alt = "",
  className,
  loading,
}: {
  concept: Pick<Concept, "slug" | "categoryId" | "imageUrl" | "childId">;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const clipId = `meaning-${useId().replace(/:/g, "")}`;
  const [failed, setFailed] = useState<string | null>(null);
  const visual = meaningVisual(concept);
  if (visual && failed !== `meaning:${visual.sheet}`) {
    const column = visual.cell % 4,
      row = Math.floor(visual.cell / 4);
    return (
      <svg
        className={`concept-illustration ${className ?? ""}`}
        viewBox="0 0 256 256"
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        focusable="false"
      >
        <defs>
          <clipPath id={clipId}>
            <rect width="256" height="256" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <image
            href={`/images/meaning/${visual.sheet}-v1.webp`}
            x={-column * 256}
            y={-row * 256}
            width={1024}
            height={1024}
            preserveAspectRatio="none"
            onError={() => setFailed(`meaning:${visual.sheet}`)}
          />
        </g>
      </svg>
    );
  }
  // Do not reintroduce a misleading legacy symbol when reviewed art fails to load.
  const source =
    visual || failed === concept.imageUrl
      ? "/images/fallback.svg"
      : concept.imageUrl;
  return (
    <img
      className={className}
      src={source}
      alt={alt}
      loading={loading}
      decoding="async"
      draggable={false}
      onError={() => setFailed(source)}
    />
  );
}
