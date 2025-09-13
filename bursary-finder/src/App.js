import { useEffect, useMemo, useRef, useState } from "react";
import { db, ensureAnonAuth } from "./firebase";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  updateDoc,
  increment,
  orderBy,
  limit,
  query,
  arrayUnion,
} from "firebase/firestore";
import seedOpportunities from "./seedOpportunities";

const isDev =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) ||
  process.env.NODE_ENV === "development";

const GEMINI_KEY =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GEMINI_KEY) ||
  process.env.REACT_APP_GEMINI_KEY ||
  "";

// provinces for dropdown
const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

//study years for dropdown
const YEARS = [1, 2, 3, 4, 5];
// making an array helper
const arr = (v) => (Array.isArray(v) ? v : []);

const toNumber = (v) =>
  typeof v === "string" ? Number(v.replace(/[^\d.-]/g, "")) : Number(v);
const splitCSV = (s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);

//formating the users input
function normalizeProfile(p) {
  return {
    ...p,
    year: toNumber(p.year),
    gpa: toNumber(p.gpa),
    income: toNumber(p.income),
    field: (p.field || "").trim(),
    province: (p.province || "").trim(),
    interestsArr: splitCSV(p.interests || ""),
  };
}

// returns {pass:boolean, reasons:string[]}
function passesHardEligibility(profile, opp) {
  const reasons = [];

  // year
  const years = arr(opp.eligibleYears);
  if (!years.includes(profile.year)) {
    reasons.push(`Year ${profile.year} not in [${years.join(", ")}]`);
  }

  // province
  const provs = arr(opp.provinces);
  const provOK = provs.includes("All") || provs.includes(profile.province);
  if (!provOK) reasons.push(`Province ${profile.province} not in [${provs.join(", ")}]`);

  // average
  if (typeof opp.minAverage === "number" && profile.gpa < opp.minAverage) {
    reasons.push(`Average ${profile.gpa}% < min ${opp.minAverage}%`);
  }

  // income cap
  if (typeof opp.incomeCap === "number" && profile.income > opp.incomeCap) {
    reasons.push(`Income R${profile.income} > cap R${opp.incomeCap}`);
  }

  // deadline 
  const now = new Date();
  const deadline = opp.deadline?.toDate ? opp.deadline.toDate() : opp.deadline ? new Date(opp.deadline) : null;
  if (deadline && deadline < now) {
    reasons.push(`Deadline passed (${deadline.toISOString().slice(0, 10)})`);
  }

  return { pass: reasons.length === 0, reasons };
}

// scoring between 0 and 100
function scoreOpportunity(profile, opp) {
  let score = 0;
  const notes = [];

  const fields = (opp.fields || []).map((f) => (f || "").toLowerCase().trim());
  const pf = (profile.field || "").toLowerCase().trim();
  if (fields.includes(pf)) {
    score += 40;
    notes.push("Field matches");
  } else if (fields.some((f) => pf.includes(f) || f.includes(pf))) {
    score += 20;
    notes.push("Field roughly related");
  }

  // interests overlap
  const overlap = (profile.interestsArr || []).filter((i) => fields.includes((i || "").toLowerCase().trim()));
  if (overlap.length) {
    score += 10;
    notes.push(`Interests overlap: ${overlap.join(", ")}`);
  }

  // GPA cushion
  if (typeof opp.minAverage === "number" && profile.gpa >= opp.minAverage) {
    const delta = Math.min(10, Math.floor((profile.gpa - opp.minAverage) / 2));
    score += Math.max(0, delta);
  }

  // Income
  if (typeof opp.incomeCap === "number" && profile.income <= opp.incomeCap) score += 10;

  // Province exact (if not "All")
  if (Array.isArray(opp.provinces) && opp.provinces.includes(profile.province) && !opp.provinces.includes("All")) {
    score += 5;
  }

  // Deadline urgency bump (<= 45 days)
  const deadline = opp.deadline?.toDate ? opp.deadline.toDate() : opp.deadline ? new Date(opp.deadline) : null;
  if (deadline && !isNaN(deadline)) {
    const days = Math.max(0, Math.round((deadline - new Date()) / (1000 * 60 * 60 * 24)));
    if (days <= 45) score += 5;
  }

  return { score, notes };
}

