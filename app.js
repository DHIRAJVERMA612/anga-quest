'use strict';
/* Anga's Quest — static site, no build step.
   Progress is saved in the browser (localStorage). */

const LS = 'angaQuest.v1', SES = 'angaQuest.session', MUTE = 'angaQuest.muted';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const app = $('#app');

/* ---------- storage ---------- */
function load() { try { return JSON.parse(localStorage.getItem(LS)) || { users: {} }; } catch (e) { return { users: {} }; } }
let db = load();
let user = null;
let L = null; // current level state
let muted = localStorage.getItem(MUTE) === '1';
function save() { try { localStorage.setItem(LS, JSON.stringify(db)); } catch (e) { } }

/* ---------- sound & effects ---------- */
let ac;
function tone(freqs, dur = 0.12) {
  if (muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * dur;
      o.type = 'triangle'; o.frequency.value = f; o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur);
    });
  } catch (e) { }
}
const SFX = { good: [523, 659, 784], bad: [200, 150], win: [523, 659, 784, 1047, 1319], click: [660], star: [880, 1175] };
const sfx = n => tone(SFX[n], n === 'win' ? 0.16 : 0.12);
function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
function confetti() {
  const cols = ['#ff5d8f', '#ffd23f', '#3a86ff', '#2ec27e', '#7b5cff', '#ff7a2f'];
  for (let i = 0; i < 70; i++) {
    const d = document.createElement('div'); d.className = 'confetti';
    d.style.left = Math.random() * 100 + 'vw'; d.style.background = cols[i % cols.length];
    d.style.animationDuration = 2 + Math.random() * 2 + 's'; d.style.animationDelay = Math.random() * 0.6 + 's';
    document.body.appendChild(d); setTimeout(() => d.remove(), 5000);
  }
}
function speak(text) {
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; u.pitch = 1.15; speechSynthesis.speak(u); } catch (e) { }
}

