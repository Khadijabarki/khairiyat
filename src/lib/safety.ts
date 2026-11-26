// Khairiyat's safety rules: the one place that lists every emergency and worry
// Khairiyat watches for. Everything else is built from this list:
// - the AI's instructions (what to listen for and how to respond)
// - the "raise_alert" tool the AI calls when it notices one of these
// - a keyword double-check, in case the AI misses it
// - the buttons and tips shown on the parent's screen
//
// Two levels:
// - "urgent":  danger right now. Show 1122 and "call family" buttons, alert the family immediately.
// - "concern": not an emergency, but the family should know today.

export type AlertLevel = "urgent" | "concern";

export type SafetyRule = {
  id: string;
  level: AlertLevel;
  title: string; // English, for the family dashboard
  titleUr: string; // Urdu script, for the parent's screen
  signs: string; // Roman Urdu: what the parent might say (goes into the AI's instructions)
  response: string; // Roman Urdu: how Khairiyat should respond
  tipsUr?: string; // Urdu script: safety advice shown on the parent's screen
  keywords?: RegExp; // backup detection on the parent's words (Roman Urdu and Urdu script)
};

export const HELPLINES = {
  rescue: { number: "1122", labelUr: "ریسکیو 1122" },
  police: { number: "15", labelUr: "پولیس 15" },
};