async function fetchAllOpportunities(db) {
  const snap = await getDocs(collection(db, "opportunities"));
  const now = new Date();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((o) => {
      // checking if deadline is valid
      const deadline = o.deadline?.toDate ? o.deadline.toDate() : o.deadline ? new Date(o.deadline) : null;
      return !deadline || deadline >= now;
    });
}

async function matchBursariesRuleBased(db, rawProfile, limit = 10) {
  const profile = normalizeProfile(rawProfile);
  const all = await fetchAllOpportunities(db);

  const eligible = [];
  for (const opp of all) {
    const check = passesHardEligibility(profile, opp);
    if (!check.pass) continue;
    const { score, notes } = scoreOpportunity(profile, opp);
    eligible.push({ opp, score, notes });
  }

  // Fallback if no hard matches: top 3 by soft score
  if (eligible.length === 0 && all.length > 0) {
    const soft = all
      .map((opp) => ({ opp, ...scoreOpportunity(profile, opp) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ opp, score, notes }) => ({
        title: opp.title,
        reason: `Soft match ${score}. ${notes.join("; ") || "Related field"}`,
        eligibility: `Deadline: ${
          (opp.deadline?.toDate ? opp.deadline.toDate() : new Date(opp.deadline)).toISOString().slice(0, 10)
        }`,
        url: opp.url,
      }));
    return soft;
  }

  eligible.sort((a, b) => b.score - a.score);
  return eligible.slice(0, limit).map(({ opp, score, notes }) => ({
    title: opp.title,
    reason: `Score ${score}. ${notes.join("; ") || "Good fit"}`,
    eligibility: [
      `Min average: ${opp.minAverage ?? "n/a"}%`,
      `Years: ${arr(opp.eligibleYears).join(", ")}`,
      `Provinces: ${arr(opp.provinces).join(", ")}`,
      `Deadline: ${
        (opp.deadline?.toDate ? opp.deadline.toDate() : new Date(opp.deadline)).toISOString().slice(0, 10)
      }`,
    ].join(" • "),
    url: opp.url,
  }));
}

// AI reranking
function safeParseArray(text) {
  if (!text) return [];
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    const arr = JSON.parse(cleaned);
    return Array.isArray(arr) ? arr : [];
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        const arr = JSON.parse(cleaned.slice(start, end + 1));
        return Array.isArray(arr) ? arr : [];
      } catch {}
    }
    return [];
  }
}