/* ---------- original characters (drawn as simple SVG) ---------- */
const CH = {
  bolt: {
    name: 'Bolt the Robot', short: 'Bolt', svg: `<svg viewBox="0 0 100 100"><line x1="50" y1="8" x2="50" y2="22" stroke="#555" stroke-width="3"/><circle cx="50" cy="8" r="5" fill="#ff5d8f"/>
    <rect x="20" y="22" width="60" height="46" rx="12" fill="#7bdff2" stroke="#2b8ba6" stroke-width="3"/><circle cx="37" cy="42" r="9" fill="#fff"/><circle cx="63" cy="42" r="9" fill="#fff"/>
    <circle cx="39" cy="43" r="4.5" fill="#222"/><circle cx="65" cy="43" r="4.5" fill="#222"/><path d="M38 57 Q50 66 62 57" stroke="#2b8ba6" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <rect x="30" y="70" width="40" height="22" rx="8" fill="#b2f7ef" stroke="#2b8ba6" stroke-width="3"/><circle cx="50" cy="81" r="5" fill="#ffd23f"/>
    <rect x="12" y="38" width="8" height="16" rx="4" fill="#2b8ba6"/><rect x="80" y="38" width="8" height="16" rx="4" fill="#2b8ba6"/></svg>`
  },
  pip: {
    name: 'Pip the Penguin', short: 'Pip', svg: `<svg viewBox="0 0 100 100"><ellipse cx="22" cy="62" rx="7" ry="16" fill="#2b3a67" transform="rotate(15 22 62)"/><ellipse cx="78" cy="62" rx="7" ry="16" fill="#2b3a67" transform="rotate(-15 78 62)"/>
    <ellipse cx="50" cy="58" rx="30" ry="36" fill="#2b3a67"/><ellipse cx="50" cy="66" rx="20" ry="26" fill="#fff"/>
    <circle cx="40" cy="40" r="7" fill="#fff"/><circle cx="60" cy="40" r="7" fill="#fff"/><circle cx="41" cy="41" r="3.5" fill="#222"/><circle cx="59" cy="41" r="3.5" fill="#222"/>
    <path d="M43 49 L57 49 L50 59Z" fill="#ff9f1c"/><ellipse cx="38" cy="94" rx="10" ry="4.5" fill="#ff9f1c"/><ellipse cx="62" cy="94" rx="10" ry="4.5" fill="#ff9f1c"/>
    <path d="M26 30 Q50 18 74 30" stroke="#ff5d8f" stroke-width="7" fill="none" stroke-linecap="round"/></svg>`
  },
  zara: {
    name: 'Zara the Fox', short: 'Zara', svg: `<svg viewBox="0 0 100 100"><polygon points="18,40 26,6 50,28" fill="#ff7a2f"/><polygon points="82,40 74,6 50,28" fill="#ff7a2f"/>
    <polygon points="25,34 28,16 40,28" fill="#ffd1b3"/><polygon points="75,34 72,16 60,28" fill="#ffd1b3"/>
    <ellipse cx="50" cy="55" rx="34" ry="30" fill="#ff7a2f"/><path d="M16 62 Q50 100 84 62 Q50 72 16 62Z" fill="#fff"/>
    <circle cx="36" cy="50" r="5" fill="#222"/><circle cx="64" cy="50" r="5" fill="#222"/><circle cx="37.5" cy="48.5" r="1.7" fill="#fff"/><circle cx="65.5" cy="48.5" r="1.7" fill="#fff"/>
    <ellipse cx="50" cy="68" rx="5" ry="4" fill="#2b2d42"/><path d="M44 76 Q50 81 56 76" stroke="#2b2d42" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
  },
  hoot: {
    name: 'Hoot the Owl', short: 'Hoot', svg: `<svg viewBox="0 0 100 100"><polygon points="24,26 28,6 42,22" fill="#8d6e63"/><polygon points="76,26 72,6 58,22" fill="#8d6e63"/>
    <ellipse cx="50" cy="58" rx="34" ry="36" fill="#a1887f"/><ellipse cx="50" cy="70" rx="20" ry="22" fill="#d7ccc8"/>
    <circle cx="36" cy="44" r="15" fill="#fff"/><circle cx="64" cy="44" r="15" fill="#fff"/><circle cx="37" cy="45" r="7" fill="#222"/><circle cx="63" cy="45" r="7" fill="#222"/>
    <circle cx="39" cy="42" r="2.4" fill="#fff"/><circle cx="65" cy="42" r="2.4" fill="#fff"/><path d="M44 54 L56 54 L50 64Z" fill="#ffb703"/>
    <ellipse cx="17" cy="62" rx="8" ry="20" fill="#8d6e63"/><ellipse cx="83" cy="62" rx="8" ry="20" fill="#8d6e63"/>
    <path d="M20 22 L80 22 L76 30 L24 30Z" fill="#3a86ff"/><rect x="32" y="14" width="36" height="9" rx="3" fill="#3a86ff"/></svg>`
  },
  glitch: {
    name: 'Glitch the Gremlin', short: 'Glitch', svg: `<svg viewBox="0 0 100 100"><polygon points="22,40 30,8 42,34" fill="#5b3fd1"/><polygon points="78,40 70,8 58,34" fill="#5b3fd1"/><polygon points="40,30 50,2 60,30" fill="#5b3fd1"/>
    <ellipse cx="50" cy="60" rx="36" ry="32" fill="#7e57c2"/><path d="M26 44 L44 50" stroke="#222" stroke-width="4" stroke-linecap="round"/><path d="M74 44 L56 50" stroke="#222" stroke-width="4" stroke-linecap="round"/>
    <circle cx="36" cy="55" r="7" fill="#ffee58"/><circle cx="64" cy="55" r="7" fill="#ffee58"/><circle cx="37" cy="56" r="3" fill="#222"/><circle cx="63" cy="56" r="3" fill="#222"/>
    <path d="M30 74 L38 68 L46 76 L54 68 L62 76 L70 70" stroke="#222" stroke-width="3.5" fill="#fff" stroke-linejoin="round"/>
    <rect x="8" y="30" width="10" height="4" fill="#00e5ff"/><rect x="84" y="62" width="10" height="4" fill="#ff5d8f"/></svg>`
  }
};

/* ---------- game content ---------- */
const WORLDS = [
  { id: 'ai', name: 'Robo Land', sub: 'Learn about AI', emoji: '🤖', color: '#3a86ff' },
  { id: 'cy', name: 'Shield City', sub: 'Stay safe online', emoji: '🛡️', color: '#2ec27e' },
  { id: 'br', name: 'Brain Lab', sub: 'Smarter with AI', emoji: '🔬', color: '#ff7a2f' },
  { id: 'cc', name: 'Cyber Castle', sub: 'Be a safety hero', emoji: '🏰', color: '#7b5cff' }
];

const LEVELS = [
  /* ---- World 1: AI ---- */
  {
    id: 'ai1', world: 'ai', title: 'Meet AI!', char: 'bolt',
    story: [
      "Beep boop! I'm Bolt, a robot helper. Welcome to Robo Land!",
      "AI means a computer that can LEARN from lots of examples, and then help people. It can talk, spot pictures, or find the quickest road.",
      "People build AI. It is not magic and it is not alive. It's smart tools made by people!",
      "Let's play! Is it an AI helper, or not?"
    ],
    stages: [
      {
        type: 'sort', intro: 'Tap the right box for each thing!', bins: [{ id: 'ai', label: 'AI helper', emoji: '🤖' }, { id: 'no', label: 'Not AI', emoji: '🔨' }],
        items: [
          { t: 'A voice helper that answers your questions', emoji: '🗣️', bin: 'ai', why: 'Yes! It understands words and learned from lots of examples.' },
          { t: 'A hammer', emoji: '🔨', bin: 'no', why: 'A hammer is just a tool. It cannot learn anything.' },
          { t: 'A phone app that finds faces in photos', emoji: '📸', bin: 'ai', why: 'It learned what faces look like from many pictures.' },
          { t: 'A light switch', emoji: '💡', bin: 'no', why: 'A switch only turns on and off. It does not learn.' },
          { t: 'A map app that finds the fastest road', emoji: '🗺️', bin: 'ai', why: 'It learns from traffic and picks smart routes.' },
          { t: 'A pencil', emoji: '✏️', bin: 'no', why: 'A pencil does nothing by itself.' },
          { t: 'A chat helper that can write a story', emoji: '💬', bin: 'ai', why: 'It learned from lots of writing to make new sentences.' }
        ]
      },
      {
        type: 'quiz', intro: 'Two quick questions!', questions: [
          { q: 'What does AI learn from?', o: ['Lots of examples (data)', 'Magic spells', 'Eating snacks'], a: 0, why: 'AI learns from examples, like you learn from practice!' },
          { q: 'Who makes AI?', o: ['Aliens', 'People', 'Fairies'], a: 1, why: 'People build AI, so people can fix it and guide it too.' }
        ]
      }
    ]
  },
  {
    id: 'ai2', world: 'ai', title: 'Teach the Robot', char: 'pip',
    story: [
      "Brrr-illiant to see you! I'm Pip. I'm training a robot brain today.",
      "To teach an AI, we show it MANY examples with the right labels, like 'this is a bird'.",
      "If we give wrong labels, the AI learns wrong things! That is the secret: good examples make good AI.",
      "Help me teach my robot to tell birds from fish!"
    ],
    stages: [
      {
        type: 'sort', robot: true, intro: 'Label each picture so the robot learns!', bins: [{ id: 'bird', label: 'Bird', emoji: '🐦' }, { id: 'fish', label: 'Fish', emoji: '🐟' }],
        items: [
          { t: 'Eagle', emoji: '🦅', bin: 'bird', why: 'Eagles have feathers and wings: bird!' },
          { t: 'Clownfish', emoji: '🐠', bin: 'fish', why: 'Fish live in water and have fins.' },
          { t: 'Parrot', emoji: '🦜', bin: 'bird', why: 'Feathers and a beak: bird!' },
          { t: 'Pufferfish', emoji: '🐡', bin: 'fish', why: 'Fish. It puffs up when scared!' },
          { t: 'Penguin', emoji: '🐧', bin: 'bird', why: 'Tricky! Penguins swim, but they have feathers, so they are birds.' },
          { t: 'Shark', emoji: '🦈', bin: 'fish', why: 'Sharks are fish with fins and gills.' },
          { t: 'Dove', emoji: '🕊️', bin: 'bird', why: 'A dove is a bird.' },
          { t: 'Tuna', emoji: '🐟', bin: 'fish', why: 'Tuna swim in the sea. Fish!' }
        ]
      },
      {
        type: 'quiz', intro: 'What did the robot learn?', questions: [
          { q: 'What happens if we teach the robot with WRONG labels?', o: ['It learns wrong things', 'It becomes extra smart', 'Nothing happens'], a: 0, hint: 'Think about teaching a friend the wrong answer!', why: 'Wrong labels make a confused robot. Good teachers matter!' },
          { q: 'Which teaches a robot better?', o: ['Only 1 picture', 'Many different pictures', 'No pictures'], a: 1, why: 'More and different examples help AI learn well.' }
        ]
      }
    ]
  },
  {
    id: 'ai3', world: 'ai', title: 'AI Can Slip Up', char: 'hoot',
    story: [
      "Hoo-hoo! I'm Hoot the wise owl.",
      "Here is a big secret: AI can make mistakes. It can even say things that sound sure but are wrong!",
      "So we are clever helpers. We check important answers with a grown-up, a teacher, or a book.",
      "Let's practise being AI detectives! 🔍"
    ],
    stages: [
      {
        type: 'quiz', intro: 'Detective time!', questions: [
          { q: 'Is AI always right?', o: ['Yes, always', 'No, it can make mistakes'], a: 1, why: 'AI can be wrong, so we double-check.' },
          { q: 'An AI helper says something that sounds strange. What do you do?', o: ['Believe it right away', 'Ask a grown-up or check a book', 'Tell all your friends'], a: 1, why: 'Checking keeps us smart and safe!' },
          { q: 'Can you tell an AI chat helper your home address?', o: ['Yes, it is nice', 'No, keep it private'], a: 1, why: 'Private things stay private, even with AI.' },
          { q: 'Why do AI mistakes happen?', o: ['It learned from wrong or missing examples', 'It is sleepy', 'It is angry at us'], a: 0, why: 'AI only knows what it learned. Missing or wrong examples can fool it.' }
        ]
      }
    ]
  },
  {
    id: 'ai4', world: 'ai', title: 'Ask Smart Questions', char: 'zara',
    story: [
      "Hi hi! I'm Zara the clever fox!",
      "AI can help you learn, like explaining a hard idea with a fun example.",
      "But the BEST use is to learn WITH it, not to copy from it. Your own brain should do the thinking!",
      "Let's practise asking great questions."
    ],
    stages: [
      {
        type: 'quiz', intro: 'Pick the best question!', questions: [
          { q: 'You are stuck on fractions. Which is the best way to ask AI?', o: ['Do my homework', 'Explain fractions using a pizza example', 'Fractions'], a: 1, why: 'Clear and kind questions get helpful answers, and you learn more.' },
          { q: 'You want a story idea. Which is best?', o: ['Give me 3 ideas for a story about a brave fox', 'Story', 'Write it and I will say I wrote it'], a: 0, why: 'Ask for ideas, then make your own story!' }
        ]
      },
      {
        type: 'sort', intro: 'Good way to use AI, or not?', bins: [{ id: 'good', label: 'Good idea', emoji: '👍' }, { id: 'bad', label: 'Not okay', emoji: '🙅' }],
        items: [
          { t: 'Ask why the sky is blue', emoji: '🌤️', bin: 'good', why: 'Curious questions are great!' },
          { t: 'Copy the answer without thinking', emoji: '📋', bin: 'bad', why: 'Then your brain does not learn anything.' },
          { t: 'Check the answer with a book', emoji: '📚', bin: 'good', why: 'Double-checking is super smart.' },
          { t: 'Tell the AI your secret password', emoji: '🔑', bin: 'bad', why: 'Passwords are never shared, not even with AI.' },
          { t: 'Ask for ideas for a drawing', emoji: '🎨', bin: 'good', why: 'Ideas are fun, and you do the drawing!' }
        ]
      }
    ]
  },

  /* ---- World 2: Cyber safety ---- */
  {
    id: 'cy1', world: 'cy', title: 'Super Passwords', char: 'hoot',
    story: [
      "Welcome to Shield City! I'm Hoot, the guard owl.",
      "A password is a secret key to your things on a computer. A strong password keeps bad guys out.",
      "Make it LONG and mix CAPITALS, small letters, numbers and symbols. Try joining silly words: BlueMango!Rocket7",
      "Never use your name or 1234. Let's build one!"
    ],
    stages: [
      { type: 'password', intro: 'Build a strong practice password! (Do NOT type your real ones.)' },
      {
        type: 'quiz', intro: 'Password rules!', questions: [
          { q: 'Who can know your password?', o: ['Your best friend', 'Only you and your parent or guardian', 'Everyone in class'], a: 1, why: 'Even best friends can tell by mistake. Keep it secret!' },
          { q: 'Which password is strongest?', o: ['anga123', 'password', 'BlueMango!Rocket7', '12345678'], a: 2, why: 'It is long and mixes letters, a number and a symbol.' }
        ]
      }
    ]
  },
  {
    id: 'cy2', world: 'cy', title: 'Keep It Secret', char: 'zara',
    story: [
      "Zara here! Some things are fine to share. Some are private, like treasure.",
      "Private things: home address, phone number, passwords, school name with your photo, and where you are right now.",
      "If you are not sure, ask a trusted grown-up first!",
      "Sort them: SHARE or SECRET?"
    ],
    stages: [
      {
        type: 'sort', intro: 'Is it okay to share online with strangers?', bins: [{ id: 'ok', label: 'Okay to share', emoji: '💬' }, { id: 'secret', label: 'Keep secret', emoji: '🤫' }],
        items: [
          { t: 'Your favourite colour', emoji: '🎨', bin: 'ok', why: 'Safe and fun to share.' },
          { t: 'Your home address', emoji: '🏠', bin: 'secret', why: 'Strangers must never know where you live.' },
          { t: 'Your phone number', emoji: '📱', bin: 'secret', why: 'Private! Only for family and trusted people.' },
          { t: 'Your favourite cartoon', emoji: '📺', bin: 'ok', why: 'Safe to talk about.' },
          { t: 'Your password', emoji: '🔑', bin: 'secret', why: 'Passwords are secret keys.' },
          { t: 'A photo of you in your school uniform', emoji: '🏫', bin: 'secret', why: 'It can show where you go to school.' },
          { t: 'Your favourite ice cream flavour', emoji: '🍦', bin: 'ok', why: 'Yummy and safe!' },
          { t: 'Where you are right now', emoji: '📍', bin: 'secret', why: 'Locations are private.' }
        ]
      }
    ]
  },
  {
    id: 'cy3', world: 'cy', title: 'Fake or Real?', char: 'bolt',
    story: [
      "Beep! Bolt here. Some messages are TRICKS called phishing. They try to fool you into clicking or sharing secrets.",
      "Tricky signs: 'YOU WON!!!', 'click now!', 'send your password', lots of ! marks, or someone you don't know.",
      "Real messages from family or teachers feel normal and never ask for your password.",
      "Be a trick spotter! 🔎"
    ],
    stages: [
      {
        type: 'sort', intro: 'Is this message real or a trick?', bins: [{ id: 'real', label: 'Looks real', emoji: '✅' }, { id: 'fake', label: 'Trick!', emoji: '🚨' }],
        items: [
          { card: 1, t: '🎉 YOU WON A FREE PHONE!!! Click here NOW!!!', bin: 'fake', why: 'Too good to be true, shouting, and a click demand. Trick!' },
          { card: 1, t: 'Mom: Dinner at 7. Come home straight after class.', bin: 'real', why: 'Normal message from someone you know.' },
          { card: 1, t: 'Your game account will be DELETED. Send your password to fix it!', bin: 'fake', why: 'Real companies never ask for your password.' },
          { card: 1, t: 'Teacher: Homework tomorrow is page 12.', bin: 'real', why: 'Normal school message.' },
          { card: 1, t: 'FREE gems!!! Just type your password here', bin: 'fake', why: 'Free stuff plus a password request is a classic trick.' },
          { card: 1, t: 'Grandma: Happy birthday! Video call at 5?', bin: 'real', why: 'A loving, normal message.' }
        ]
      },
      {
        type: 'quiz', intro: 'What to do?', questions: [
          { q: 'You get a weird message with a link. What is the best move?', o: ['Click it to see', "Don't click. Tell a grown-up", 'Send it to friends'], a: 1, why: 'Stop, don\'t click, tell a grown-up!' }
        ]
      }
    ]
  },
  {
    id: 'cy4', world: 'cy', title: 'Online Friends', char: 'pip',
    story: [
      "Pip here, waddling in to talk about people online.",
      "Some online people are not who they say they are. A 'kid' might actually be a grown-up with bad plans.",
      "Golden rule: if anyone online makes you feel weird, asks for secrets, or wants to meet, STOP and tell a trusted grown-up. You will never be in trouble for telling!",
      "Let's practise being safe."
    ],
    stages: [
      {
        type: 'quiz', intro: 'What would you do?', questions: [
          { q: 'Someone in a game asks for your home address. You...', o: ['Tell them', 'Say no and tell a grown-up', 'Give a fake one'], a: 1, why: 'Never share it. Tell a grown-up right away.' },
          { q: 'An online friend says "Keep this a secret from your parents." You...', o: ['Keep it secret', 'Tell your parents right away'], a: 1, why: 'Safe friends never ask you to keep secrets from your family.' },
          { q: 'Someone online wants to meet you in real life. You...', o: ['Go meet them', 'Say no and tell a trusted grown-up'], a: 1, why: 'Never meet online people alone. Always tell a grown-up.' },
          { q: 'Something online makes you feel scared or yucky. You...', o: ['Hide it', 'Close it and tell a trusted grown-up'], a: 1, why: 'Telling is brave. You are never in trouble for it.' }
        ]
      }
    ]
  },
  {
    id: 'boss', world: 'cy', title: 'Boss: Glitch!', char: 'glitch', boss: true,
    story: [
      "Hee hee hee! I'm GLITCH the Gremlin! I will trick everyone in Shield City!",
      "Nobody can beat my sneaky tricks! Ha!",
      "(Show Glitch what you learned about AI and staying safe, hero!)"
    ],
    stages: [
      {
        type: 'quiz', intro: 'Glitch is throwing tricky questions!', questions: [
          { q: 'AI learns from...', o: ['Examples (data)', 'Sleeping', 'Magic'], a: 0, why: 'Examples! You knew it.' },
          { q: 'A friend online asks for your password to "help you win". You...', o: ['Share it', 'Say no and tell a grown-up'], a: 1, why: 'Passwords stay secret.' },
          { q: 'An AI says something that sounds odd. Best move?', o: ['Check with a grown-up or a book', 'Believe it'], a: 0, why: 'AI can be wrong, so check.' },
          { q: 'Which password is strongest?', o: ['anga123', 'BlueMango!Rocket7', 'password', '12345678'], a: 1, why: 'Long and mixed!' },
          { q: 'A pop-up says YOU WON! Click now! You...', o: ["Don't click, tell a grown-up", 'Click fast'], a: 0, why: 'Classic trick. Not today, Glitch!' },
          { q: 'What should you keep secret online?', o: ['Home address, phone number, passwords', 'Favourite colour', 'Favourite cartoon'], a: 0, why: 'Private info stays private.' }
        ]
      },
      {
        type: 'sort', intro: 'Hero move or oops move?', bins: [{ id: 'hero', label: 'Hero move', emoji: '🦸' }, { id: 'oops', label: 'Oops move', emoji: '😬' }],
        items: [
          { t: 'Tell a grown-up when something feels weird', emoji: '🗣️', bin: 'hero', why: 'Always!' },
          { t: 'Click on mystery links', emoji: '🔗', bin: 'oops', why: 'Mystery links can be traps.' },
          { t: 'Use a long, strong password', emoji: '🔐', bin: 'hero', why: 'Strong keys keep out bad guys.' },
          { t: 'Share your password with a game friend', emoji: '🎮', bin: 'oops', why: 'Never share it.' }
        ]
      }
    ]
  },

  /* =====================================================================
     NEW LESSONS (levels 10-29). Always ADD new levels at the END of this
     list so saved progress of existing players is kept.
     ===================================================================== */

  /* ---- World 3: Brain Lab (AI, deeper) ---- */
  {
    id: 'br1', world: 'br', title: 'Pattern Power', char: 'bolt',
    story: [
      "Beep boop, Bolt is back! Welcome to the Brain Lab!",
      "A pattern is something that repeats, like 🔴🔵🔴🔵. AI is VERY good at finding patterns in lots of examples.",
      "When your phone suggests the next word you type, it noticed a pattern in lots of words. Let's spot patterns too!"
    ],
    stages: [
      {
        type: 'quiz', intro: 'What comes next?', questions: [
          { q: '🔴 🔵 🔴 🔵 🔴 ?', o: ['🔵', '🔴', '🟢'], a: 0, why: 'Red, blue, red, blue... next is blue!' },
          { q: '⭐ ⭐ 🌙 ⭐ ⭐ 🌙 ⭐ ⭐ ?', o: ['⭐', '🌙', '☀️'], a: 1, why: 'Two stars then a moon, again and again.' },
          { q: '2, 4, 6, 8, ?', o: ['9', '10', '12'], a: 1, why: 'We add 2 every time.' },
          { q: 'Why are patterns useful to AI?', o: ['They help AI guess what comes next', 'They make AI sleepy', 'They make the screen bright'], a: 0, why: 'Finding patterns lets AI make smart guesses.' }
        ]
      },
      {
        type: 'sort', intro: 'Is it a pattern?', bins: [{ id: 'yes', label: 'Pattern', emoji: '🔁' }, { id: 'no', label: 'No pattern', emoji: '🎲' }],
        items: [
          { t: 'Is this a pattern?', emoji: '🍎🍌🍎🍌', bin: 'yes', why: 'Apple, banana, apple, banana repeats!' },
          { t: 'Is this a pattern?', emoji: '🐶🚗🌙🍕', bin: 'no', why: 'Nothing repeats here.' },
          { t: 'Is this a pattern?', emoji: '🔺🔺⬛🔺🔺⬛', bin: 'yes', why: 'Two triangles then a square, again and again.' },
          { t: 'Is this a pattern?', emoji: '🎈🦋🍩🧩', bin: 'no', why: 'All different, so no pattern.' }
        ]
      }
    ]
  },
  {
    id: 'br2', world: 'br', title: 'Robot Senses', char: 'pip',
    story: [
      "Pip here! Robots do not have eyes and ears like us. They use sensors!",
      "A camera lets AI 'see'. A microphone lets AI 'hear'. They collect information (data) for the AI to learn from.",
      "Which sensor does each job need? Let's find out!"
    ],
    stages: [
      {
        type: 'sort', intro: 'Camera (sees) or microphone (hears)?', bins: [{ id: 'cam', label: 'Camera', emoji: '👁️' }, { id: 'mic', label: 'Microphone', emoji: '👂' }],
        items: [
          { t: 'Unlock a phone with your face', emoji: '🙂', bin: 'cam', why: 'The camera looks at your face.' },
          { t: 'A voice helper hears "Hello!"', emoji: '🗣️', bin: 'mic', why: 'It needs a microphone to hear you.' },
          { t: 'A self-driving car spots a stop sign', emoji: '🛑', bin: 'cam', why: 'Cameras help cars see signs.' },
          { t: 'An app names the song that is playing', emoji: '🎵', bin: 'mic', why: 'It listens with the microphone.' },
          { t: 'An app names a plant from a photo', emoji: '🌿', bin: 'cam', why: 'It looks at the picture.' },
          { t: 'A talking toy answers you', emoji: '🧸', bin: 'mic', why: 'It listens first, then answers.' }
        ]
      },
      {
        type: 'quiz', intro: 'Sensor questions!', questions: [
          { q: 'What is a sensor?', o: ['A part that collects information', 'A kind of snack', 'A battery'], a: 0, why: 'Sensors collect information from the world.' },
          { q: 'Does AI see pictures exactly like you do?', o: ['No, it turns pictures into numbers and looks for patterns', 'Yes, exactly the same'], a: 0, why: 'AI does not see like us. It finds patterns in numbers.' }
        ]
      }
    ]
  },
  {
    id: 'br3', world: 'br', title: 'Step by Step', char: 'zara',
    story: [
      "Zara here! A computer follows steps, like a recipe.",
      "A list of steps is called an ALGORITHM (say: AL-go-rith-um).",
      "Computers do EXACTLY what the steps say, so the ORDER must be right. Let's try!"
    ],
    stages: [
      { type: 'order', intro: 'Tap the steps in the right order!', title: 'Make a sandwich 🥪', steps: ['Take two slices of bread', 'Spread butter or jam', 'Put the slices together', 'Eat and enjoy!'], why: 'Perfect! That is an algorithm.' },
      { type: 'order', intro: 'Another one!', title: 'Brush your teeth 🪥', steps: ['Put toothpaste on the brush', 'Brush all your teeth', 'Spit out the foam', 'Rinse your mouth'], why: 'Great order!' },
      {
        type: 'quiz', intro: 'Quick check!', questions: [
          { q: 'What is an algorithm?', o: ['A list of steps to do something', 'A cartoon', 'A type of battery'], a: 0, why: 'Yes! Steps that tell a computer what to do.' },
          { q: 'What if the steps are in the wrong order?', o: ['The result can go wrong', 'Nothing changes', 'It works better'], a: 0, hint: 'Imagine eating the sandwich before making it!', why: 'Order matters a lot to computers.' }
        ]
      }
    ]
  },
  {
    id: 'br4', world: 'br', title: 'Fair Play AI', char: 'hoot',
    story: [
      "Hoo! A kind owl cares about being FAIR.",
      "If an AI only learns from one kind of example, it may not work well for everyone.",
      "For example, a voice helper that only heard grown-ups may not understand kids. So people must teach AI with MANY different examples."
    ],
    stages: [
      {
        type: 'quiz', intro: 'Fairness time!', questions: [
          { q: 'A voice helper only learned from grown-up voices. What might happen?', o: ['It may not understand kids well', 'It understands everyone perfectly', 'It turns into a robot'], a: 0, why: 'It never heard kid voices, so it gets confused.' },
          { q: 'How do we make AI fairer?', o: ['Teach it with many different examples', 'Teach it with just one example', 'Switch it off forever'], a: 0, why: 'More variety means fairer AI.' },
          { q: 'Who must check that AI is fair?', o: ['The people who build and use it', 'The AI alone', 'Nobody'], a: 0, why: 'People are responsible for AI.' },
          { q: 'Being fair means...', o: ['Everyone gets a good chance', 'Only my friends win', 'Only the loudest wins'], a: 0, why: 'Fair means good chances for everybody.' }
        ]
      }
    ]
  },
  {
    id: 'br5', world: 'br', title: 'Robot Helpers', char: 'bolt',
    story: [
      "Beep! AI helpers can do lots of jobs: vacuum robots, translators, and tools that help doctors look at scans.",
      "But AI does not truly feel love or sadness. People are best at hugs, kindness and big decisions.",
      "Who does each job best?"
    ],
    stages: [
      {
        type: 'sort', intro: 'AI helps, or people do best?', bins: [{ id: 'ai', label: 'AI can help', emoji: '🤖' }, { id: 'people', label: 'People do best', emoji: '❤️' }],
        items: [
          { t: 'Sorting thousands of photos quickly', emoji: '📷', bin: 'ai', why: 'Computers are fast at sorting.' },
          { t: 'Giving a sad friend a hug', emoji: '🤗', bin: 'people', why: 'Hugs and caring come from people.' },
          { t: 'Cleaning the floor by itself', emoji: '🧹', bin: 'ai', why: 'Vacuum robots do this.' },
          { t: 'Deciding what is kind and fair', emoji: '⚖️', bin: 'people', why: 'People decide what is right.' },
          { t: 'Translating a sign into another language', emoji: '🌍', bin: 'ai', why: 'Translation apps are great at this.' },
          { t: 'Comforting you when you are scared', emoji: '💛', bin: 'people', why: 'Family and friends are the best at this.' }
        ]
      },
      {
        type: 'quiz', intro: 'One more!', questions: [
          { q: 'Does AI feel things the way people do?', o: ['No, it does not feel like people do', 'Yes, exactly the same'], a: 0, why: 'AI can sound friendly, but it is a program.' }
        ]
      }
    ]
  },
  {
    id: 'br6', world: 'br', title: 'AI Artist', char: 'zara',
    story: [
      "Wow, AI can make pictures, songs and stories from words!",
      "But YOU are the real creator: your ideas and your heart. AI is like a fancy paintbrush.",
      "Be honest if you use AI, and never use it to make mean pictures of anyone."
    ],
    stages: [
      {
        type: 'quiz', intro: 'Honest creators!', questions: [
          { q: 'You asked for colour ideas, then drew the picture yourself. Is that fine?', o: ['Yes, the drawing is yours', 'No, never use AI'], a: 0, why: 'Ideas are fine, and you did the drawing.' },
          { q: 'Can you say an AI-made picture was 100% drawn by you?', o: ['No, be honest about it', 'Yes, always'], a: 0, why: 'Honesty matters, always.' }
        ]
      },
      {
        type: 'sort', intro: 'Kind use or not okay?', bins: [{ id: 'kind', label: 'Kind use', emoji: '💖' }, { id: 'bad', label: 'Not okay', emoji: '🚫' }],
        items: [
          { t: 'Make a card for Grandma', emoji: '🎂', bin: 'kind', why: 'A loving idea!' },
          { t: 'Make a mean picture of a classmate', emoji: '😠', bin: 'bad', why: 'That would hurt someone.' },
          { t: 'Get ideas for a story, then write your own', emoji: '📖', bin: 'kind', why: 'You are the author!' },
          { t: 'Pretend AI work is only yours', emoji: '🙊', bin: 'bad', why: 'That is not honest.' },
          { t: 'Ask for colour ideas for your drawing', emoji: '🎨', bin: 'kind', why: 'Great way to get inspired.' }
        ]
      }
    ]
  },
  {
    id: 'br7', world: 'br', title: 'Real or Fake Pictures?', char: 'pip',
    story: [
      "Pip here! AI can make very real-looking pictures and videos that are FAKE, like a penguin flying a rocket! 🚀",
      "So not everything we see online is true. Clues: strange hands, odd shadows, writing that looks wrong.",
      "When you are not sure, ask a grown-up."
    ],
    stages: [
      {
        type: 'quiz', intro: 'Be a picture detective!', questions: [
          { q: 'A video shows a penguin flying a rocket. Is it real?', o: ['Probably made by a computer', 'Definitely real'], a: 0, why: 'Penguins cannot fly rockets!' },
          { q: 'You see a shocking picture online. What do you do first?', o: ['Share it with everyone', 'Stop and ask a grown-up if it is real', 'Believe it'], a: 1, why: 'Stop, think, ask.' },
          { q: 'Which can be a clue that a picture is AI-made?', o: ['Odd hands or strange writing', 'It is colourful', 'It is big'], a: 0, why: 'AI often slips up on small details.' },
          { q: 'Why is sharing fake pictures a problem?', o: ['People can get fooled or hurt', 'It uses more colours', 'Nothing happens'], a: 0, why: 'Fake things can spread and cause trouble.' }
        ]
      }
    ]
  },
  {
    id: 'br8', world: 'br', title: 'Private Chats', char: 'hoot',
    story: [
      "Hoo-hoo! When you chat with an AI helper, remember it is a computer program, not a secret-keeping friend.",
      "What you type might be saved. So never type your address, phone number, school, passwords or photos of you.",
      "Always ask a grown-up before using an AI app."
    ],
    stages: [
      {
        type: 'sort', intro: 'Safe to type, or keep private?', bins: [{ id: 'safe', label: 'Safe to type', emoji: '✅' }, { id: 'private', label: 'Keep private', emoji: '🔒' }],
        items: [
          { t: 'Why do cats purr?', emoji: '🐱', bin: 'safe', why: 'A curious question is safe.' },
          { t: 'My home address', emoji: '🏠', bin: 'private', why: 'Never share where you live.' },
          { t: 'Ideas for a science project', emoji: '🔬', bin: 'safe', why: 'Great question!' },
          { t: 'My school name and class', emoji: '🏫', bin: 'private', why: 'That tells people where you are.' },
          { t: 'My password', emoji: '🔑', bin: 'private', why: 'Passwords are secret keys.' },
          { t: 'Tell me a joke', emoji: '😂', bin: 'safe', why: 'Jokes are safe!' }
        ]
      },
      {
        type: 'quiz', intro: 'One more!', questions: [
          { q: 'Should you ask a grown-up before using a new AI app?', o: ['Yes, always', 'No, never'], a: 0, why: 'A grown-up helps keep you safe.' }
        ]
      }
    ]
  },
  {
    id: 'br9', world: 'br', title: 'My AI Rules', char: 'bolt',
    story: [
      "Beep! Let's write our own AI rules together.",
      "Good rules keep AI helpful and keep you safe.",
      "Then I will test you with a tricky 'what do I do?' puzzle."
    ],
    stages: [
      {
        type: 'quiz', intro: 'Finish the rule!', questions: [
          { q: 'Ask a ____ before using AI apps.', o: ['grown-up', 'robot', 'pet'], a: 0, why: 'A grown-up keeps you safe.' },
          { q: 'Be ____ to others, even in chats.', o: ['kind', 'mean', 'sneaky'], a: 0, why: 'Kindness always wins.' },
          { q: 'AI answers need to be ____.', o: ['checked', 'ignored', 'hidden'], a: 0, why: 'AI can be wrong, so we check.' },
          { q: 'Your own brain should do the ____.', o: ['thinking', 'sleeping', 'hiding'], a: 0, why: 'AI helps, but you think!' }
        ]
      },
      { type: 'order', intro: 'AI says something strange. What do you do, step by step?', title: 'Strange answer from AI', steps: ['Stop and do not share it', 'Tell a grown-up', 'Check a book or trusted website together', 'Decide together what is true'], why: 'Excellent detective work!' }
    ]
  },
  {
    id: 'br10', world: 'br', title: 'Mini Boss: Lab Glitch', char: 'glitch', mini: true,
    story: [
      "Hee hee! It's GLITCH again! I stole the lab's memory chips!",
      "You will NEVER get them back! Unless you beat my AI quiz... which is impossible!",
      "(Show Glitch what you learned in the Brain Lab!)"
    ],
    stages: [
      {
        type: 'quiz', intro: "Glitch's AI quiz!", questions: [
          { q: 'What is an algorithm?', o: ['A list of steps', 'A kind of fruit'], a: 0, why: 'Steps for a computer to follow.' },
          { q: 'AI finds ____ in lots of examples.', o: ['patterns', 'ghosts', 'snacks'], a: 0, why: 'Patterns help AI guess.' },
          { q: 'A fake-looking video shows a cat on the moon. You...', o: ['Think: could be AI-made. Ask a grown-up', 'Share it at once'], a: 0, why: 'Stop, think, ask.' },
          { q: 'Which is safe to type to an AI chat?', o: ['Why is the sky blue?', 'My home address'], a: 0, why: 'Keep private things private.' },
          { q: 'Why must AI learn from MANY examples?', o: ['To be fairer and smarter', 'To be slower'], a: 0, why: 'More variety, fairer AI.' },
          { q: 'Who is the real creator of your drawing?', o: ['You!', 'The computer'], a: 0, why: 'Your ideas, your heart!' }
        ]
      },
      {
        type: 'sort', intro: 'Hero move or oops move?', bins: [{ id: 'hero', label: 'Hero move', emoji: '🦸' }, { id: 'oops', label: 'Oops move', emoji: '😬' }],
        items: [
          { t: 'Check AI answers with a book', emoji: '📚', bin: 'hero', why: 'Smart!' },
          { t: 'Tell AI your password', emoji: '🔑', bin: 'oops', why: 'Never share it.' },
          { t: 'Ask a grown-up before using a new app', emoji: '🙋', bin: 'hero', why: 'Always.' },
          { t: 'Share a shocking picture without checking', emoji: '📤', bin: 'oops', why: 'It might be fake.' }
        ]
      }
    ]
  },

  /* ---- World 4: Cyber Castle ---- */
  {
    id: 'cc1', world: 'cc', title: 'Lock Your Screen', char: 'hoot',
    story: [
      "Welcome to Cyber Castle! A castle needs locked doors, and so do your devices.",
      "Lock your tablet or computer when you leave it. On shared devices like school computers, always LOG OUT.",
      "Your device PIN is only for you and your trusted grown-up."
    ],
    stages: [
      {
        type: 'quiz', intro: 'Lock it up!', questions: [
          { q: 'You finished on a school computer. What do you do?', o: ['Log out', 'Just walk away', 'Turn up the volume'], a: 0, why: 'Logging out keeps your things private.' },
          { q: 'Why lock your screen?', o: ['So others cannot use your things', 'It looks pretty', 'It makes it louder'], a: 0, why: 'A lock keeps your stuff safe.' },
          { q: 'Who should know your device PIN?', o: ['You and your trusted grown-up', 'Everyone', 'Strangers'], a: 0, why: 'Only people you trust.' }
        ]
      }
    ]
  },
  {
    id: 'cc2', world: 'cc', title: 'Safe Apps', char: 'bolt',
    story: [
      "Beep! Some apps and games have hidden tricks or too many ads.",
      "Always ask a grown-up before you download anything, and get apps only from official places.",
      "Safe choice or risky choice? You decide!"
    ],
    stages: [
      {
        type: 'sort', intro: 'Safe choice or risky choice?', bins: [{ id: 'safe', label: 'Safe choice', emoji: '✅' }, { id: 'risky', label: 'Risky choice', emoji: '⚠️' }],
        items: [
          { t: 'Ask a grown-up before downloading a game', emoji: '🙋', bin: 'safe', why: 'Always ask first!' },
          { t: 'Download from a pop-up that says FREE!', emoji: '🎁', bin: 'risky', why: 'Pop-up offers are often tricks.' },
          { t: 'Install from the official app store with a grown-up', emoji: '🏪', bin: 'safe', why: 'Much safer.' },
          { t: 'Click Allow on everything without reading', emoji: '👆', bin: 'risky', why: 'Read first, then ask.' },
          { t: 'Check the age rating of a game', emoji: '📜', bin: 'safe', why: 'Ratings tell you who it is for.' },
          { t: 'Download a game a stranger sent you', emoji: '📨', bin: 'risky', why: 'Never! It could be harmful.' }
        ]
      },
      {
        type: 'quiz', intro: 'One more!', questions: [
          { q: 'A game asks to see all your photos. Best move?', o: ['Ask a grown-up first', 'Click yes quickly', 'Ignore everyone'], a: 0, why: 'Let a grown-up decide.' }
        ]
      }
    ]
  },
  {
    id: 'cc3', world: 'cc', title: 'Pop-up Trouble', char: 'zara',
    story: [
      "Zara here! Pop-ups are windows that jump onto your screen.",
      "Some shout 'YOU WON!' or 'Your computer is broken!'. These are tricks.",
      "Do not click inside them. Close with the X, or ask a grown-up."
    ],
    stages: [
      {
        type: 'quiz', intro: 'Pop-up patrol!', questions: [
          { q: 'A pop-up says "Your computer has a virus! Call now!" You...', o: ['Close it and tell a grown-up', 'Call the number', 'Click it'], a: 0, why: 'Scary pop-ups are usually tricks.' },
          { q: 'A pop-up says "Click for FREE gems!" You...', o: ["Don't click, close it", 'Click fast'], a: 0, why: 'Free gems are a trick.' },
          { q: 'The close button is tiny and hard to find. Best move?', o: ['Ask a grown-up to help', 'Click the big green button', 'Click everything'], a: 0, why: 'Big buttons can be traps. Ask for help.' },
          { q: 'Pop-ups that shout and rush you are usually...', o: ['Tricks', 'Presents', 'Homework'], a: 0, why: 'Rushing is a sign of a trick.' }
        ]
      }
    ]
  },
  {
    id: 'cc4', world: 'cc', title: 'Be Kind Online', char: 'pip',
    story: [
      "Pip here! The internet is full of real people with real feelings. Kind words matter.",
      "If someone is mean to you online, it is NEVER your fault.",
      "Do not answer back, keep the message, show a trusted grown-up, and block that person together."
    ],
    stages: [
      { type: 'order', intro: 'Someone sends a mean message. Tap the steps in order!', title: 'What do you do?', steps: ['Do not answer back', 'Keep the message, do not delete it', 'Show a trusted grown-up', 'Block that person together'], why: 'You handled that like a hero!' },
      {
        type: 'quiz', intro: 'Kindness check!', questions: [
          { q: 'Before you send a message, ask: is it...', o: ['Kind and true', 'Funny at any cost', 'Secret'], a: 0, why: 'Kind and true is the best.' },
          { q: 'Is being mean online okay if nobody sees?', o: ['No, words can hurt', 'Yes'], a: 0, why: 'Words can hurt, even online.' }
        ]
      }
    ]
  },
  {
    id: 'cc5', world: 'cc', title: 'Spelling Tricks', char: 'bolt',
    story: [
      "Beep! Fake websites copy real ones with tiny changes, like 'gooogle' instead of 'google'.",
      "Always look closely at the spelling. If something looks odd, stop and ask a grown-up.",
      "Spot the trick names!"
    ],
    stages: [
      {
        type: 'sort', intro: 'Does the website name look right or tricky?', bins: [{ id: 'right', label: 'Looks right', emoji: '✅' }, { id: 'tricky', label: 'Looks tricky', emoji: '🚨' }],
        items: [
          { t: 'wikipedia.org', emoji: '🌐', bin: 'right', why: 'Spelled correctly.' },
          { t: 'wikipeddia.org', emoji: '🌐', bin: 'tricky', why: 'An extra d! A trick spelling.' },
          { t: 'youtube.com', emoji: '🌐', bin: 'right', why: 'Spelled correctly.' },
          { t: 'youtu-be-free-gems.com', emoji: '🌐', bin: 'tricky', why: 'Free gems? Trick!' },
          { t: 'google.com', emoji: '🌐', bin: 'right', why: 'Spelled correctly.' },
          { t: 'g00gle.com', emoji: '🌐', bin: 'tricky', why: 'Zeros instead of letter o. Trick!' }
        ]
      },
      {
        type: 'quiz', intro: 'What would you do?', questions: [
          { q: 'A website asks you to log in, but the name has a spelling mistake. You...', o: ['Leave and tell a grown-up', 'Log in fast'], a: 0, why: 'Never log in on tricky websites.' }
        ]
      }
    ]
  },
  {
    id: 'cc6', world: 'cc', title: 'Wi-Fi Wisdom', char: 'zara',
    story: [
      "Zara here! Wi-Fi at home is like your own garden gate.",
      "Public Wi-Fi (cafes, airports) is open to everyone, so be extra careful.",
      "On public Wi-Fi do not log in to important accounts or share secrets. Always ask a grown-up first."
    ],
    stages: [
      {
        type: 'sort', intro: 'Okay on public Wi-Fi, or wait for safe Wi-Fi?', bins: [{ id: 'ok', label: 'Okay', emoji: '👍' }, { id: 'wait', label: 'Wait for safe Wi-Fi', emoji: '✋' }],
        items: [
          { t: 'Watch a cartoon with a grown-up', emoji: '📺', bin: 'ok', why: 'Fine with a grown-up nearby.' },
          { t: 'Log in to a money account', emoji: '💰', bin: 'wait', why: 'Too risky on public Wi-Fi.' },
          { t: 'Type your passwords', emoji: '🔑', bin: 'wait', why: 'Wait for a safe network.' },
          { t: 'Read a story or article', emoji: '📖', bin: 'ok', why: 'Reading is fine.' },
          { t: 'Share your home address', emoji: '🏠', bin: 'wait', why: 'Never share it.' }
        ]
      },
      {
        type: 'quiz', intro: 'One more!', questions: [
          { q: 'Who should connect your device to a new Wi-Fi?', o: ['A trusted grown-up', 'Anyone nearby', 'A stranger'], a: 0, why: 'A grown-up knows what is safe.' }
        ]
      }
    ]
  },
  {
    id: 'cc7', world: 'cc', title: 'Think Before You Post', char: 'hoot',
    story: [
      "Hoo! Things you post can stay online for a very long time, even if you delete them.",
      "Before posting, always ask a grown-up and think: Is it kind? Is it true? Does it show private things?",
      "Let's sort what is okay to post."
    ],
    stages: [
      {
        type: 'sort', intro: 'Okay to post (with a grown-up OK), or do not post?', bins: [{ id: 'ok', label: 'Okay to post', emoji: '👍' }, { id: 'no', label: 'Do not post', emoji: '🛑' }],
        items: [
          { t: 'A drawing you made', emoji: '🎨', bin: 'ok', why: 'Share your art with a grown-up OK!' },
          { t: 'A photo showing your house number', emoji: '🏠', bin: 'no', why: 'It shows where you live.' },
          { t: 'A mean joke about a friend', emoji: '😠', bin: 'no', why: 'It would hurt them.' },
          { t: 'A picture of your pet', emoji: '🐶', bin: 'ok', why: 'Cute and safe.' },
          { t: 'Where you are on holiday right now', emoji: '✈️', bin: 'no', why: 'Share later, not live.' },
          { t: 'A kind comment', emoji: '💬', bin: 'ok', why: 'Kindness is great.' }
        ]
      },
      {
        type: 'quiz', intro: 'Quick check!', questions: [
          { q: 'You delete a post. Is it gone forever?', o: ['Not always, others may have saved it', 'Yes, always'], a: 0, why: 'Think before you post!' }
        ]
      }
    ]
  },
  {
    id: 'cc8', world: 'cc', title: 'Computer Germs', char: 'pip',
    story: [
      "Pip here! A computer virus is a bad program that can mess up a device.",
      "It is not like a cold, but it can spread through bad downloads and mystery links.",
      "Updates and security programs (that a grown-up installs) help keep devices healthy."
    ],
    stages: [
      {
        type: 'quiz', intro: 'Keep devices healthy!', questions: [
          { q: 'Which helps protect a device?', o: ['Updates and security software', 'Never turning it on', 'Covering the screen'], a: 0, why: 'Updates fix weak spots.' },
          { q: 'What can bring a virus?', o: ['Mystery downloads and links', 'A clean screen', 'A mouse pad'], a: 0, why: 'Do not click mystery links.' },
          { q: 'You find a USB stick on the road. Do you plug it in?', o: ['No, give it to a grown-up', 'Yes, to see'], a: 0, why: 'It could carry a virus.' },
          { q: 'Updates are like...', o: ['A health check-up for your device', 'A bad trick', 'A snack'], a: 0, why: 'They fix problems and keep it healthy.' }
        ]
      }
    ]
  },
  {
    id: 'cc9', world: 'cc', title: 'Backup Hero', char: 'bolt',
    story: [
      "Beep! Devices can break or get lost.",
      "A BACKUP is a copy of your important things (like drawings) in a second safe place.",
      "Then if something goes wrong, you do not lose your treasure!"
    ],
    stages: [
      { type: 'order', intro: 'Back up your drawings. Tap the steps in order!', title: 'Backup steps', steps: ['Ask a grown-up to help', 'Pick the files you love', 'Copy them to a safe place', 'Check that the copy opens'], why: 'Treasure saved!' },
      {
        type: 'quiz', intro: 'Quick check!', questions: [
          { q: 'What is a backup?', o: ['A copy in a safe place', 'A bag', 'A deleted file'], a: 0, why: 'A second copy keeps things safe.' },
          { q: 'Why make backups?', o: ['If something breaks, you still have it', 'For no reason', 'To make it slower'], a: 0, why: 'Backups save your treasure.' }
        ]
      }
    ]
  },
  {
    id: 'cc10', world: 'cc', title: 'Final Boss: Glitch Returns!', char: 'glitch', final: true,
    story: [
      "I'M BAAACK! And this time I have a MEGA-GLITCH army!",
      "You beat me once, but ALL your lessons together? Impossible!",
      "(This is the big one, hero. Use everything you learned about AI and online safety!)"
    ],
    stages: [
      {
        type: 'quiz', intro: 'Mega-Glitch quiz!', questions: [
          { q: 'AI learns from...', o: ['Examples (data)', 'Magic'], a: 0, why: 'Examples!' },
          { q: 'AI says something odd. You...', o: ['Check with a grown-up or a book', 'Believe it'], a: 0, why: 'AI can be wrong.' },
          { q: 'A fake-looking video goes viral. You...', o: ['Stop and ask a grown-up', 'Share it'], a: 0, why: 'Do not spread fakes.' },
          { q: 'Which password is strongest?', o: ['BlueMango!Rocket7', 'anga123'], a: 0, why: 'Long and mixed.' },
          { q: 'A pop-up says YOU WON! You...', o: ['Close it and tell a grown-up', 'Click it'], a: 0, why: 'Classic trick.' },
          { q: 'A mean message arrives. First step?', o: ['Do not answer back', 'Send a meaner one'], a: 0, why: 'Do not reply, show a grown-up.' },
          { q: 'You finished on a shared computer. You...', o: ['Log out', 'Leave it open'], a: 0, why: 'Always log out.' },
          { q: 'What is a backup?', o: ['A safe copy of your files', 'A kind of virus'], a: 0, why: 'Safe copy = safe treasure.' }
        ]
      },
      {
        type: 'sort', intro: 'Hero move or oops move?', bins: [{ id: 'hero', label: 'Hero move', emoji: '🦸' }, { id: 'oops', label: 'Oops move', emoji: '😬' }],
        items: [
          { t: 'Tell a grown-up when something feels weird', emoji: '🗣️', bin: 'hero', why: 'Always!' },
          { t: 'Download a game a stranger sent', emoji: '📨', bin: 'oops', why: 'Never.' },
          { t: 'Check AI answers with a book', emoji: '📚', bin: 'hero', why: 'Smart!' },
          { t: 'Post where you are right now', emoji: '📍', bin: 'oops', why: 'Keep locations private.' },
          { t: 'Be kind online', emoji: '💖', bin: 'hero', why: 'Kindness wins.' },
          { t: 'Log in on a tricky spelled website', emoji: '🌐', bin: 'oops', why: 'It could be fake.' }
        ]
      },
      { type: 'order', intro: 'Something weird pops up on the screen. Tap the steps in order!', title: 'Weird pop-up!', steps: ['Do not click it', 'Close it or turn off the screen', 'Tell a trusted grown-up', 'Check together what happened'], why: 'MEGA hero move! Glitch is defeated!' }
    ]
  }
];

const BADGES = [
  { id: 'first', e: '🥇', n: 'First Steps', test: u => Object.keys(u.stars).length >= 1 },
  { id: 'perfect', e: '🧠', n: 'Perfect Brain', test: u => Object.values(u.stars).some(s => s === 3) },
  { id: 'ai', e: '🤖', n: 'AI Explorer', test: u => LEVELS.filter(l => l.world === 'ai').every(l => u.stars[l.id]) },
  { id: 'cy', e: '🛡️', n: 'Cyber Guardian', test: u => LEVELS.filter(l => l.world === 'cy' && !l.boss).every(l => u.stars[l.id]) },
  { id: 'streak', e: '🔥', n: '3-Day Streak', test: u => u.streak >= 3 },
  { id: 'hero', e: '🏆', n: 'Glitch Beater', test: u => !!u.stars.boss },
  { id: 'brlab', e: '🔬', n: 'Brain Lab Master', test: u => LEVELS.filter(l => l.world === 'br').every(l => u.stars[l.id]) },
  { id: 'castle', e: '🏰', n: 'Castle Defender', test: u => LEVELS.filter(l => l.world === 'cc').every(l => u.stars[l.id]) },
  { id: 'stars40', e: '🌟', n: 'Star Collector', test: u => Object.values(u.stars).reduce((a, b) => a + b, 0) >= 40 },
  { id: 'master', e: '👑', n: 'Master of Everything', test: u => !!u.stars.cc10 }
];
const TITLES = [[0, 'Rookie 🐣'], [50, 'Explorer 🧭'], [120, 'Agent 🕵️'], [220, 'Guardian 🛡️'], [350, 'Hero 🦸'], [600, 'Legend 🌟'], [900, 'Master 👑']];
const TIPS = [
  'AI learns from examples, just like you learn from practice!',
  'A strong password is long and has capitals, numbers and symbols.',
  'If something online feels weird, tell a trusted grown-up. That is a hero move!',
  'AI can make mistakes. Always double-check important things.',
  'Never share your address, phone number or passwords online.'
];
const titleFor = xp => TITLES.filter(t => xp >= t[0]).pop()[1];
const nextTitle = xp => TITLES.find(t => t[0] > xp);
const levelIdx = id => LEVELS.findIndex(l => l.id === id);
const unlocked = i => i === 0 || (user.stars[LEVELS[i - 1].id] || 0) > 0;
const totalStars = () => Object.values(user.stars).reduce((a, b) => a + b, 0);

/* ---------- view helpers ---------- */
function view(html) { app.innerHTML = `<div class="fade">${html}</div>`; window.scrollTo(0, 0); }
function toggleMute() { muted = !muted; localStorage.setItem(MUTE, muted ? '1' : '0'); const b = $('#mute'); if (b) b.textContent = muted ? '🔇' : '🔊'; }

/* ---------- login ---------- */
function login(msg = '') {
  const last = localStorage.getItem('angaQuest.last') || 'Anga';
  view(`<div class="login card">
    <div class="cast">${['bolt', 'pip', 'zara', 'hoot'].map(k => `<div class="bob" style="animation-delay:${Math.random() * -2}s">${CH[k].svg}</div>`).join('')}</div>
    <div class="logo">Anga's Quest</div>
    <p>Learn about AI and stay safe online. Win stars! ⭐</p>
    <form id="f" autocomplete="off">
      <label for="nm">Your name</label><input id="nm" maxlength="16" value="${esc(last)}">
      <label for="pin">Secret PIN (4 numbers)</label><input id="pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••">
      <div class="msg" id="msg">${esc(msg)}</div>
      <button class="btn big green" type="submit">Let's go! 🚀</button>
    </form>
    <p class="small">First time? Pick any 4 numbers. That's your secret PIN!<br>
    <button class="linkbtn" id="reset">Grown-up: reset this explorer</button></p>
  </div>`);
  const say = t => { $('#msg').textContent = t; };
  $('#f').onsubmit = e => {
    e.preventDefault(); sfx('click');
    const name = $('#nm').value.trim().slice(0, 16), pin = $('#pin').value.trim();
    if (!name) return say('Type your name first!');
    if (!/^\d{4}$/.test(pin)) return say('Your PIN is 4 numbers, like 2468.');
    const key = name.toLowerCase();
    let u = db.users[key];
    if (u) { if (u.pin !== pin) { sfx('bad'); shake($('.login')); return say('Oops, wrong PIN. Try again!'); } }
    else u = db.users[key] = { name, pin, xp: 0, stars: {}, badges: [], streak: 0, last: '' };
    updateStreak(u); save();
    localStorage.setItem('angaQuest.last', u.name); localStorage.setItem(SES, key);
    user = u; sfx('win'); home();
  };
  $('#reset').onclick = () => {
    const key = $('#nm').value.trim().toLowerCase();
    if (!db.users[key]) return say('No explorer with that name here.');
    if (confirm(`Erase all progress for "${db.users[key].name}" and its PIN? This cannot be undone.`)) { delete db.users[key]; save(); localStorage.removeItem(SES); login('Reset done. Pick a new PIN!'); }
  };
}
function updateStreak(u) {
  const today = new Date().toDateString(); if (u.last === today) return;
  const y = new Date(Date.now() - 864e5).toDateString();
  u.streak = u.last === y ? u.streak + 1 : 1; u.last = today;
}

/* ---------- home map ---------- */
function header() {
  const nt = nextTitle(user.xp), cur = TITLES.filter(t => user.xp >= t[0]).pop()[0];
  const pct = nt ? Math.round((user.xp - cur) / (nt[0] - cur) * 100) : 100;
  return `<header class="top card">
    <div class="avatar">${esc(user.name[0].toUpperCase())}</div>
    <div class="who"><b>${esc(user.name)}</b> · ${titleFor(user.xp)}<div class="xpbar"><i style="width:${pct}%"></i></div><span class="small">${user.xp} XP${nt ? ` · next: ${nt[1]} at ${nt[0]}` : ' · MAX LEVEL!'}</span></div>
    <span class="pill">⭐ ${totalStars()}</span><span class="pill">🔥 ${user.streak} day${user.streak === 1 ? '' : 's'}</span>
    <button class="btn ghost sm" id="mute" aria-label="Sound">${muted ? '🔇' : '🔊'}</button>
    <button class="btn ghost sm" id="out">Log out</button></header>`;
}
function home() {
  L = null;
  const next = LEVELS.find((l, i) => unlocked(i) && !user.stars[l.id]);
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
  view(`${header()}
  <section class="hero card"><div class="bob">${CH.pip.svg}</div><div class="txt">
    <div class="bubble"><div class="who2">${CH.pip.short}</div>Hi ${esc(user.name)}! ${next ? `Ready for <b>${esc(next.title)}</b>?` : 'You finished everything! Play any level again for 3 stars!'}<br><span class="small">💡 ${esc(tip)}</span></div>
    <div class="row" style="margin-top:12px">${next ? `<button class="btn big" id="cont">▶ Play next level</button>` : ''}${user.stars.boss ? `<button class="btn big purple" id="cert">🎓 My certificate</button>` : ''}${user.stars.cc10 ? `<button class="btn big pink" id="cert2">👑 Master certificate</button>` : ''}</div></div></section>
  ${WORLDS.map(w => {
    const ls = LEVELS.filter(l => l.world === w.id), done = ls.filter(l => user.stars[l.id]).length;
    return `<section class="world" style="--wc:${w.color}"><h2>${w.emoji} ${w.name} <small class="small">${w.sub}</small><div class="bar"><i style="width:${done / ls.length * 100}%"></i></div></h2><div class="nodes">
    ${ls.map(l => { const i = levelIdx(l.id), lock = !unlocked(i), s = user.stars[l.id] || 0;
      return `<button class="node ${lock ? 'locked' : ''} ${!lock && !s && next && next.id === l.id ? 'next' : ''}" data-id="${l.id}" ${lock ? 'aria-disabled="true"' : ''}>
      <div class="num">${i + 1}</div>${CH[l.char].svg}<div class="n">${esc(l.title)}</div>
      <div class="st">${lock ? '🔒' : [1, 2, 3].map(k => k <= s ? '⭐' : '☆').join('')}</div></button>`; }).join('')}</div></section>`;
  }).join('')}
  <section class="card"><h2>🏅 My badges</h2><div class="badges">${BADGES.map(b => `<div class="badge ${user.badges.includes(b.id) ? '' : 'off'}"><div class="e">${b.e}</div><small>${b.n}</small></div>`).join('')}</div></section>`);
  $('#mute').onclick = toggleMute;
  $('#out').onclick = () => { localStorage.removeItem(SES); user = null; login(); };
  if ($('#cont')) $('#cont').onclick = () => enter(next.id);
  if ($('#cert')) $('#cert').onclick = () => certificate('boss');
  if ($('#cert2')) $('#cert2').onclick = () => certificate('final');
  $$('.node').forEach(n => n.onclick = () => { const l = LEVELS[levelIdx(n.dataset.id)]; if (!unlocked(levelIdx(l.id))) { sfx('bad'); shake(n); return; } enter(l.id); });
}

/* ---------- level flow ---------- */
function topbar() {
  const pct = Math.round(L.stage / L.lvl.stages.length * 100);
  return `<div class="lvlbar"><button class="btn ghost sm" id="back">← Map</button><div class="bar"><i style="width:${pct}%"></i></div><div class="pill">🙈 Oops: <b id="mist">${L.mistakes}</b></div></div>`;
}
function enter(id) { L = { lvl: LEVELS[levelIdx(id)], mistakes: 0, stage: 0 }; story(0); }
function story(i) {
  const c = CH[L.lvl.char], line = L.lvl.story[i], last = i === L.lvl.story.length - 1;
  view(`<div class="lvlbar"><button class="btn ghost sm" id="back">← Map</button><div class="grow"></div></div>
  <div class="scene"><div class="speaker bob">${c.svg}</div><div class="bubble"><div class="who2">${c.name}</div><p>${esc(line)}</p>
  <div class="row"><button class="btn ghost sm" id="say">🔊 Read to me</button><button class="btn big" id="nx">${last ? "Let's play! 🎮" : 'Next ▶'}</button></div></div></div>`);
  $('#back').onclick = home; $('#say').onclick = () => speak(line);
  $('#nx').onclick = () => { sfx('click'); last ? runStage() : story(i + 1); };
}
function runStage() {
  if (L.stage >= L.lvl.stages.length) return finish();
  const st = L.lvl.stages[L.stage];
  view(`${topbar()}<div id="stage" class="card"></div>`);
  $('#back').onclick = () => { if (confirm('Leave this level? Your oops count will restart.')) home(); };
  ({ quiz: runQuiz, sort: runSort, password: runPassword, order: runOrder })[st.type](st);
}
function nextStage() { L.stage++; sfx('star'); runStage(); }
function head(t) { return `<div class="shead"><div class="mini bob">${CH[L.lvl.char].svg}</div><div class="bubble sm">${esc(t)}</div></div>`; }
function fbOk(msg, cb, label = 'Next ▶') { $('#fb').innerHTML = `<div class="ok">✅ ${esc(msg)}</div><button class="btn green" id="go">${label}</button>`; $('#go').onclick = cb; $('#go').focus(); }
function fbBad(msg) { $('#fb').innerHTML = `<div class="no">🤔 ${esc(msg)}</div>`; L.mistakes++; $('#mist').textContent = L.mistakes; sfx('bad'); }

function runQuiz(st) {
  const qs = st.questions; let i = 0;
  const draw = () => {
    if (i >= qs.length) return nextStage();
    const q = qs[i], opts = shuffle(q.o.map((t, k) => ({ t, ok: k === q.a })));
    $('#stage').innerHTML = `${head(st.intro || 'Question time!')}<div class="count">Question ${i + 1} of ${qs.length}</div><h2 class="q">${esc(q.q)}</h2>
      <div class="opts">${opts.map((o, k) => `<button class="opt" data-k="${k}">${esc(o.t)}</button>`).join('')}</div><div id="fb" class="fb"></div>`;
    $$('.opt').forEach(b => b.onclick = () => {
      const o = opts[b.dataset.k];
      if (o.ok) { $$('.opt').forEach(x => x.disabled = true); b.classList.add('good'); sfx('good'); fbOk(q.why, () => { i++; draw(); }); }
      else { b.classList.add('bad'); b.disabled = true; shake(b); fbBad(q.hint || 'Not quite. Try another one!'); }
    });
  };
  draw();
}
function runSort(st) {
  const items = shuffle(st.items.slice()); let i = 0;
  const draw = () => {
    if (i >= items.length) return nextStage();
    const it = items[i];
    $('#stage').innerHTML = `${head(st.intro)}
      ${st.robot ? `<div class="meter">🧠 ${CH[L.lvl.char].short}'s robot brain is learning...<div class="bar"><i style="width:${Math.round(i / items.length * 100)}%"></i></div></div>` : ''}
      <div class="count" style="text-align:center">${i + 1} of ${items.length}</div>
      <div class="card sortcard ${it.card ? 'msgcard' : ''}" id="card">${it.emoji ? `<div class="big">${it.emoji}</div>` : '<div class="big">✉️</div>'}<div class="t">${esc(it.t)}</div></div>
      <div class="bins">${st.bins.map(b => `<button class="btn bin" data-b="${b.id}"><span>${b.emoji}</span>${esc(b.label)}</button>`).join('')}</div><div id="fb" class="fb"></div>`;
    $$('.bin').forEach(b => b.onclick = () => {
      if (b.dataset.b === it.bin) { $$('.bin').forEach(x => x.disabled = true); sfx('good'); fbOk(it.why, () => { i++; draw(); }); }
      else { shake($('#card')); fbBad('Hmm, think again! Try the other box.'); }
    });
  };
  draw();
}
function runOrder(st) {
  const steps = st.steps; let n = 0;
  const opts = shuffle(steps.map((t, k) => ({ t, k })));
  $('#stage').innerHTML = `${head(st.intro)}<h2 class="q">${esc(st.title)}</h2><div class="count">Tap them in the right order: 1, 2, 3...</div>
    <div class="opts" style="margin-top:10px">${opts.map(o => `<button class="opt" data-k="${o.k}"><b class="ordn"></b>${esc(o.t)}</button>`).join('')}</div><div id="fb" class="fb"></div>`;
  $$('.opt').forEach(b => b.onclick = () => {
    if (+b.dataset.k === n) {
      n++; b.classList.add('good'); b.disabled = true; $('.ordn', b).textContent = n + '. '; sfx('click');
      if (n === steps.length) { sfx('good'); fbOk(st.why || 'Perfect order!', nextStage); }
    } else { shake(b); fbBad('Not that one yet. Which step comes next?'); }
  });
}
function pwChecks(p) {
  return [['At least 10 characters', p.length >= 10], ['A CAPITAL letter', /[A-Z]/.test(p)], ['A small letter', /[a-z]/.test(p)],
  ['A number', /\d/.test(p)], ['A symbol like ! @ # $ ?', /[^A-Za-z0-9]/.test(p)],
  ['No names or easy words (like anga, password, 1234)', p.length > 0 && !/(anga|password|1234|qwerty|abcd)/i.test(p) && !(user && p.toLowerCase().includes(user.name.toLowerCase()))]];
}
function runPassword(st) {
  $('#stage').innerHTML = `${head(st.intro)}<div class="pw"><div class="warn">⚠️ This is only practice. Never type your real passwords on a website like this!</div>
    <input id="pw" placeholder="Type a practice password..." autocomplete="off" spellcheck="false">
    <div class="meter" style="margin:10px 0 0">Strength<div class="bar"><i id="pm" style="width:0"></i></div></div>
    <ul class="checks" id="ck"></ul><div class="tip">💡 Trick: join 3 silly words + a number + a symbol, like <b>PurpleDragon!Pizza5</b></div>
    <div id="fb" class="fb"><button class="btn green" id="done" disabled>My password is super strong! 💪</button></div></div>`;
  const upd = () => {
    const c = pwChecks($('#pw').value), n = c.filter(x => x[1]).length;
    $('#ck').innerHTML = c.map(x => `<li class="${x[1] ? 'on' : ''}">${x[1] ? '✅' : '⬜'} ${x[0]}</li>`).join('');
    $('#pm').style.width = (n / c.length * 100) + '%'; $('#done').disabled = n < c.length;
  };
  $('#pw').oninput = upd; upd();
  $('#done').onclick = () => { $('#pw').value = ''; sfx('good'); $('#fb').innerHTML = `<div class="ok">✅ Awesome! And now it's forgotten. Practice passwords are not for keeping!</div><button class="btn green" id="go">Next ▶</button>`; $('#go').onclick = nextStage; };
}

/* ---------- results ---------- */
function finish() {
  const id = L.lvl.id, m = L.mistakes, s = m === 0 ? 3 : m <= 2 ? 2 : 1, prev = user.stars[id] || 0;
  const gain = 10 * s + (prev ? 0 : 20), oldTitle = titleFor(user.xp);
  user.stars[id] = Math.max(prev, s); user.xp += gain;
  const nb = BADGES.filter(b => !user.badges.includes(b.id) && b.test(user)); nb.forEach(b => user.badges.push(b.id));
  save();
  const i = levelIdx(id), nxt = LEVELS[i + 1], leveled = titleFor(user.xp) !== oldTitle;
  const lvl = L.lvl, bossy = lvl.boss || lvl.mini || lvl.final;
  view(`<div class="result card"><div class="bob">${CH[L.lvl.char].svg.replace('<svg', '<svg class="mascot"')}</div>
    <h1>${bossy ? 'You beat Glitch! 🎉' : 'Level complete! 🎉'}</h1>
    <div class="starsrow">${[1, 2, 3].map(k => `<span style="animation-delay:${k * 0.25}s">${k <= s ? '⭐' : '☆'}</span>`).join('')}</div>
    <p>${s === 3 ? 'PERFECT! No oops at all!' : s === 2 ? 'Great job!' : 'Good try! Play again for more stars.'}</p>
    <div class="xpgain">+${gain} XP</div>
    ${leveled ? `<p><b>New title: ${titleFor(user.xp)}</b></p>` : ''}
    ${nb.map(b => `<span class="newb pop">${b.e} New badge: ${b.n}</span>`).join('')}
    <div class="row" style="justify-content:center;margin-top:16px">
      ${lvl.boss ? `<button class="btn big purple" id="cert">🎓 Get my certificate</button>` : ''}${lvl.final ? `<button class="btn big pink" id="cert2">👑 Master certificate</button>` : ''}${nxt && !lvl.final ? `<button class="btn big green" id="nextl">Next level ▶</button>` : ''}
      ${s < 3 ? `<button class="btn ghost" id="again">🔁 Try for 3 stars</button>` : ''}<button class="btn ghost" id="map">🗺️ Map</button></div></div>`);
  confetti(); sfx('win'); if (s === 3) setTimeout(() => sfx('win'), 700);
  $('#map').onclick = home;
  if ($('#nextl')) $('#nextl').onclick = () => enter(nxt.id);
  if ($('#again')) $('#again').onclick = () => enter(id);
  if ($('#cert')) $('#cert').onclick = () => certificate('boss');
  if ($('#cert2')) $('#cert2').onclick = () => certificate('final');
}
function certificate(kind = 'boss') {
  const d = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const fin = kind === 'final';
  view(`<div class="cert card"><div>${['bolt', 'pip', 'zara', 'hoot'].map(k => CH[k].svg).join('')}</div>
    <h1>${fin ? '👑 Master Certificate' : '🎓 Certificate of Awesomeness'}</h1><p>This proudly says that</p><div class="nm">${esc(user.name)}</div>
    <p>${fin ? 'finished <b>all 29 lessons</b> of Anga\'s Quest, mastered <b>AI</b> and <b>online safety</b>,<br>and defeated Glitch the Gremlin TWICE!' : 'learned about <b>AI</b> and how to stay <b>safe online</b>,<br>and defeated Glitch the Gremlin!'}</p><p><b>Title: ${titleFor(user.xp)}</b> · ${totalStars()} ⭐ · ${d}</p></div>
    <div class="row noprint" style="justify-content:center"><button class="btn purple" id="pr">🖨️ Print</button><button class="btn ghost" id="map">🗺️ Map</button></div>`);
  confetti(); sfx('win');
  $('#pr').onclick = () => window.print(); $('#map').onclick = home;
}

/* ---------- start ---------- */
(function init() {
  const key = localStorage.getItem(SES);
  if (key && db.users[key]) { user = db.users[key]; updateStreak(user); save(); home(); } else login();
})();