export const SAFETY_RULES: SafetyRule[] = [
  // ---------- URGENT: danger right now ----------
  {
    id: "chest_pain",
    level: "urgent",
    title: "Chest pain or heart attack signs",
    titleUr: "سینے میں درد",
    signs: "seene mein dard, dabao ya bojh, dard baayein bazu ya jabre tak jana, dil ghabrana aur paseena",
    response: "Kaho ke foran baith jayein ya let jayein, koi kaam na karein, aur 1122 par call karein.",
    tipsUr: "فوراً بیٹھ جائیں، کوئی کام نہ کریں۔ 1122 پر کال کریں۔",
    keywords: /(seen[ae]y?|sine|chh?aa?ti|سینے|سینہ|چھاتی).{0,20}(dard|dabao|bojh|jalan|درد|دباؤ|بوجھ)|dil ka daura|heart attack|دل کا دورہ/i,
  },
  {
    id: "stroke",
    level: "urgent",
    title: "Possible stroke",
    titleUr: "فالج کی علامات",
    signs: "munh terha ho jana, zabaan larkharana ya baat na kar pana, ek taraf ka bazu/tang sun ya kamzor hona, achanak nazar dhundli",
    response: "Yeh stroke ho sakta hai, har minute qeemti hai. Foran 1122 par call karne ko kaho aur family ko batao.",
    tipsUr: "ہر منٹ قیمتی ہے۔ فوراً 1122 پر کال کریں۔",
    keywords: /(munh|mo?onh|chehra|منہ|چہرہ).{0,15}(terha|te?dha|lattak|ٹیڑھا|لٹک)|(zuba+n|زبان).{0,15}(larkh|atak|لڑکھڑا|اٹک)|(ek|aik|ایک) (taraf|طرف).{0,20}(sun|kamzor|سن|کمزور)|falij|فالج|stroke/i,
  },
  {
    id: "breathing",
    level: "urgent",
    title: "Trouble breathing",
    titleUr: "سانس میں تکلیف",
    signs: "saans na aana, saans phoolna jo ruk nahi raha, dam ghutna",
    response: "Kaho ke seedhe baith jayein, khirki khol dein, aur 1122 par call karein.",
    tipsUr: "سیدھے بیٹھ جائیں، کھڑکی کھول دیں۔ 1122 پر کال کریں۔",
    keywords: /(saa?n[sz]|سانس).{0,20}(nahi|nai|takleef|phool|ruk|mushkil|نہیں|تکلیف|پھول|رک)|dam ghut|دم گھٹ/i,
  },
  {
    id: "fall",
    level: "urgent",
    title: "Fall or injury",
    titleUr: "گر گئے / چوٹ",
    signs: "gir jana, gir kar uth na pana, sar par chot, haddi tootne ka dard",
    response: "Kaho ke zabardasti uthne ki koshish na karein. Chot zyada ho ya uth na sakein to 1122 par call karein.",
    tipsUr: "زبردستی اٹھنے کی کوشش نہ کریں۔ چوٹ زیادہ ہو تو 1122 پر کال کریں۔",
    keywords: /(main|mein|mai|میں)\s*(gir|گر)\s*(gay[ai]|gai|پڑ|گیا|گئی)|(uth|اٹھ).{0,10}(nahi|na|نہیں).{0,6}(pa|sak|پا|سک)|haddi (toot|tut)|ہڈی ٹوٹ/i,
  },
  {
    id: "unconscious",
    level: "urgent",
    title: "Fainting or unconsciousness",
    titleUr: "بے ہوشی",
    signs: "behosh ho jana, hosh kho dena, achanak andhera chha jana aur gir jana",
    response: "Kaho ke foran let jayein, aur 1122 par call karein. Family ko foran batao.",
    tipsUr: "فوراً لیٹ جائیں۔ 1122 پر کال کریں۔",
    keywords: /be ?hosh|بے ?ہوش|بیہوش|hosh (kho|nahi)|ہوش کھو/i,
  },
  {
    id: "seizure",
    level: "urgent",
    title: "Seizure",
    titleUr: "دورہ / جھٹکے",
    signs: "daura parna, jism mein jhatke, mirgi",
    response: "Kaho ke 1122 par call karein aur paas koi ho to usay bulayein.",
    tipsUr: "1122 پر کال کریں، کسی کو پاس بلائیں۔",
    keywords: /jhatk|جھٹک|mirgi|مرگی|daura par/i,
  },
  {
    id: "bleeding",
    level: "urgent",
    title: "Heavy bleeding",
    titleUr: "زیادہ خون بہنا",
    signs: "bohat khoon behna, khoon na rukna, khoon ki ulti",
    response: "Kaho ke saaf kapra zor se zakhm par dabayein aur 1122 par call karein.",
    tipsUr: "صاف کپڑا زخم پر زور سے دبائیں۔ 1122 پر کال کریں۔",
    keywords: /(khoo?n|خون).{0,15}(beh|nikal|ruk nahi|bohat|zyada|بہہ|نکل|نہیں رک)/i,
  },
  {
    id: "low_sugar",
    level: "urgent",
    title: "Low blood sugar signs",
    titleUr: "شوگر کم ہونا",
    signs: "sugar gir jana, paseena aur kaanpna, achanak bohat kamzori ya ghabrahat (khaas kar sugar ke mareez mein)",
    response: "Kaho ke foran kuch meetha kha lein (cheeni, juice, meethi cheez). Behtar na hon to 1122 par call karein.",
    tipsUr: "فوراً کچھ میٹھا کھا لیں (چینی، جوس)۔ بہتر نہ ہوں تو 1122۔",
    keywords: /(sh?ugar|شوگر).{0,15}(gir|kam|low|کم|گر)|(paseen|پسین).{0,20}(kaa?np|kamp|کانپ)/i,
  },
  {
    id: "overdose",
    level: "urgent",
    title: "Took too much medicine",
    titleUr: "غلطی سے زیادہ دوائی",
    signs: "ghalti se zyada goliyan kha lena, ek goli do baar le lena, ghalat dawai kha lena",
    response: "Kaho ke ghabrayein nahi, mazeed koi goli na lein, aur 1122 ya doctor se foran baat karein.",
    tipsUr: "مزید کوئی گولی نہ لیں۔ 1122 یا ڈاکٹر سے فوراً بات کریں۔",
    keywords: /(ghalti|galti|غلطی).{0,20}(goli|dawai|dawa|گولی|دوائی)|(do baar|دو بار|double).{0,15}(goli|dawai|گولی|دوائی)/i,
  },
  {
    id: "gas_fire",
    level: "urgent",
    title: "Gas leak, heater fumes or fire",
    titleUr: "گیس، ہیٹر یا آگ",
    signs: "gas ki boo, heater se sar dard ya chakkar, kamre mein dhuan, aag lagna",
    response: "Kaho ke foran gas band karein, khirki darwaze khol dein, bijli ke button na chherein, aur kamre se bahar nikal kar 1122 par call karein.",
    tipsUr: "گیس بند کریں، کھڑکیاں کھولیں، بجلی کے بٹن نہ چھیڑیں۔ باہر نکل کر 1122 پر کال کریں۔",
    keywords: /(gas|گیس).{0,15}(boo|bu|smell|leak|بو|لیک)|(heater|ہیٹر).{0,25}(boo|bu|sar|chakkar|بو|سر|چکر)|dhuan|دھواں|aag lag|آگ لگ/i,
  },
  {
    id: "intruder",
    level: "urgent",
    title: "Intruder or robbery",
    titleUr: "گھر میں چور",
    signs: "ghar mein chor ya daku, koi ajnabi zabardasti ghar mein ghusna",
    response: "Kaho ke kisi mehfooz kamre mein darwaza band kar lein aur 15 (police) par call karein.",
    tipsUr: "محفوظ کمرے میں دروازہ بند کریں۔ پولیس 15 پر کال کریں۔",
    keywords: /\bchor\b|daku|ڈاکو|چور|(ghar|گھر).{0,10}(ghus|گھس)/i,
  },
  {
    id: "self_harm",
    level: "urgent",
    title: "Talking about ending their life",
    titleUr: "بہت زیادہ پریشانی",
    signs: "marne ki baat, zindagi khatam karne ki baat, 'main kisi par bojh hoon', khud ko nuqsan pohanchane ki baat",
    response:
      "Bohat narmi se suno, unki baat ko halka mat lo, unhein akela mehsoos na hone do. Kaho ke tum abhi family ko bata rahi/raha ho taake koi foran unke paas aaye.",
    tipsUr: "آپ اکیلے نہیں ہیں۔ ابھی گھر والوں کو بتایا جا رہا ہے۔",
    keywords: /mar (jaun|jaoon|jana chah)|مر جاؤں|zindagi (khatam|bekar)|زندگی ختم|khud ?kushi|خودکشی|jeena nahi|جینا نہیں/i,
  },

  // ---------- CONCERN: tell the family today ----------
  {
    id: "fever",
    level: "concern",
    title: "Fever",
    titleUr: "بخار",
    signs: "bukhar, thand lag kar kaanpna",
    response: "Hamdardi karo, paani peene aur araam karne ko kaho, aur batao ke family ko bata dogi/doge.",
    keywords: /bukh?aa?r|بخار/i,
  },
  {
    id: "stomach",
    level: "concern",
    title: "Vomiting or diarrhoea",
    titleUr: "الٹی / دست",
    signs: "ulti, dast, pait kharab",
    response: "Paani aur ORS peene ko kaho, aur batao ke family ko bata dogi/doge. Bohat zyada ho to doctor.",
    keywords: /ulti|الٹی|\bdast\b|دست|pai?t kharab|پیٹ خراب/i,
  },
  {
    id: "medicine_missed",
    level: "concern",
    title: "Medicine missed or running out",
    titleUr: "دوائی رہ گئی / ختم",
    signs: "dawai bhool jana, kai din se dawai na lena, dawai khatam ho jana",
    response: "Pyar se yaad dilao. Dawai khatam ho gayi ho to kaho ke family ko bata dogi/doge taake mangwa dein.",
    keywords: /(dawai|dawa|goli|دوائی|دوا|گولی).{0,20}(bhool|bhul|khatam|nahi li|بھول|ختم|نہیں لی)/i,
  },
  {
    id: "not_eating",
    level: "concern",
    title: "Not eating",
    titleUr: "کھانا نہیں کھایا",
    signs: "khana na khana, bhook na lagna, kai waqt ka khana chhor dena",
    response: "Pyar se thora kuch kha lene ko kaho, aur family ko batao.",
    keywords: /(khana|bhook|bhuk|کھانا|بھوک).{0,15}(nahi|nai|na|نہیں)/i,
  },
  {
    id: "dizziness",
    level: "concern",
    title: "Dizziness",
    titleUr: "چکر",
    signs: "halka chakkar aana (bohat tez chakkar ya gir jane wala chakkar urgent hai)",
    response: "Kaho ke baith jayein aur paani piyein. Chakkar tez ho ya saath mein kuch aur ho to isay urgent samjho.",
    keywords: /chakk?ar|چکر/i,
  },
  {
    id: "bp_sugar_high",
    level: "concern",
    title: "High BP or sugar reading",
    titleUr: "بی پی یا شوگر زیادہ",
    signs: "BP ya sugar ki machine par reading zyada aana",
    response: "Reading ka number pooch lo, family ko batao, aur doctor ki di hui dawai yaad dilao.",
    keywords: /(\bbp\b|bi ?pi|بی پی|blood pressure|sh?ugar|شوگر).{0,15}(high|zyada|ziyada|barh|ہائی|زیادہ|بڑھ)/i,
  },
  {
    id: "swelling",
    level: "concern",
    title: "Swelling",
    titleUr: "سوجن",
    signs: "pairon ya haathon mein sojan",
    response: "Kaho ke pair thore oonche rakh kar araam karein, aur family ko batao.",
    keywords: /soo?j|سوج|waram|ورم/i,
  },
  {
    id: "lonely_sad",
    level: "concern",
    title: "Feeling very sad or lonely",
    titleUr: "اداسی / تنہائی",
    signs: "bohat udaas hona, akelapan, rona, dil na lagna",
    response: "Narmi se suno, tasalli do, aur kaho ke tum family ko bataogi/bataoge taake woh aaj call karein.",
    keywords: /udaa?s|اداس|akel[ia]|اکیل|tanha|تنہا|dil nahi lag|دل نہیں لگ|ro rah|رو رہ/i,
  },
  {
    id: "confusion",
    level: "concern",
    title: "Confused about time, day or place",
    titleUr: "وقت یا دن بھول جانا",
    signs: "waqt, din ya jagah bhool jana, ek hi baat baar baar poochna (yeh tum khud notice karo)",
    response: "Pyar se sahi baat batao, sharminda mat karo, aur family ko batao.",
  },
  {
    id: "scam_call",
    level: "concern",
    title: "Possible fraud call",
    titleUr: "مشکوک کال (فراڈ)",
    signs: "kisi ne phone par OTP, PIN ya code maanga, 'bank se call', inaam ya lottery nikalna, BISP/Benazir ke naam par paise maangna",
    response: "Saaf kaho: kisi ko OTP, PIN ya code kabhi mat batayein, bank kabhi phone par yeh nahi maangta. Family ko batao.",
    tipsUr: "کسی کو OTP، PIN یا کوڈ کبھی نہ بتائیں۔ بینک فون پر یہ کبھی نہیں مانگتا۔",
    keywords: /\botp\b|(pin|code|کوڈ).{0,20}(maang|poochh|bata|مانگ|پوچھ)|inaa?m|انعام|lottery|لاٹری|\bbisp\b|benazir|بینظیر|bank se (call|phone|fon)|بینک سے/i,
  },
];

