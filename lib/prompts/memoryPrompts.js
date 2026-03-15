/**
 * Rotating memory prompts — shown as placeholder when adding a memory.
 * Reduces blank-page anxiety and nudges richer, more specific contributions.
 * Used on contribute page and dashboard Add Memory modal.
 */

const PROMPTS = {
  en: [
    'What made you laugh this week?',
    'Describe how they looked today.',
    'What’s one small moment you don’t want to forget?',
    'What did they say or do that surprised you?',
    'What are you grateful for about today?',
    'Describe a moment you shared together.',
    'What’s something they’re curious about right now?',
    'What routine or ritual felt special recently?',
    'What would you want them to remember about this time?',
    'What made today different from other days?',
    'What did you notice about them this week?',
    'Describe a moment that felt like pure joy.',
    'What’s a conversation you had that stuck with you?',
    'What are they learning or trying for the first time?',
    'What would you tell their future self about right now?',
  ],
  sv: [
    'Vad fick dig att skratta den här veckan?',
    'Beskriv hur de såg ut idag.',
    'Ett litet ögonblick du inte vill glömma?',
    'Vad sa eller gjorde de som överraskade dig?',
    'Vad är du tacksam för med dagens dag?',
    'Beskriv ett ögonblick ni delade tillsammans.',
    'Vad är de nyfikna på just nu?',
    'Vilken rutin eller ritual kändes speciell nyligen?',
    'Vad vill du att de ska minnas från den här tiden?',
    'Vad gjorde att idag kändes annorlunda?',
    'Vad lade du märke till hos dem den här veckan?',
    'Beskriv ett ögonblick som kändes som ren glädje.',
    'Ett samtal ni hade som fastnade hos dig?',
    'Vad lär de sig eller provar för första gången?',
    'Vad skulle du berätta för deras framtida jag om just nu?',
  ],
  ar: [
    'ما الذي جعلك تضحك هذا الأسبوع؟',
    'صف كيف بدوا اليوم.',
    'لحظة صغيرة لا تريد نسيانها؟',
    'ماذا قالوا أو فعلوا ففاجأك؟',
    'ما الذي أنت ممتن له اليوم؟',
    'صف لحظة شاركتموها معاً.',
    'ما الذي يثير فضولهم الآن؟',
    'أي روتين أو طقس شعر بأنه مميز مؤخراً؟',
    'ماذا تريد أن يتذكروا عن هذه الفترة؟',
    'ما الذي جعل اليوم يبدو مختلفاً؟',
    'ماذا لاحظت فيهم هذا الأسبوع؟',
    'صف لحظة شعرت فيها بفرح صافٍ.',
    'محادثة دارت بينكم علقت في ذهنك؟',
    'ماذا يتعلمون أو يجربون لأول مرة؟',
    'ماذا تقول لذاتهم المستقبلية عن الآن؟',
  ],
  fi: [
    'Mikä sai sinut nauramaan tällä viikolla?',
    'Kuvaile miltä he näyttivät tänään.',
    'Pieni hetki jota et halua unohtaa?',
    'Mitä he sanoivat tai tekivät yllättäen?',
    'Mistä olet kiitollinen tänään?',
    'Kuvaile hetki jonka jakoitte yhdessä.',
    'Mistä he ovat uteliaita juuri nyt?',
    'Mikä rutiini tai rituaali tuntui erityiseltä?',
    'Mitä haluat heidän muistavan tästä ajasta?',
    'Mikä teki tänään erilaiseksi?',
    'Mitä huomasit heistä tällä viikolla?',
    'Kuvaile hetki joka tuntui puhtaalta ilolta.',
    'Keskustelu joka jäi mieleen?',
    'Mitä he oppivat tai kokeilevat ensimmäistä kertaa?',
    'Mitä kertoisit heidän tulevalle itselleen juuri nyt?',
  ],
  pl: [
    'Co sprawiło, że się śmiałeś w tym tygodniu?',
    'Opisz, jak dziś wyglądali.',
    'Jeden mały moment, którego nie chcesz zapomnieć?',
    'Co powiedzieli lub zrobili, co cię zaskoczyło?',
    'Za co jesteś dziś wdzięczny?',
    'Opisz chwilę, którą spędziliście razem.',
    'Czym się teraz interesują?',
    'Jaki rytuał lub zwyczaj był ostatnio wyjątkowy?',
    'Co chciałbyś, żeby zapamiętali z tego czasu?',
    'Co sprawiło, że dziś było inaczej?',
    'Co w nich zauważyłeś w tym tygodniu?',
    'Opisz chwilę pełną radości.',
    'Rozmowa, która utkwiła ci w pamięci?',
    'Czego się uczą lub próbują po raz pierwszy?',
    'Co powiedziałbyś ich przyszłemu ja o teraz?',
  ],
  es: [
    '¿Qué te hizo reír esta semana?',
    'Describe cómo se veían hoy.',
    '¿Un momento pequeño que no quieres olvidar?',
    '¿Qué dijeron o hicieron que te sorprendió?',
    '¿Por qué estás agradecido hoy?',
    'Describe un momento que compartisteis.',
    '¿Qué les despierta curiosidad ahora?',
    '¿Qué rutina o ritual ha sido especial últimamente?',
    '¿Qué quieres que recuerden de esta época?',
    '¿Qué hizo que hoy fuera distinto?',
    '¿Qué notaste en ellos esta semana?',
    'Describe un momento de pura alegría.',
    '¿Una conversación que se te quedó?',
    '¿Qué están aprendiendo o probando por primera vez?',
    '¿Qué le dirías a su yo futuro sobre ahora?',
  ],
};

/**
 * Get all prompts for a language.
 * @param {string} lang - 'en' | 'sv' | 'ar' | 'fi' | 'pl' | 'es'
 * @returns {string[]}
 */
export function getMemoryPrompts(lang) {
  const list = PROMPTS[lang] || PROMPTS.en;
  return list;
}

/**
 * Get one random prompt for the given language.
 * @param {string} lang - 'en' | 'sv' | 'ar' | 'fi' | 'pl' | 'es'
 * @returns {{ text: string, promptId: number }}
 */
export function getRandomMemoryPrompt(lang) {
  const list = getMemoryPrompts(lang);
  const index = Math.floor(Math.random() * list.length);
  return { text: list[index], promptId: index };
}
