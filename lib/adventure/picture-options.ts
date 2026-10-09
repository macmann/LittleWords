import type { Concept } from "@/types";
import { meaningVisual } from "@/lib/content/visuals";
const colors = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "white",
  "pink",
  "purple",
  "brown",
  "gray",
  "orange-color",
];
const contrastPairs = [
  ["sad", "happy"],
  ["empty", "full"],
  ["wet", "dry"],
  ["clean", "dirty"],
  ["same", "different"],
  ["light-color", "dark-color"],
];
const contrasts: Record<string, string[]> = {};
for (const [a, b] of contrastPairs) {
  contrasts[a] = [b];
  contrasts[b] = [a];
}
for (const color of colors)
  contrasts[color] = colors.filter((c) => c !== color);
const relationships = new Set([
  "mama",
  "papa",
  "aunt",
  "uncle",
  "grandma",
  "grandpa",
  "brother",
  "sister",
  "friend",
]);
export function preferredPictureSlugs(concept: Concept): string[] {
  return contrasts[concept.slug] ?? [];
}
/** Actions, relationships, temperature and touch need parent modeling, not picture guessing. */
export function pictureOptions(target: Concept, pool: Concept[]): Concept[] {
  if (
    target.childId ||
    !target.active ||
    target.type === "ACTION" ||
    target.categoryId === "actions" ||
    relationships.has(target.slug)
  )
    return [];
  return pool.filter((option) => {
    if (!option.active || option.childId || option.id === target.id)
      return false;
    if (target.categoryId === "colors") {
      return (
        !!meaningVisual(target) &&
        !!meaningVisual(option) &&
        (contrasts[target.slug] ?? []).includes(option.slug)
      );
    }
    return (
      option.categoryId === target.categoryId && !relationships.has(option.slug)
    );
  });
}
