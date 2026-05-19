// File: src/lib/utils/analytics.ts
// Re-exports trackInteraction from tracker.ts for backward compatibility.
// All interaction tracking should go through the unified tracker module.
export { trackInteraction, type InteractionType } from "./tracker";
