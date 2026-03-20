// lib/i18n/en.js
const en = {
  // Brand
  brand: 'Hemsaga',
  tagline: 'Family Stories Forever',

  // Auth
  signIn: 'Sign in',
  signOut: 'Sign out',
  email: 'Email',
  password: 'Password',
  continueWithMagicLink: 'Continue with magic link',
  checkYourEmail: 'Check your email for a sign-in link',

  // Navigation
  dashboard: 'Dashboard',
  memories: 'Memories',
  story: 'Our Story',
  timeline: 'Timeline',
  addMemory: 'Add Memory',
  inviteSomeone: 'Invite Someone',
  cartoonAvatar: 'Cartoon Avatar',
  newSpace: 'New Space',

  // Greetings
  goodMorning: 'Good morning',
  goodAfternoon: 'Good afternoon',
  goodEvening: 'Good evening',
  goodNight: 'Good night',

  // Space types
  spaceTypes: {
    child:   { label: 'Child',   desc: 'Family story for your little one' },
    couple:  { label: 'Couple',  desc: 'Your love story, told together' },
    friends: { label: 'Friends', desc: 'Adventures with your crew' },
    self:    { label: 'Solo',    desc: 'Your personal journal' },
    custom:  { label: 'Custom',  desc: 'Any story you want to tell' },
  },

  // Create space modal
  createSpace: 'Create a Space',
  createSpaceDesc: 'Name it anything. A child, a couple, a friendship, yourself.',
  whatKindOfStory: 'What kind of story?',
  spaceName: 'Space Name',
  subjectName: 'Subject Name',
  dateOfBirth: 'Date of Birth (optional)',
  creating: 'Creating…',
  createSpaceBtn: 'Create Space →',
  spaceNamePlaceholderChild: "e.g. Our little one's story",
  spaceNamePlaceholderCouple: 'e.g. Me & Sara',
  spaceNamePlaceholderDefault: 'e.g. Our Story',
  subjectNamePlaceholder: 'e.g. Emma, Alex, Sam…',

  // Dashboard hero
  startSpace: (name) => `Start ${name}`,
  continueSpace: (name) => `Continue ${name}`,
  firstMemoryDesc: 'Every story begins with a single moment.',
  memoriesDesc: (n) => `${n} ${n === 1 ? 'memory' : 'memories'} from the family · AI will weave them into the next chapter`,
  addFirstMemory: 'Add first memory',
  generateNextChapter: 'Generate next chapter',
  aiStoryEngine: 'AI Story Engine · Hemsaga',

  // Stats
  memoriesStat: 'Memories',
  chaptersStat: 'Chapters',
  daysOldStat: 'Days old',
  loveStored: 'Love stored',
  atAGlance: 'At a glance',

  // Quick actions
  quickActions: 'Quick Actions',
  logMemory: 'Log a Memory',
  logMemoryDesc: 'Capture a moment for this story',
  inviteDesc: 'Share this space with anyone',
  cartoonDesc: 'Generate a Pixar-style portrait',
  updateAvatar: 'Update the avatar',

  // Memories
  recentMemories: 'Recent Memories',
  allMemories: (n) => `All Memories · ${n}`,
  viewAll: 'View all →',
  noMemoriesTitle: 'The first memory is waiting',
  noMemoriesDesc: 'Even the smallest moment becomes part of this story forever.',
  noMemoriesPageTitle: 'No memories yet',
  noMemoriesPageDesc: 'Start logging moments — big or small, they all matter.',
  add: '+ Add',

  // Add memory modal
  logAMemory: 'Log a memory',
  logAMemoryDesc: 'Even the smallest moment becomes part of this story forever.',
  whoIsSharing: 'Who is sharing?',
  whoIsSharingPlaceholder: 'Papa, Mama, Nana…',
  whenDidThisHappen: 'When did this happen?',
  whatHappened: 'What happened?',
  whatHappenedPlaceholder: 'Describe the moment…',
  photoOptional: 'Photo (optional)',
  tapToAddPhoto: 'Tap to add a photo',
  saving: 'Saving…',
  saveMemory: 'Save Memory →',
  cancel: 'Cancel',

  // Curiosity banner
  hiddenMemories: (n) => `${n} ${n === 1 ? 'memory' : 'memories'} from family — hidden until the story is told`,
  hiddenMemoriesDesc: 'Generate the story to see what everyone contributed',

  // Story
  theStoryOf: (name) => `The Story of ${name}`,
  noChaptersTitle: 'No chapters yet',
  noChaptersDesc: 'Add some memories first, then let AI weave them into your story.',
  readAndGenerate: '✦ Read & Generate Chapter',
  generate: '✦ Generate',
  writing: '✦ Writing…',
  writingChapter: 'Writing the next chapter…',
  memories_count: (n) => `${n} memories · A growing story`,
  weaveIntoStory: 'Weave into story',
  weavingIntoStory: 'Weaving…',
  weaveSuccess: (n) => `Woven into Chapter ${n}. View Story to see the update.`,
  weaveErrorNoChapters: 'Generate at least one chapter first.',
  viewStory: 'View Story',
  memorySavedWeavePrompt: 'Memory saved. Weave this into the story?',
  done: 'Done',

  // Invite modal
  inviteSomeoneTitle: 'Invite Someone',
  inviteSomeoneDesc: 'Share a magic link to let anyone add memories.',
  generateInviteLink: 'Generate Invite Link',
  copyLink: '📋 Copy Link',
  copied: 'Copied!',
  copyFailed: 'Could not copy automatically. Long-press the link above to copy it.',
  close: 'Close',

  // Reveal / scheduled delivery
  revealDate: 'Reveal date',
  revealDateDesc: 'When the story is delivered (e.g. 18th birthday)',
  setRevealDate: 'Set reveal date',
  daysUntilReveal: (n) => `${n} ${n === 1 ? 'day' : 'days'} until delivery`,
  revealDateSet: (d) => `Reveal on ${d}`,

  // Cartoon modal
  cartoonAvatarTitle: '🎨 Cartoon Avatar',
  cartoonAvatarDesc: 'Transform a photo into a Pixar-style illustration.',
  creatingCartoon: 'Creating the cartoon…',
  uploadPhoto: 'Upload a photo',
  uploadPhotoDesc: 'Clear, front-facing works best',
  generateCartoon: '✨ Generate',
  changePhoto: 'Change Photo',

  // Setup (no spaces)
  createFirstSpace: 'Create your first',
  createFirstSpaceDesc: 'A Space is your story container — name it anything.',
  createASpace: 'Create a Space →',

  // Join page
  youreInvitedTo: "You're invited to",
  joinDesc: 'Add your memories and help build a story together. Your contributions are a surprise until the story is told.',
  surpriseNote: '🤫 Your memories are private until the story is generated — it\'s a surprise for everyone.',
  whatShouldWeCallYou: 'What should we call you?',
  namePlaceholder: 'e.g. Nana, Uncle Erik, Sara…',
  joinAs: (name) => `Join as ${name} →`,
  joining: 'Joining…',
  noAccountNeeded: 'No account needed. Your name is saved in this browser.',
  invalidLink: 'Link not found',
  invalidLinkDesc: 'This invite link may have expired or already been used. Ask for a new link.',

  // Contribute page
  addAMemory: 'Add a memory',
  addAMemoryDesc: 'Only you can see this until the story is generated.',
  myMemories: (n) => `My Memories · ${n}`,
  familyMemories: (n) => `${n} memories from the family`,
  readStory: 'Read the Story',
  firstMemoryWaiting: 'Your first memory is waiting',
  firstMemoryWaitingDesc: 'Whatever you share becomes part of the story.',
  theStory: 'The Story',
  totalMemories: (n) => `${n} memories from the family`,
  othersHidden: (n) => `${n} ${n === 1 ? 'memory' : 'memories'} from others — hidden until the story is told`,
  othersHiddenDesc: 'Read the story above to see what everyone contributed',
  when: 'When?',
  addMemoriesFirst: 'Add memories first — then read the story together.',
  aiWeavesAll: 'AI weaves all contributions into one story. Tap to read.',

  // Errors
  errorPrefix: '⚠',
  storyFailed: (e) => `Story generation failed: ${e}`,
  connectionError: 'Connection error — check your internet and try again.',
  noStory: 'No story yet — add more memories and try again.',

  // Loading
  loading: 'Loading your stories…',
  loadingStory: 'Writing the story…',
};

export default en;