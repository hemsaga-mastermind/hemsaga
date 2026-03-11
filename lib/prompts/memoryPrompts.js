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
};

/**
 * Get all prompts for a language.
 * @param {string} lang - 'en' | 'sv'
 * @returns {string[]}
 */
export function getMemoryPrompts(lang) {
  const list = PROMPTS[lang] || PROMPTS.en;
  return list;
}

/**
 * Get one random prompt for the given language.
 * @param {string} lang - 'en' | 'sv'
 * @returns {{ text: string, promptId: number }}
 */
export function getRandomMemoryPrompt(lang) {
  const list = getMemoryPrompts(lang);
  const index = Math.floor(Math.random() * list.length);
  return { text: list[index], promptId: index };
}
