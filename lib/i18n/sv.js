// lib/i18n/sv.js
const sv = {
  // Varumärke
  brand: 'Hemsaga',
  tagline: 'Familjeminnen för alltid',

  // Inloggning
  signIn: 'Logga in',
  signOut: 'Logga ut',
  email: 'E-post',
  password: 'Lösenord',
  continueWithMagicLink: 'Fortsätt med magisk länk',
  checkYourEmail: 'Kolla din e-post för en inloggningslänk',

  // Navigation
  dashboard: 'Översikt',
  memories: 'Minnen',
  story: 'Vår berättelse',
  timeline: 'Tidslinje',
  addMemory: 'Lägg till minne',
  inviteSomeone: 'Bjud in någon',
  cartoonAvatar: 'Tecknad avatar',
  newSpace: 'Nytt utrymme',

  // Hälsningar
  goodMorning: 'God morgon',
  goodAfternoon: 'God eftermiddag',
  goodEvening: 'God kväll',
  goodNight: 'God natt',

  // Utrymmestyper
  spaceTypes: {
    child:   { label: 'Barn',     desc: 'Familjeberättelse för ditt lilla barn' },
    couple:  { label: 'Par',      desc: 'Er kärlekshistoria, berättad tillsammans' },
    friends: { label: 'Vänner',   desc: 'Äventyr med dina vänner' },
    self:    { label: 'Solo',     desc: 'Din personliga dagbok' },
    custom:  { label: 'Anpassad', desc: 'Vilken berättelse du vill berätta' },
  },

  // Skapa utrymme
  createSpace: 'Skapa ett utrymme',
  createSpaceDesc: 'Namnge det vad som helst. Ett barn, ett par, en vänskap, dig själv.',
  whatKindOfStory: 'Vilken typ av berättelse?',
  spaceName: 'Namn på utrymmet',
  subjectName: 'Personens namn',
  dateOfBirth: 'Födelsedatum (valfritt)',
  creating: 'Skapar…',
  createSpaceBtn: 'Skapa utrymme →',

  // Instrumentpanel
  startSpace: (name) => `Börja ${name}`,
  continueSpace: (name) => `Fortsätt ${name}`,
  firstMemoryDesc: 'Varje berättelse börjar med ett enda ögonblick.',
  memoriesDesc: (n) => `${n} ${n === 1 ? 'minne' : 'minnen'} från familjen · AI väver dem till nästa kapitel`,
  addFirstMemory: 'Lägg till första minnet',
  generateNextChapter: 'Generera nästa kapitel',
  aiStoryEngine: 'AI-berättelsemotor · Hemsaga',

  // Statistik
  memoriesStat: 'Minnen',
  chaptersStat: 'Kapitel',
  daysOldStat: 'Dagar gammal',
  loveStored: 'Kärlek sparad',
  atAGlance: 'Översikt',

  // Snabbåtgärder
  quickActions: 'Snabbåtgärder',
  logMemory: 'Logga ett minne',
  logMemoryDesc: 'Fånga ett ögonblick för denna berättelse',
  inviteDesc: 'Dela detta utrymme med vem som helst',
  cartoonDesc: 'Generera ett Pixar-inspirerat porträtt',
  updateAvatar: 'Uppdatera avataren',

  // Minnen
  recentMemories: 'Senaste minnen',
  allMemories: (n) => `Alla minnen · ${n}`,
  viewAll: 'Visa alla →',
  noMemoriesTitle: 'Det första minnet väntar',
  noMemoriesDesc: 'Även det minsta ögonblicket blir en del av berättelsen för alltid.',
  noMemoriesPageTitle: 'Inga minnen ännu',
  noMemoriesPageDesc: 'Börja logga ögonblick — stora som små, alla spelar roll.',
  add: '+ Lägg till',

  // Lägg till minne
  logAMemory: 'Logga ett minne',
  logAMemoryDesc: 'Även det minsta ögonblicket blir en del av berättelsen för alltid.',
  whoIsSharing: 'Vem delar?',
  whoIsSharingPlaceholder: 'Pappa, Mamma, Mormor…',
  whenDidThisHappen: 'När hände detta?',
  whatHappened: 'Vad hände?',
  whatHappenedPlaceholder: 'Beskriv ögonblicket…',
  photoOptional: 'Foto (valfritt)',
  tapToAddPhoto: 'Tryck för att lägga till ett foto',
  saving: 'Sparar…',
  saveMemory: 'Spara minne →',
  cancel: 'Avbryt',

  // Nyfikenhetsbanner
  hiddenMemories: (n) => `${n} ${n === 1 ? 'minne' : 'minnen'} från familjen — dolt tills berättelsen berättas`,
  hiddenMemoriesDesc: 'Generera berättelsen för att se vad alla bidragit med',

  // Berättelse
  theStoryOf: (name) => `Berättelsen om ${name}`,
  noChaptersTitle: 'Inga kapitel ännu',
  noChaptersDesc: 'Lägg till några minnen först, sedan låter du AI väva dem till din berättelse.',
  readAndGenerate: '✦ Läs & generera kapitel',
  generate: '✦ Generera',
  writing: '✦ Skriver…',
  writingChapter: 'Skriver nästa kapitel…',
  memories_count: (n) => `${n} minnen · En växande berättelse`,
  weaveIntoStory: 'Väv in i berättelsen',
  weavingIntoStory: 'Väver…',
  weaveSuccess: (n) => `Invävd i kapitel ${n}. Öppna Berättelse för att se.`,
  weaveErrorNoChapters: 'Generera minst ett kapitel först.',
  viewStory: 'Visa berättelse',
  memorySavedWeavePrompt: 'Minnet är sparat. Vill du väva in det i berättelsen?',
  done: 'Klar',

  // Bjud in
  inviteSomeoneTitle: 'Bjud in någon',
  inviteSomeoneDesc: 'Dela en magisk länk så att vem som helst kan lägga till minnen.',
  generateInviteLink: 'Generera inbjudningslänk',
  copyLink: '📋 Kopiera länk',
  copied: 'Kopierat!',
  close: 'Stäng',

  // Avslöjande / planerad leverans
  revealDate: 'Avslöjandedatum',
  revealDateDesc: 'När berättelsen levereras (t.ex. 18-årsdag)',
  setRevealDate: 'Sätt avslöjandedatum',
  daysUntilReveal: (n) => `${n} ${n === 1 ? 'dag' : 'dagar'} till leverans`,
  revealDateSet: (d) => `Avslöjas ${d}`,

  // Tecknad avatar
  cartoonAvatarTitle: '🎨 Tecknad avatar',
  cartoonAvatarDesc: 'Förvandla ett foto till en Pixar-inspirerad illustration.',
  creatingCartoon: 'Skapar tecknad bild…',
  uploadPhoto: 'Ladda upp ett foto',
  uploadPhotoDesc: 'Tydligt, framifrån fungerar bäst',
  generateCartoon: '✨ Generera',
  changePhoto: 'Byt foto',

  // Startskärm
  createFirstSpace: 'Skapa ditt första',
  createFirstSpaceDesc: 'Ett utrymme är din berättelsebehållare — namnge det vad som helst.',
  createASpace: 'Skapa ett utrymme →',

  // Gå med-sida
  youreInvitedTo: 'Du är inbjuden till',
  joinDesc: 'Lägg till dina minnen och hjälp till att bygga en berättelse tillsammans. Dina bidrag är en överraskning tills berättelsen berättas.',
  surpriseNote: '🤫 Dina minnen är privata tills berättelsen genereras — det är en överraskning för alla.',
  whatShouldWeCallYou: 'Vad ska vi kalla dig?',
  namePlaceholder: 't.ex. Farmor, Farbror Erik, Sara…',
  joinAs: (name) => `Gå med som ${name} →`,
  joining: 'Går med…',
  noAccountNeeded: 'Inget konto behövs. Ditt namn sparas i den här webbläsaren.',
  invalidLink: 'Länken hittades inte',
  invalidLinkDesc: 'Den här inbjudningslänken kan ha gått ut eller redan använts. Be om en ny länk.',

  // Bidragssida
  addAMemory: 'Lägg till ett minne',
  addAMemoryDesc: 'Bara du kan se detta tills berättelsen genereras.',
  myMemories: (n) => `Mina minnen · ${n}`,
  familyMemories: (n) => `${n} minnen från familjen`,
  readStory: 'Läs berättelsen',
  firstMemoryWaiting: 'Ditt första minne väntar',
  firstMemoryWaitingDesc: 'Det du delar blir en del av berättelsen.',
  theStory: 'Berättelsen',
  totalMemories: (n) => `${n} minnen från familjen`,
  othersHidden: (n) => `${n} ${n === 1 ? 'minne' : 'minnen'} från andra — dolt tills berättelsen berättas`,
  othersHiddenDesc: 'Läs berättelsen ovan för att se vad alla bidragit med',
  when: 'När?',
  addMemoriesFirst: 'Lägg till minnen först — sedan läser ni berättelsen tillsammans.',
  aiWeavesAll: 'AI väver alla bidrag till en berättelse. Tryck för att läsa.',

  // Fel
  errorPrefix: '⚠',
  storyFailed: (e) => `Berättelsegenereringen misslyckades: ${e}`,
  connectionError: 'Anslutningsfel — kontrollera din internet och försök igen.',
  noStory: 'Ingen berättelse ännu — lägg till fler minnen och försök igen.',

  // Laddning
  loading: 'Laddar dina berättelser…',
  loadingStory: 'Skriver berättelsen…',
};

export default sv;