async function rerankWithAI(profile, topList) {
  if (!topList || topList.length === 0) return [];
  
  const prompt = `You are an expert on South African bursaries.
Given the student profile and a shortlist of bursaries (from a rules engine), pick the BEST 3 and explain why.
Return STRICT JSON exactly like:
[
  { "title": "...", "reason": "...", "eligibility": "..." }
]

Student profile: ${JSON.stringify(profile)}
Shortlist: ${JSON.stringify(topList)}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    if (!res.ok) {
      console.warn("Gemini HTTP error", res.status, await res.text());
      return topList.slice(0, 3);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = safeParseArray(text);
    if (parsed.length === 0) return topList.slice(0, 3);

    return parsed.slice(0, 3).map((ai) => {
      const match = topList.find(
        (t) => (t.title || "").trim().toLowerCase() === (ai.title || "").trim().toLowerCase()
      );
      return { ...ai, url: ai.url || match?.url };
    });
  } catch (err) {
    console.warn("AI rerank failed — fallback to rules", err);
    return topList.slice(0, 3);
  }
}

//Gamification
const POINTS = { profile: 50, view: 30, shortlist: 70, apply: 100, daily: 20 };
const LEVEL_STEP = 200; // pts per level
const QUEST_GOAL = 3; // actions today
const QUEST_REWARD = 30; // points for quest

function computeLevel(points) {
  const level = Math.floor(points / LEVEL_STEP) + 1;
  const into = points % LEVEL_STEP;
  return { level, into, pct: Math.round((into / LEVEL_STEP) * 100) };
}

function useConfetti() {
  const ref = useRef(null);
  return {
    shoot() {
      // celebration confetti
      const el = document.createElement("div");
      el.style.position = "fixed";
      el.style.left = 0;
      el.style.top = 0;
      el.style.right = 0;
      el.style.pointerEvents = "none";
      el.style.zIndex = 9999;
      el.style.textAlign = "center";
      el.style.fontSize = "24px";
      el.textContent = "🎉🎊✨";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    },
  };
}

const dateKey = () => new Date().toISOString().slice(0, 10);

// adding the game levels
const STAGES = [
  { key: "personal", title: "Personal Info Village", icon: "🏡", fields: ["fullName", "email", "province"], cta: "Next Stage" },
  { key: "education", title: "Education Forest", icon: "🌲", fields: ["field", "year", "gpa"], cta: "Next Stage" },
  { key: "financial", title: "Financial Castle", icon: "🏰", fields: ["income", "interests"], cta: "Face the Boss" },
];

function MarioMap({ stageIndex, completed, onJump }) {
  const width = 560;
  const pathY = 70;
  const step = width / (STAGES.length + 1);
  const avatarX = Math.min(width - 24, Math.max(12, 12 + step * (stageIndex + 1)));
  return (
    <div style={{ background: "#E0F2FE", borderRadius: 14, padding: 14, border: "1px solid #d6e3ff" }}>
      <div style={{ position: "relative", height: 130 }}>
        {/* path */}
        <div style={{ position: "absolute", left: 0, right: 0, top: pathY, height: 4, background: "#d1d5db" }} />
        {STAGES.map((s, i) => (
          <div key={s.key} style={{ position: "absolute", left: 12 + step * (i + 1), top: pathY - 26, transform: "translateX(-50%)", textAlign: "center" }}>
            <div style={{ fontSize: 26 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: "#374151" }}>{s.title.split(" ")[0]}</div>
          </div>
        ))}
        {/* avatar */}
        <div style={{ position: "absolute", left: avatarX, top: pathY - 40, transform: "translateX(-50%)", transition: "left 300ms ease" }}>
          <div style={{ fontSize: 28 }}>🧑‍🎓</div>
        </div>
        {/* boss / trophy */}
        <div style={{ position: "absolute", right: -6, top: pathY - 62, fontSize: 30 }}>{completed ? "🏆" : "👹"}</div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {STAGES.map((s, i) => (
          <button key={s.key} disabled={i > stageIndex} onClick={() => onJump(i)} style={{ border: "1px solid #c7d2fe", background: i === stageIndex ? "#e0e7ff" : "white", color: "#111827", borderRadius: 999, padding: "6px 10px", fontSize: 12, opacity: i > stageIndex ? 0.6 : 1 }}>
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function StageField({ name, value, onChange, theme }) {
  if (name === "province") {
    return (
      <select name={name} value={value} onChange={onChange} required style={inputStyle(true)}>
        <option value="">Province</option>
        {PROVINCES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    );
  }
  if (name === "year") {
    return (
      <select name={name} value={value} onChange={onChange} required style={inputStyle(true)}>
        <option value="">Year of Study</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    );
  }
  const placeholderMap = {
    fullName: "Full name",
    email: "Email",
    province: "Province",
    field: "Field of Study",
    year: "Year of Study",
    gpa: "GPA / Average (%)",
    income: "Household Income (R)",
    interests: "Interests (comma separated)",
  };
  const mode = name === "gpa" || name === "income" ? "numeric" : undefined;
  return (
    <input
      name={name}
      placeholder={placeholderMap[name] || name}
      value={value}
      inputMode={mode}
      onChange={onChange}
      required
      style={inputStyle(true)}
    />
  );
}

export default function App() {
  const [uid, setUid] = useState(null);
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    field: "",
    year: "",
    province: "",
    gpa: "",
    income: "",
    interests: "",
  });
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState(null);

  // MARIO STAGES
  const [stageIndex, setStageIndex] = useState(0);

  // coins per unique field filled
  const [coins, setCoins] = useState(0);
  const [filledSet, setFilledSet] = useState(new Set());
  const totalFields = STAGES.reduce((s, st) => s + st.fields.length, 0);

  // gamification state
  const [points, setPoints] = useState(0);
  // string ids
  const [badges, setBadges] = useState([]); 
  const [streak, setStreak] = useState(1);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [questProgress, setQuestProgress] = useState(0);
  const [questClaimed, setQuestClaimed] = useState(false);
  const [leaders, setLeaders] = useState([]);
  const confetti = useConfetti();

  // optional anon auth
  useEffect(() => {
    ensureAnonAuth().then(setUid);
  }, []);

  // hydrate/persist user gamification
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "users", uid);
    (async () => {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          createdAt: serverTimestamp(),
          points: 0,
          badges: [],
          streak: 1,
          lastDailyClaim: "",
          dailyQuest: { date: "", progress: 0, claimed: false },
        });
      } else {
        const data = snap.data() || {};
        setPoints(data.points || 0);
        setBadges(Array.isArray(data.badges) ? data.badges : []);
        setStreak(data.streak || 1);
        const today = dateKey();
        setDailyClaimed((data.lastDailyClaim || "") === today);
        if (data.dailyQuest?.date === today) {
          setQuestProgress(data.dailyQuest.progress || 0);
          setQuestClaimed(!!data.dailyQuest.claimed);
        }
      }
      refreshLeaderboard();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const refreshLeaderboard = async () => {
    try {
      const qref = query(collection(db, "users"), orderBy("points", "desc"), limit(5));
      const snap = await getDocs(qref);
      setLeaders(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
    } catch {}
  };

  const levelInfo = useMemo(() => computeLevel(points), [points]);

  const theme = {
    brand: "#FF6B00", 
    bg: "#FFF7E1",    
    card: "#FFFFFF",
    text: "#1F2937",
    muted: "#6B7280",
    ok: "#22C55E",
    warn: "#F59E0B",
    track: "#F3F4F6",  
    link: "#EFF6FF",   
    border: "#E5E7EB",
  };

  // actions
  function handleChange(e) {
    const { name, value } = e.target;
    setProfile((prev) => {
      const wasEmpty = !String(prev[name] || "").trim();
      const next = { ...prev, [name]: value };
      const nowFilled = !!String(value).trim();
      if (wasEmpty && nowFilled && !filledSet.has(name)) {
        setFilledSet((s) => new Set([...s, name]));
        setCoins((c) => c + 1);
        if (filledSet.size + 1 === 3) awardBadge("First 3 fields completed 🍄");
      }
      return next;
    });
  }

  async function loadLast() {
    if (!currentProfileId) {
      alert("No profile selected yet. Submit the form first.");
      return;
    }
    try {
      const snap = await getDoc(doc(db, "profiles", currentProfileId, "runs", "latest"));
      if (snap.exists()) {
        const data = snap.data();
        setMatches(data.results || []);
        setSubmitted(true);
        addPoints("view");
      } else {
        alert("No saved recommendations yet for this profile.");
      }
    } catch (e) {
      console.error("Failed to load last recommendations:", e);
      alert("Could not load saved recommendations.");
    }
  }

  function awardBadge(id) {
    setBadges((b) => Array.from(new Set([...b, id])));
    if (uid) updateDoc(doc(db, "users", uid), { badges: arrayUnion(id) }).catch(() => {});
  }

  function addPoints(kind) {
    const inc = POINTS[kind] || 0;
    if (!inc) return;

    setPoints((p) => {
      const next = p + inc;
      const prevLevel = computeLevel(p).level;
      const nextLevel = computeLevel(next).level;
      if (nextLevel > prevLevel) {
        confetti.shoot();
        awardBadge("Level Up!");
      }
      return next;
    });

    if (uid) updateDoc(doc(db, "users", uid), { points: increment(inc) }).catch(() => {});

    // quick badges
    if (kind === "profile") awardBadge("Profile Pro");
    if (kind === "shortlist") awardBadge("Shortlist Star");
    if (kind === "apply") awardBadge("First Application");

    // daily quest progress for interactions
    const questKinds = new Set(["view", "shortlist", "apply"]);
    if (questKinds.has(kind)) {
      setQuestProgress((p) => {
        const np = Math.min(QUEST_GOAL, p + 1);
        if (uid)
          updateDoc(doc(db, "users", uid), {
            dailyQuest: { date: dateKey(), progress: np, claimed: questClaimed },
          }).catch(() => {});
        if (np === QUEST_GOAL && !questClaimed) awardBadge("Quest Ready");
        return np;
      });
    }

    setTimeout(refreshLeaderboard, 500);
  }

  const dailyRewardAmount = useMemo(() => {
    // base daily + 5 per streak step, cap at 50
    return Math.min(50, POINTS.daily + Math.max(0, streak - 1) * 5);
  }, [streak]);

  async function claimDaily() {
    if (dailyClaimed) return alert("Already claimed today");
    const today = dateKey();
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      const data = snap.data() || {};
      let newStreak = 1;
      if (data.lastDailyClaim) {
        const prev = new Date(data.lastDailyClaim);
        const diff = Math.floor((new Date(today) - prev) / 86400000);
        newStreak = diff === 1 ? (data.streak || 0) + 1 : diff === 0 ? data.streak || 1 : 1;
      }
      setStreak(newStreak);
      setDailyClaimed(true);
      setPoints((p) => p + dailyRewardAmount);
      if (uid)
        await updateDoc(ref, {
          lastDailyClaim: today,
          streak: newStreak,
          points: increment(dailyRewardAmount),
        });
      if (newStreak >= 3) awardBadge("3-Day Streak");
      confetti.shoot();
      refreshLeaderboard();
    } catch (e) {
      console.warn("Daily claim failed", e);
    }
  }

  function dailyCheckIn() {
    claimDaily();
  }

  async function claimQuestReward() {
    if (questClaimed || questProgress < QUEST_GOAL) return;
    setQuestClaimed(true);
    setPoints((p) => p + QUEST_REWARD);
    if (uid)
      await updateDoc(doc(db, "users", uid), {
        points: increment(QUEST_REWARD),
        dailyQuest: { date: dateKey(), progress: questProgress, claimed: true },
      }).catch(() => {});
    awardBadge("Quest Complete");
    confetti.shoot();
    refreshLeaderboard();
  }

  // stage helpers
  function stageFieldsValid(i) {
    const f = STAGES[i].fields;
    return f.every((k) => String(profile[k] || "").trim().length > 0);
  }

  async function clearStage() {
    if (!stageFieldsValid(stageIndex)) return alert("Please complete this stage");
    addPoints("view"); // small reward
    if (stageIndex < STAGES.length - 1) {
      setStageIndex((i) => i + 1);
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    // ensure all stages valid
    for (let i = 0; i < STAGES.length; i++) {
      if (!stageFieldsValid(i)) {
        setStageIndex(i);
        return alert(`Please finish: ${STAGES[i].title}`);
      }
    }

    setLoading(true);
    try {
      const norm = normalizeProfile(profile);
      // inline validation
      if (!norm.field || !norm.province || !norm.year || !norm.gpa || !norm.income)
        throw new Error("Please complete all required fields.");
      if (Number.isNaN(norm.year) || Number.isNaN(norm.gpa) || Number.isNaN(norm.income))
        throw new Error("GPA/Income/Year must be numbers.");

      //saving profile
      const saved = await addDoc(collection(db, "profiles"), {
        ...norm,
        createdAt: serverTimestamp(),
        uid: uid || null,
      });
      setCurrentProfileId(saved.id);
      addPoints("profile");

      // rule based shortlist from Firestore
      const shortlist = await matchBursariesRuleBased(db, norm, 8);

      // If still empty, guarantee it will display 3 demo items 
      let final3 = shortlist.slice(0, 3);
      if (final3.length === 0) {
        final3 = [
          { title: "MTN ICT Bursary", reason: "ICT match for undergrads", eligibility: "SA citizens • ICT fields" },
          { title: "Shoprite IT Bursary", reason: "CS/Data focus", eligibility: "Undergrad CS/Data" },
          { title: "Transnet Engineering Bursary", reason: "Engineering pathway", eligibility: "Mech/Electrical Eng" },
        ];
      }

      // AI re-rank the best 3 safe fallback to rule-based
      if (GEMINI_KEY) {
        try {
          const ai3 = await rerankWithAI(norm, shortlist);
          if (ai3 && ai3.length) final3 = ai3;
        } catch (err) {
          console.warn("AI rerank failed, using rule-based:", err);
        }
      }

      setMatches(final3);
      addPoints("view");

      //persist results
      await setDoc(doc(db, "profiles", saved.id, "runs", "latest"), {
        createdAt: serverTimestamp(),
        results: final3,
      });

      setSubmitted(true);
      setStageIndex(STAGES.length - 1);
      //the boss will be defeated
      confetti.shoot(); 
    } catch (err) {
      console.error("Submit error:", err);
      alert(err.message || "We hit a snag saving or matching bursaries. Using a safe fallback.");
      // UI fallback so demo continues
      setMatches([
        { title: "MTN ICT Bursary", reason: "ICT match for undergrads", eligibility: "SA citizens • ICT fields" },
        { title: "Shoprite IT Bursary", reason: "CS/Data focus", eligibility: "Undergrad CS/Data" },
        { title: "Transnet Engineering Bursary", reason: "Engineering pathway", eligibility: "Mech/Electrical Eng" },
      ]);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  async function saveToShortlist(item) {
    if (!currentProfileId) return alert("Save a profile first");
    await addDoc(collection(db, "profiles", currentProfileId, "shortlist"), {
      ...item,
      createdAt: serverTimestamp(),
    });
    addPoints("shortlist");
  }

  async function markApplied(item) {
    if (!currentProfileId) return alert("Save a profile first");
    await addDoc(collection(db, "profiles", currentProfileId, "applications"), {
      ...item,
      appliedAt: serverTimestamp(),
    });
    addPoints("apply");
  }

  const bar = (pct) => (
    <div style={{ width: "100%", background: theme.track, height: 10, borderRadius: 999 }}>
      <div style={{ width: `${pct}%`, height: 10, borderRadius: 999, background: theme.brand }} />
    </div>
  );

  // UI
  return (
    <div
      style={{
        maxWidth: "100%",
        width: "100%",
        margin: "0 auto",
        padding: 24,
        color: theme.text,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        background: theme.bg,
        minHeight: "100vh",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>🎓 ThutoFunds — Bursary Finder</h1>
        <button
          onClick={dailyCheckIn}
          disabled={dailyClaimed}
          style={{ background: theme.card, color: theme.text, border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 10px", opacity: dailyClaimed ? 0.6 : 1 }}
        >
          {dailyClaimed ? "Daily claimed" : `Claim daily (+${dailyRewardAmount})`} • Streak {streak}
        </button>
      </header>

      {/* Top row: map + coins/progress */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12, alignItems: "start" }}>
        <div>
          <MarioMap stageIndex={stageIndex} completed={submitted} onJump={(i) => setStageIndex(i)} />
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: theme.card, borderRadius: 12, padding: 12, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 18 }}>🪙</div>
              <strong>Coins: {coins}</strong>
            </div>
            <div style={{ marginTop: 8 }}>{bar(Math.round((coins / totalFields) * 100))}</div>
            <div style={{ fontSize: 12, color: theme.muted, marginTop: 6 }}>{coins}/{totalFields} fields completed</div>
          </div>
          {/* Level + badges */}
          <div style={{ background: theme.card, borderRadius: 12, padding: 12, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <strong>Level {levelInfo.level}</strong>
              <div style={{ flex: 1 }}>{bar(levelInfo.pct)}</div>
              <span>
                {levelInfo.into}/{LEVEL_STEP} pts
              </span>
            </div>
            {!!badges.length && (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {badges.map((b) => (
                  <span key={b} style={{ background: "#102046",color: "#FFFFFF", borderRadius: 999, padding: "4px 8px", fontSize: 12 }}>
                    🏅 {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stage card */}
      {!submitted && (
        <div style={{ background: theme.card, border: "1px solid #E5E7EB", borderRadius: 12, padding: 16, marginTop: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{STAGES[stageIndex].title}</h2>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {STAGES[stageIndex].fields.map((f) => (
              <StageField key={f} name={f} value={profile[f] || ""} onChange={handleChange} theme={theme} />
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {stageIndex < STAGES.length - 1 ? (
              <button type="button" onClick={clearStage} style={primaryBtn(theme)}>
                {STAGES[stageIndex].cta}
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} style={primaryBtn(theme)}>
                {STAGES[stageIndex].cta} — Get Matches
              </button>
            )}

            <button type="button" onClick={loadLast} style={ghostBtn(theme)}>
              Load last saved
            </button>
          
          </div>

          {/* Daily quest */}
          <div style={{ background: theme.track, borderRadius: 8, padding: 10, marginTop: 12, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <strong>Daily Quest</strong>
                <div style={{ fontSize: 12, color: theme.muted }}>Do {QUEST_GOAL} actions today (view/save/apply)</div>
              </div>
              <button className="secondary" disabled={questClaimed || questProgress < QUEST_GOAL} onClick={claimQuestReward} style={ghostBtn(theme)}>
                {questClaimed ? "Quest complete" : `Claim +${QUEST_REWARD}`}
              </button>
            </div>
            <div style={{ marginTop: 8 }}>{bar((questProgress / QUEST_GOAL) * 100)}</div>
            <div style={{ fontSize: 12, color: theme.muted, marginTop: 6 }}>{questProgress}/{QUEST_GOAL} actions</div>
          </div>
        </div>
      )}

      {loading && <p style={{ color: theme.muted, marginTop: 16 }}>⏳ Finding bursaries…</p>}

      {/* Results */}
      {submitted && !loading && (
        <section style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 18, margin: "8px 0" }}>Boss defeated! 🏆 Recommended bursaries</h2>
            <div>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setMatches([]);
                }}
                style={ghostBtn(theme)}
              >
                Edit profile
              </button>
              <button onClick={loadLast} style={{ ...ghostBtn(theme), marginLeft: 8 }}>
                Load last
              </button>
            </div>
          </div>

          {matches.length === 0 && <EmptyState theme={theme} />}

          {matches.map((b, i) => (
            <div
              key={i}
              style={{ background: theme.card, border: "1px solid #E5E7EB", padding: 12, marginBottom: 10, borderRadius: 12 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{b.title}</h3>
                <span style={{ fontSize: 12, color: theme.muted }}>#{i + 1}</span>
              </div>
              <p style={{ margin: "8px 0", color: theme.text }}>{b.reason}</p>
              {b.eligibility && (
                <p style={{ margin: "6px 0", color: theme.muted }}>
                  <strong>Eligibility:</strong> {b.eligibility}
                </p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a
                  href={
                    b.url || `https://www.google.com/search?q=${encodeURIComponent((b.title || "") + " bursary South Africa")}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  style={linkBtn(theme)}
                >
                  Apply / Learn more ↗
                </a>
                <button onClick={() => saveToShortlist(b)} style={ghostBtn(theme)}>
                  Save to Shortlist
                </button>
                <button onClick={() => markApplied(b)} style={ghostBtn(theme)}>
                  Mark as Applied
                </button>
              </div>
            </div>
          ))}

          {/* Leaderboard */}
          <div style={{ background: theme.card, borderRadius: 12, padding: 12, border: "1px solid #E5E7EB", marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Leaderboard (Top 5)</strong>
              <button onClick={refreshLeaderboard} style={{ ...ghostBtn(theme), fontSize: 12 }}>Refresh</button>
            </div>
            <ol style={{ marginTop: 8, paddingLeft: 18 }}>
              {leaders.map((u) => (
                <li key={u.id} style={{ fontSize: 14, color: theme.text }}>
                  <span style={{ fontWeight: u.id === uid ? 700 : 500 }}>{u.id === uid ? "You" : (u.id || "").slice(0, 6)}</span>
                  <span style={{ color: theme.muted }}> — {u.points ?? 0} pts</span>
                </li>
              ))}
              {leaders.length === 0 && <div style={{ fontSize: 12, color: theme.muted }}>No data yet.</div>}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}

function inputStyle() {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #E5E7EB",
    background: "#FFFFFF",
    color: "#1F2937",
    outline: "none",
  };
};

function primaryBtn(theme) {
  return {
    background: theme.brand,
    color: "white",
    border: "none",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
  };
}
function ghostBtn(theme) {
  return {
    background: "transparent",
    color: theme.text,
    border: "1px solid #E5E7EB",
    padding: "9px 12px",
    borderRadius: 10,
    cursor: "pointer",
  };
}
function linkBtn(theme) {
  return {
    textDecoration: "none",
    background: theme.link,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    padding: "9px 12px",
    borderRadius: 10,
    display: "inline-block",
  };
}



function EmptyState({ theme }) {
  return (
    <div style={{ background: theme.card, border: "1px dashed #234", borderRadius: 12, padding: 16, color: theme.muted }}>
      <p style={{ marginTop: 0 }}>No direct matches yet. Tips:</p>
      <ul style={{ marginTop: 6 }}>
        <li>Try a related field name (e.g., “Computer Science” → “Information Technology”).</li>
        <li>Increase search breadth by leaving Interests blank.</li>
        <li>We’ll still show near-matches and Google links for discovery.</li>
      </ul>
    </div>
  );
}
