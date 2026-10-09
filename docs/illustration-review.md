# Illustration meaning review

The previous catalogue used related emoji as shortcuts for many words. A whole-catalogue contact-sheet review found direct contradictions (empty/full), missing states (sad, wet), objects substituted for actions (rice/eat), and incorrect nouns (chair/table, tree/pine cone, toothbrush/toothpaste). These are content defects; an AI layout planner cannot infer correct visual meaning from a label alone.

## Published corrections

`lib/content/visuals.ts` registers 160 reviewed illustration cells in ten 4×4 sheets, plus three deliberate object aliases (red car, yellow truck, blue cup). This includes **all 55 actions and all 47 colors/descriptions**, and 61 further object/family/outdoor concepts including the aliases. Original illustrations were generated specifically for this app, visually reviewed, and encoded as WebP without changing layout. Ten sheets total approximately 2.7 MB; an individual cell uses a clipped view of the shared sheet, so it does not download a separate copy for each card.

The review checked the actual depicted subject, relevant color, object state, and action against the curated phrases. Examples:

- Sad: downturned mouth and visible tears on a teddy; happy: smiling dog with wagging tail.
- Empty/full: the same blue bowl with a bare interior versus rice filling it to the rim.
- Wet/dry: visibly dripping hands versus a dry towel.
- Open/close: door swung open versus flush with its frame.
- Push/pull: child behind versus in front of a wagon, with direction cues.
- Table: a tabletop and legs; toothpaste: a tube; pine cone: woody scales.
- Fire engine, garbage truck, tow truck, cement mixer and dump truck have their distinctive equipment.
- Red car, blue bus, green trousers, red shoes, white cat/egg/hen and orange fish match their authored descriptions.

A static illustration cannot establish temperature, texture, hunger, family identity, or movement with certainty. These concepts use parent modeling and real-world discussion; they are not forced into picture-choice identification. Descriptive contrasts are limited to an explicit reviewed list. Concrete object choices stay within the same category. Family roles require parent explanation or familiar My World photos.

## Rendering and existing accounts

Use `ConceptImage` for every concept illustration. It checks both the slug and exact original seeded image path before applying the reviewed replacement. Parent-owned cards and changed image URLs are preserved. Existing accounts receive the corrected art without changing vocabulary, translations, photos, progression, or reseeding their records. Legacy paths remain for compatibility; do not render them directly in new UI.

Picture choices have visible labels and an explicit target word. AI is given permitted option IDs per target and cannot select a random object as an abstract-state distractor. Previously saved layouts with inappropriate choices are repaired locally while retaining card IDs, stages and progress; no provider call is made when resuming.

The service worker uses a new cache version and caches only versioned public meaning sheets in addition to existing public SVG artwork. Account data and family photos remain excluded. Deploy the new app, close and reopen the PWA to activate the worker, and start or resume a session. No database migration or API key is needed for these corrections.

## Review new content

1. Compare the illustration with every curated language stage; check subject, color and visible action/state. Never assume a related emoji is enough.
2. For an abstract concept, depict its physical context. A water droplet means water, not necessarily wet; a bowl is not necessarily empty.
3. Review the actual rendered cell, including boundaries, at phone size. Check readable faces and visible state details.
4. Register approved art and explicitly review any contrast pair before allowing picture choices. Touch, temperature and family relationships should remain parent-guided.
5. When replacing a sheet, use a new file version and update the registry/renderer path so PWA caches do not reuse old art. Update cell order only together with the registry.
6. Tests check coverage, asset availability, privacy, pairing rules and resume repairs. **They do not prove a child will understand an image.** Keep visual review and parent feedback as part of content acceptance. Review Burmese phrasing separately with a fluent speaker.
