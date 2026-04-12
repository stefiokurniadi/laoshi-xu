/**
 * External grammar indexes (AllSet Learning Chinese Grammar Wiki).
 * Content is authored by AllSet Learning; we only link out.
 */
export type GrammarLevelInfo = {
  cefr: string;
  label: string;
  summary: string;
  wikiUrl: string;
};

export const ALLSET_GRAMMAR_BY_LEVEL_PAGE =
  "https://resources.allsetlearning.com/chinese/grammar/Grammar_points_by_level";

export const ALLSET_GRAMMAR_LEVELS: GrammarLevelInfo[] = [
  {
    cefr: "A1",
    label: "Beginner (A1)",
    summary: "Foundational patterns and very basic structures.",
    wikiUrl: "https://resources.allsetlearning.com/chinese/grammar/A1_grammar_points",
  },
  {
    cefr: "A2",
    label: "Elementary (A2)",
    summary: "Everyday expressions and simple compound patterns.",
    wikiUrl: "https://resources.allsetlearning.com/chinese/grammar/A2_grammar_points",
  },
  {
    cefr: "B1",
    label: "Intermediate (B1)",
    summary: "Broader structures for daily communication.",
    wikiUrl: "https://resources.allsetlearning.com/chinese/grammar/B1_grammar_points",
  },
  {
    cefr: "B2",
    label: "Upper intermediate (B2)",
    summary: "More nuanced grammar for fluent-style speech.",
    wikiUrl: "https://resources.allsetlearning.com/chinese/grammar/B2_grammar_points",
  },
  {
    cefr: "C1",
    label: "Advanced (C1)",
    summary: "Complex and formal patterns.",
    wikiUrl: "https://resources.allsetlearning.com/chinese/grammar/C1_grammar_points",
  },
  {
    cefr: "C2",
    label: "Proficient (C2)",
    summary: "Near-native subtlety and advanced usage.",
    wikiUrl: "https://resources.allsetlearning.com/chinese/grammar/C2_grammar_points",
  },
];
