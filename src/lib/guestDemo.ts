/** Local-only guest trial flashcards (not tied to an account). */
export const GUEST_DEMO_SCORE_KEY = "laoshi-xu:anon-demo:score";
export const GUEST_DEMO_TRIALS_KEY = "laoshi-xu:anon-demo:trialsUsed";
export const GUEST_DEMO_ROUND_KEY = "laoshi-xu:anon-demo:round";
/** Increments each time the guest chooses “Retry” after 10 rounds; narrows the demo word pool on the server. */
export const GUEST_DEMO_VOCAB_TIER_KEY = "laoshi-xu:anon-demo:vocabTier";
export const GUEST_DEMO_MAX_TRIALS = 10;
