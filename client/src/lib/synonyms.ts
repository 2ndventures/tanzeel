/**
 * Concept synonym map for the search "concept layer".
 *
 * Each key is a canonical concept word; the array lists related terms. Matching
 * is bidirectional and stem-aware (handled in searchService): if a query word
 * stems to the key OR to any synonym, the whole group is treated as related
 * terms and expanded into the corpus search. This complements the topic index
 * (client/src/lib/topicIndex.ts) — topics contribute their own keywords and
 * tagged verses, while this map adds finer-grained word-level synonyms.
 */
export const conceptSynonyms: Record<string, string[]> = {
  backbite: ["backbiting", "slander", "gossip", "spy", "spying", "suspicion", "rumor", "defame", "malign"],
  mercy: ["merciful", "compassion", "compassionate", "kindness", "clemency", "grace"],
  forgive: ["forgiveness", "pardon", "absolve", "repent", "repentance", "overlook"],
  charity: ["almsgiving", "alms", "zakat", "sadaqah", "give", "spend", "generosity", "donate"],
  patience: ["patient", "perseverance", "endurance", "steadfast", "persevere", "endure"],
  prayer: ["worship", "salah", "salat", "supplication", "invocation", "prostration"],
  fear: ["awe", "dread", "reverence", "piety", "god-fearing", "taqwa"],
  wealth: ["riches", "money", "affluence", "provision", "abundance", "treasure"],
  poverty: ["poor", "needy", "destitute", "deprivation"],
  justice: ["fairness", "equity", "fair", "just", "righteousness"],
  oppression: ["injustice", "tyranny", "wrongdoing", "transgression", "oppress"],
  lie: ["lying", "falsehood", "deceit", "deception", "dishonesty", "fabrication"],
  truth: ["truthful", "honesty", "honest", "sincerity", "sincere"],
  pride: ["arrogance", "arrogant", "conceit", "haughty", "vanity"],
  humility: ["humble", "modesty", "meekness"],
  anger: ["wrath", "rage", "fury", "indignation"],
  gratitude: ["grateful", "thankful", "thanks", "thankfulness", "appreciation"],
  greed: ["miserliness", "stinginess", "covetousness", "hoarding", "avarice"],
  knowledge: ["wisdom", "learning", "understanding", "insight", "intellect"],
  guidance: ["guide", "direction", "instruction", "light", "path"],
  punishment: ["torment", "chastisement", "penalty", "retribution", "doom", "suffering"],
  reward: ["recompense", "wage", "compensation", "blessing"],
  paradise: ["heaven", "garden", "jannah", "bliss"],
  hell: ["hellfire", "fire", "blaze", "jahannam", "inferno"],
  death: ["dying", "demise", "perish", "mortality"],
  resurrection: ["raising", "rising", "revival", "afterlife", "hereafter"],
  enemy: ["adversary", "foe", "opponent"],
  war: ["battle", "fighting", "combat", "conflict", "jihad", "struggle"],
  peace: ["tranquility", "harmony", "reconciliation", "calm", "serenity"],
  marriage: ["wedlock", "spouse", "wife", "husband", "matrimony"],
  parents: ["mother", "father", "elders", "kin"],
  orphan: ["fatherless", "destitute child"],
};