export function getRule(id: string): SafetyRule | undefined {
  return SAFETY_RULES.find((r) => r.id === id);
}

// Backup check: finds the rules whose keywords appear in what the parent said.
export function detectByKeywords(text: string): SafetyRule[] {
  return SAFETY_RULES.filter((r) => r.keywords?.test(text));
}

// The safety section of the AI's instructions, built from the rules above.
// `rahi` is "rahi" (daughter's voice) or "raha" (son's voice), so the Urdu grammar matches.
export function safetyPrompt(childName: string, rahi: string): string {
  const list = (level: AlertLevel) =>
    SAFETY_RULES.filter((r) => r.level === level)
      .map((r) => `- [${r.id}] ${r.signs}. Jawab: ${r.response}`)
      .join("\n");

  return `
SEHAT AUR HIFAZAT (sab se zaroori)
Jab bhi neeche di gayi koi baat suno, FORAN "raise_alert" tool call karo (category = bracket wala naam, jaise "chest_pain"),
aur reason mein ${childName} ke liye ek chhoti Roman Urdu line likho. Tool call ke baad baat-cheet narmi se jari rakho.
Agar shak ho ke baat sangeen hai ya nahi, to ek chhota sawal pooch kar tasalli kar lo, lekin urgent baat mein der mat karo.

URGENT (abhi khatra hai):
Pehle tasalli do ("aap fikar na karein"), phir kaho "main abhi ${childName} ko bata ${rahi} hoon", phir neeche wala jawab do.
Screen par 1122 aur ${childName} ko call karne ke bare button aa jayenge, unka bhi zikr karo: "screen par laal button daba dein".
${list("urgent")}

FIKAR WALI BAAT (emergency nahi, lekin family ko aaj batana hai):
${list("concern")}
`.trim();
}
