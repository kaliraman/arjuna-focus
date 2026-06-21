// Bilingual UI strings (English + Hindi). The Hindi is a first draft for the
// user to review. Language choice is persisted. Strings may carry <b>/<em>, so
// applyStatic() sets innerHTML.

const STRINGS = {
  en: {
    title: "Arjun ka Nishan",
    lede: "Strike where the eye <em>will</em> be — not where it is.",
    play: "Play",
    howto: "How to play",
    legend: "The legend",
    how1: "<b>Aim</b> — move your pointer (or drag on touch) to choose where to shoot.",
    how2: "<b>Lead the eye</b> — your arrow takes a moment to fly, and the eye keeps moving. Fire where the eye is <em>about to be</em>.",
    how3: "<b>The pupil</b> is the bullseye. Land your arrow on it for a perfect strike.",
    how4: "Levels grow harder: the eye spins faster, so you must lead it further — amid more distraction.",
    gotit: "Got it",
    legendStory: "In the Mahabharata, the master Drona hung a wooden fish high in a tree and bade each student strike its eye — looking only at its <em>reflection</em> in the pool below. One by one they spoke of the sky, the branches, the rippling water. Only Arjuna said: <strong>“I see the eye of the fish, and nothing else.”</strong>",
    legendSub: "Excess is the enemy of mastery. See only the eye.",
    back: "Back",
    paused: "Paused",
    resume: "Resume",
    mainmenu: "Main menu",
    hud_level: "Level",
    hud_score: "Score",
    strikeEye: "Strike the eye",
    finaleTitle: "You mastered the eye",
    playAgain: "Play again",
    keepGoing: "Keep going · endless",
    next: "Next",
    warmup: "Warm-up",
    findEye: "Find the eye — and nothing else",
    levelComplete: "Level complete",
    warmupDone: "Warm-up done",
    nowSeeEye: "Now — see only the eye.",
    finalScore: "Final score",
    ring_bullseye: "BULLSEYE!",
    ring_eye: "Eye",
    ring_body: "Body",
    miss1: "So close — lead it a breath further.",
    miss2: "Breathe. See only the eye.",
    miss3: "The eye keeps moving — aim ahead.",
    soundOn: "Sound: on", soundOff: "Sound: off",
    motionFull: "Motion: full", motionReduced: "Motion: reduced",
    contrastOn: "High contrast: on", contrastOff: "High contrast: off",
    lvl_stillpool: "The Still Pool",
    lvl_firstcurrent: "First Current",
    lvl_driftingleaves: "Drifting Leaves",
    lvl_restlesswater: "Restless Water",
    lvl_crowdedsky: "The Crowded Sky",
    lvl_veilofglare: "Veil of Glare",
    lvl_whirlingeye: "The Whirling Eye",
    lvl_arjunasgaze: "Arjuna's Gaze",
    lvl_endless: "Endless",
  },
  hi: {
    title: "अर्जुन का निशान",
    lede: "वहाँ वार करें जहाँ आँख <em>होगी</em> — जहाँ वह अभी है वहाँ नहीं।",
    play: "खेलें",
    howto: "कैसे खेलें",
    legend: "कथा",
    how1: "<b>निशाना</b> — अपना संकेतक घुमाएँ (या छूकर खींचें) और चुनें कि कहाँ मारना है।",
    how2: "<b>आँख से आगे का अनुमान</b> — तीर को उड़ने में पल लगता है, और आँख चलती रहती है। वहाँ छोड़ें जहाँ आँख <em>पहुँचने वाली</em> है।",
    how3: "<b>पुतली</b> ही सटीक निशाना है। तीर को उस पर लगाएँ — सटीक वार।",
    how4: "हर स्तर कठिन होता है: आँख तेज़ घूमती है, इसलिए और आगे का अनुमान करें — और भटकाव के बीच।",
    gotit: "ठीक है",
    legendStory: "महाभारत में, गुरु द्रोण ने एक लकड़ी की मछली पेड़ पर ऊँचे टाँगी और हर शिष्य से उसकी आँख भेदने को कहा — केवल नीचे जल में उसके <em>प्रतिबिंब</em> को देखते हुए। एक-एक कर सब आकाश, डालियाँ, लहराते जल की बात करते रहे। केवल अर्जुन ने कहा: <strong>“मुझे केवल मछली की आँख दिखती है, और कुछ नहीं।”</strong>",
    legendSub: "अति महारत की शत्रु है। केवल आँख देखें।",
    back: "वापस",
    paused: "रुका हुआ",
    resume: "जारी रखें",
    mainmenu: "मुख्य मेन्यू",
    hud_level: "स्तर",
    hud_score: "अंक",
    strikeEye: "आँख पर वार",
    finaleTitle: "आपने आँख को साध लिया",
    playAgain: "फिर से खेलें",
    keepGoing: "चलते रहें · अनंत",
    next: "आगे",
    warmup: "अभ्यास",
    findEye: "आँख खोजें — और कुछ नहीं",
    levelComplete: "स्तर पूरा",
    warmupDone: "अभ्यास पूरा",
    nowSeeEye: "अब — केवल आँख देखें।",
    finalScore: "अंतिम अंक",
    ring_bullseye: "सटीक निशाना!",
    ring_eye: "आँख",
    ring_body: "शरीर",
    miss1: "बहुत पास — ज़रा और आगे का अनुमान करें।",
    miss2: "साँस लें। केवल आँख देखें।",
    miss3: "आँख चलती रहती है — आगे निशाना लगाएँ।",
    soundOn: "ध्वनि: चालू", soundOff: "ध्वनि: बंद",
    motionFull: "गति: पूर्ण", motionReduced: "गति: कम",
    contrastOn: "उच्च कंट्रास्ट: चालू", contrastOff: "उच्च कंट्रास्ट: बंद",
    lvl_stillpool: "शांत जल",
    lvl_firstcurrent: "पहली धारा",
    lvl_driftingleaves: "बहते पत्ते",
    lvl_restlesswater: "चंचल जल",
    lvl_crowdedsky: "भरा आकाश",
    lvl_veilofglare: "चकाचौंध का परदा",
    lvl_whirlingeye: "घूमती आँख",
    lvl_arjunasgaze: "अर्जुन की दृष्टि",
    lvl_endless: "अनंत",
  },
};

let lang = "en";
try {
  const s = localStorage.getItem("aknLang");
  if (s === "en" || s === "hi") lang = s;
} catch { /* storage unavailable */ }

export function getLang() { return lang; }
export function setLang(l) {
  lang = l === "hi" ? "hi" : "en";
  try { localStorage.setItem("aknLang", lang); } catch { /* ignore */ }
  return lang;
}
export function t(key) {
  return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
}
export function applyStatic(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-i18n"));
  });
}
