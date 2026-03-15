/**
 * Map UI language code to language name for AI story/tweak prompts.
 * Used by generate-story and story/tweak API routes.
 */
const LANG_TO_AI_NAME = {
  en: 'English',
  sv: 'Swedish',
  ar: 'Arabic',
  fi: 'Finnish',
  pl: 'Polish',
  es: 'Spanish',
};

export function getWritingLanguage(lang) {
  return LANG_TO_AI_NAME[lang] || 'English';
}
