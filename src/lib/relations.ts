// How a family member is related to the person who added them. The family can pick one of
// these or write their own. Khairiyat addresses them by the name the family gives ("Phuppo",
// "Appa"), and only speaks like a son or daughter to parents and grandparents.

export type Relation = {
  id: string;
  en: string;
  ur: string;
  gender: "female" | "male";
  call: string; // suggested "what you call them", in Roman letters
  callUr: string; // the same in Urdu
  elder: boolean; // parents and grandparents
};

const r = (id: string, en: string, ur: string, gender: Relation["gender"], call: string, callUr: string, elder = false): Relation => ({
  id, en, ur, gender, call, callUr, elder,
});

export const RELATIONS: Relation[] = [
  r("mother", "Mother", "والدہ", "female", "Ammi", "امی", true),
  r("father", "Father", "والد", "male", "Abbu", "ابو", true),
  r("dadi", "Grandmother (Dadi)", "دادی", "female", "Dadi", "دادی", true),
  r("dada", "Grandfather (Dada)", "دادا", "male", "Dada", "دادا", true),
  r("nani", "Grandmother (Nani)", "نانی", "female", "Nani", "نانی", true),
  r("nana", "Grandfather (Nana)", "نانا", "male", "Nana", "نانا", true),
  r("sister", "Sister", "بہن", "female", "Appa", "آپا"),
  r("brother", "Brother", "بھائی", "male", "Bhai", "بھائی"),
  r("phuppo", "Aunt (Phuppo)", "پھوپھو", "female", "Phuppo", "پھوپھو"),
  r("khala", "Aunt (Khala)", "خالہ", "female", "Khala", "خالہ"),
  r("chachi", "Aunt (Chachi)", "چچی", "female", "Chachi", "چچی"),
  r("chacha", "Uncle (Chacha)", "چچا", "male", "Chacha", "چچا"),
  r("mamu", "Uncle (Mamu)", "ماموں", "male", "Mamu", "ماموں"),
  r("taya", "Uncle (Taya)", "تایا", "male", "Taya", "تایا"),
  r("wife", "Wife", "بیوی", "female", "", ""),
  r("husband", "Husband", "شوہر", "male", "", ""),
];

export const OTHER_RELATION = "other";
export const MAX_RELATION = 30;

export function findRelation(relation: string): Relation | undefined {
  return RELATIONS.find((x) => x.id === relation);
}

// The label to show. People added before relationships existed have an empty value: they
// were all parents, so it follows their gender. Anything else is what the family wrote.
export function relationLabel(relation: string, gender: "female" | "male", lang: "en" | "ur"): string {
  const known = findRelation(relation || (gender === "female" ? "mother" : "father"));
  return known ? known[lang] : relation;
}

export function isElder(relation: string): boolean {
  return relation === "" || Boolean(findRelation(relation)?.elder);
}
