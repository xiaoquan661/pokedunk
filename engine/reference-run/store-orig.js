const E = [
    "abeed",
    "africoon",
    "arabush",
    "beaner",
    "bestiality",
    "bitch",
    "blowjob",
    "boonga",
    "buttplug",
    "chingchong",
    "chink",
    "cunt",
    "deepthroat",
    "dick",
    "dildo",
    "doggystyle",
    "doublepenetration",
    "dyke",
    "ejaculate",
    "fag",
    "fellatio",
    "fggot",
    "fingerbang",
    "fistin",
    "fisting",
    "fuck",
    "gangbang",
    "handjob",
    "hitler",
    "jizz",
    "kike",
    "lubejob",
    "masterbate",
    "masturbate",
    "molest",
    "negro",
    "nigga",
    "nigger",
    "orgasm",
    "penis",
    "piss",
    "pussy",
    "rapist",
    "retard",
    "shit",
    "slut",
    "spastic",
    "tranny",
    "vagina",
    "wetback",
    "whore",
  ],
  v = [
    "abo",
    "anal",
    "anus",
    "arse",
    "ass",
    "bastard",
    "bich",
    "bollocks",
    "boob",
    "cock",
    "cocks",
    "cuck",
    "cum",
    "dck",
    "felch",
    "fk",
    "fuk",
    "hentai",
    "hooker",
    "incest",
    "jerkoff",
    "nig",
    "nigs",
    "orgies",
    "orgy",
    "pnis",
    "porn",
    "prick",
    "prn",
    "rape",
    "scat",
    "semen",
    "sex",
    "tiddies",
    "tit",
    "tities",
    "tits",
    "titt",
    "trany",
    "turd",
    "twat",
    "wank",
  ],
  j = [
    "analabos",
    "analagous",
    "analav",
    "analog",
    "analy",
    "arsen",
    "assem",
    "assen",
    "asser",
    "assess",
    "asset",
    "assev",
    "assoc",
    "assoi",
    "benedick",
    "cockney",
    "cuckoo",
    "dickens",
    "dickerson",
    "dickety",
    "dickey",
    "dickinson",
    "dickory",
    "dickson",
    "fagan",
    "fagin",
    "gasma",
    "janus",
    "manus",
    "montenegro",
    "negron",
    "negroni",
    "nigam",
    "nigeria",
    "nigerian",
    "penistone",
    "pissarro",
    "porgy",
    "pussycat",
    "pussywillow",
    "rapper",
    "retardant",
    "scunthorpe",
    "shiitake",
    "shitake",
    "snigger",
    "stoneground",
    "tetanus",
    "turducken",
    "twattle",
    "uranus",
    "winegrow",
  ],
  p = { severe: E, mild: v, allow: j },
  D = [
    "asshole",
    "arsehole",
    "kissass",
    "dumbass",
    "jackass",
    "smartass",
    "fatass",
    "asswipe",
    "asslick",
    "cocksuck",
    "phuck",
    "dumbfuck",
  ],
  N = ["fck", "fcuk", "sht", "shyt", "biatch", "dik"],
  M = ["therapist", "grapist"],
  u = (e) => e.replace(/(.)\1+/g, "$1"),
  g = (e, t = (o) => o) => [...new Set(e.map(t))],
  I = (e) => [...e].sort((t, o) => o.length - t.length || (t < o ? -1 : t > o ? 1 : 0)),
  R = g([...p.severe, ...D], u),
  x = I(g([...p.allow, ...M], u)),
  O = (e) =>
    new RegExp(
      "^".concat([...e.matchAll(/(.)\1*/g)].map((t) => "".concat(t[1], "{").concat(t[0].length, ",}")).join(""), "$"),
    ),
  _ = g([...p.mild, ...N]).map(O),
  U = { 0: "o", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s", "!": "i" };
function f(e) {
  const t = e.toLowerCase(),
    o = new Set();
  for (const a of ["i", "l"]) {
    const r = t.replace(/[034578@$!1]/g, (s) => (s === "1" ? a : U[s]));
    (o.add(r.replace(/[^a-z]/g, "")), o.add(r.replace(/v/g, "u").replace(/[^a-z]/g, "")));
  }
  return [...o];
}
const $ = (e, t) => t.reduce((o, a) => o.split(a).join(" "), e),
  y = (e) => e !== "" && _.some((t) => t.test(e));
function l(e) {
  if (!e) return !1;
  const t = f(e);
  for (const o of t) {
    const a = $(u(o), x);
    if (R.some((r) => a.includes(r)) || y(o)) return !0;
  }
  for (const o of e.toLowerCase().split(/[^a-z0-9@$!*]+/)) if (o && f(o).some(y)) return !0;
  return !1;
}
const C = "That team name isn't allowed. Please pick another.",
  F = (e, t) => (l(e) ? t : e);
function H(e) {
  return e.replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
}
const J = (e) =>
    e
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 3),
  G = (e) => /^[A-Z]{3}$/.test(e),
  P = (e) => {
    const t = e
        .replace(/[^a-z]/gi, "")
        .slice(0, 3)
        .toUpperCase(),
      o = t ? t.padEnd(3, "X") : "YOU";
    return l(o) ? "".concat(o.slice(0, 2), "X") : o;
  },
  W = (e, t) => {
    const o = typeof e == "string" ? e.trim().toUpperCase() : "";
    return G(o) && !l(o) ? o : P(t);
  },
  w = 20,
  k = (e) =>
    e
      .replace(/[^a-z ]/gi, "")
      .replace(/ {2,}/g, " ")
      .replace(/^ /, "")
      .slice(0, w),
  Y = (e) =>
    e
      .replace(/[^a-z\s]/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, w)
      .trim(),
  z = "#team-name, .rn-input, #fc-input, #sum-name";
function Q(e = document) {
  e.addEventListener(
    "input",
    (t) => {
      var r;
      const o = t.target;
      if (!o || o.tagName !== "INPUT" || !o.matches(z)) return;
      const a = k(o.value);
      if (a !== o.value) {
        const s = k(o.value.slice(0, (r = o.selectionStart) != null ? r : o.value.length)).length;
        o.value = a;
        try {
          o.setSelectionRange(s, s);
        } catch {}
      }
      K(o);
    },
    !0,
  );
}
function K(e) {
  var s;
  const t = l(e.value);
  e.setAttribute("aria-invalid", String(t));
  const o = (s = e.closest(".fc-row")) != null ? s : e,
    a = o.parentElement;
  if (!a) return;
  let r = a.querySelector(":scope > .name-err");
  if (!t) {
    r == null || r.remove();
    return;
  }
  r ||
    ((r = document.createElement("p")),
    (r.className = "name-err"),
    r.setAttribute("role", "alert"),
    (r.textContent = C),
    e.matches(".rn-input, #team-name") ? a.appendChild(r) : o.after(r));
}
function V(e) {
  for (let t = e.length - 1; t > 0; t--) {
    const o = Math.floor(Math.random() * (t + 1));
    [e[t], e[o]] = [e[o], e[t]];
  }
  return e;
}
function Z(e) {
  return e >= 90
    ? "dmd"
    : e >= 85
      ? "ame"
      : e >= 80
        ? "rby"
        : e >= 75
          ? "sap"
          : e >= 70
            ? "emr"
            : e >= 60
              ? "gld"
              : "brz";
}
const b = ["movement", "layups", "jumpshots", "passing", "alleyoop", "defense", "steals"],
  ee = () => ({ reps: 0, attempts: 0, defendS: 0, allowed: 0, elapsed: 0 }),
  te = 60,
  n = (e, t) => (e.type === "event" && e.byUser && e.kind === t ? e : null),
  i = (e) => Math.max(0, Math.round(Number.isFinite(e) ? e : 0)),
  c = (e, t) => Math.max(0, t - e.elapsed),
  B = (e) => (e.attempts > 0 ? Math.min(1, e.reps / e.attempts) : 0),
  X = [
    {
      id: "movement",
      title: "Movement",
      goal: { keys: "Run to each glowing spot with WASD or arrows", touch: "Drag the stick to each glowing spot" },
      repTarget: 6,
      timeLimit: 40,
      stars: [300, 600, 800],
      count: (e) => (e.type === "spot" ? { reps: 1 } : null),
      score: (e) => i(e.reps * 100 + (e.reps >= 6 ? c(e, 40) * 10 : 0)),
      coach: {
        intro: "Footwork first. Hit every spot, fast!",
        tip: "Cut straight to the next spot.",
        rep: "Got it! Next spot.",
        great: "Quick feet! That was elite.",
        good: "Nice moves. Shave a few seconds.",
        retry: "Keep moving. Go spot to spot.",
      },
    },
    {
      id: "layups",
      title: "Layups",
      goal: { keys: "Drive to the rim and press J to lay it in", touch: "Drive to the rim and tap X to lay it in" },
      repTarget: null,
      timeLimit: 45,
      stars: [6, 12, 18],
      count: (e) => {
        if (n(e, "release")) return { attempts: 1 };
        const t = n(e, "score");
        return t && (t.how === "layup" || t.how === "dunk") ? { reps: 1 } : null;
      },
      score: (e) => i(e.reps * 2),
      coach: {
        intro: "Attack the rim. Make as many as you can!",
        tip: "Get close before you shoot.",
        rep: "Bucket!",
        great: "Unstoppable at the rim!",
        good: "Solid finishing. Keep attacking.",
        retry: "Get all the way to the rim first.",
      },
    },
    {
      id: "jumpshots",
      title: "Jump Shots",
      goal: { keys: "Hold J, release at the top of your jump", touch: "Hold X, release at the top of your jump" },
      repTarget: null,
      timeLimit: 60,
      stars: [400, 800, 1200],
      count: (e) => {
        var t;
        return n(e, "release")
          ? { attempts: 1 }
          : ((t = n(e, "score")) == null ? void 0 : t.how) === "jump"
            ? { reps: 1 }
            : null;
      },
      score: (e) => i(e.reps * 100 * (1 + 0.5 * B(e))),
      coach: {
        intro: "Shoot from the rings. Timing is everything.",
        tip: "Let go right at the top of the jump.",
        rep: "Splash!",
        great: "Pure shooter! Automatic.",
        good: "Good stroke. Work on your release.",
        retry: "Release at the very top. Try again.",
      },
    },
    {
      id: "passing",
      title: "Passing",
      goal: { keys: "Press K to hit the open teammate", touch: "Tap A to hit the open teammate" },
      repTarget: 8,
      timeLimit: 40,
      stars: [400, 800, 1e3],
      count: (e) => (n(e, "pass") ? { reps: 1 } : null),
      score: (e) => i(e.reps * 100 + (e.reps >= 8 ? c(e, 40) * 15 : 0)),
      coach: {
        intro: "Move the ball. Follow the arrows!",
        tip: "Pass to the teammate the arrow points at.",
        rep: "Dime!",
        great: "Floor general! Crisp passing.",
        good: "Nice ball movement. Be quicker.",
        retry: "Look for the arrow, then pass.",
      },
    },
    {
      id: "alleyoop",
      title: "Alley-Oop",
      goal: {
        keys: "Hold Shift and press K to lob to the glowing spot",
        touch: "Hold TURBO and tap A to lob to the glowing spot",
      },
      repTarget: 5,
      timeLimit: 45,
      stars: [200, 400, 650],
      count: (e) => {
        if (n(e, "oop")) return { attempts: 1 };
        const t = n(e, "score");
        return t != null && t.oop ? { reps: 1 } : null;
      },
      score: (e) => i(e.reps * 100 + (e.reps >= 5 ? c(e, 45) * 10 : 0)),
      coach: {
        intro: "Throw it up! Lob it to your big on the spot.",
        tip: "Keep turbo held as you pass. That makes it a lob.",
        rep: "Alley-oop!",
        great: "Showtime! Perfect lobs every time.",
        good: "Nice lobs. Throw them up quicker.",
        retry: "Hold turbo, then pass to the spot.",
      },
    },
    {
      id: "defense",
      title: "Defense",
      goal: { keys: "Stay between your man and the hoop", touch: "Use the stick to stay between man and hoop" },
      repTarget: null,
      timeLimit: 30,
      stars: [200, 350, 500],
      count: (e) =>
        e.type === "defending" && e.dt > 0
          ? { defendS: e.dt }
          : n(e, "block") || n(e, "steal")
            ? { reps: 1 }
            : e.type === "event" && e.kind === "score" && !e.byUser
              ? { allowed: 2 }
              : null,
      score: (e) => i(e.defendS * 10 + e.reps * 100 - e.allowed * 50),
      coach: {
        intro: "Lock them up. Stay between man and hoop.",
        tip: "Shadow your man. Don’t let him by.",
        rep: "Stop!",
        great: "Lockdown defender!",
        good: "Good D. Go for a block or steal.",
        retry: "Stay in front. Don’t give up easy ones.",
      },
    },
    {
      id: "steals",
      title: "Steals",
      goal: { keys: "Press L near the dribbler to steal", touch: "Tap B near the dribbler to steal" },
      repTarget: 3,
      timeLimit: 45,
      stars: [100, 250, 400],
      count: (e) => (n(e, "steal") ? { reps: 1 } : null),
      score: (e) => i(e.reps * 100 + (e.reps >= 3 ? c(e, 45) * 5 : 0)),
      coach: {
        intro: "Pick their pocket! Get three steals.",
        tip: "Get close, then time your swipe.",
        rep: "Picked!",
        great: "Quick hands! Total thief.",
        good: "Nice hands. Be quicker next time.",
        retry: "Get right up on the dribbler.",
      },
    },
  ],
  m = Object.fromEntries(X.map((e) => [e.id, e])),
  oe = (e) => m[e];
function re(e, t, o) {
  var r, s, h, d;
  const a = e.count(o);
  return a
    ? {
        reps: t.reps + ((r = a.reps) != null ? r : 0),
        attempts: t.attempts + ((s = a.attempts) != null ? s : 0),
        defendS: t.defendS + ((h = a.defendS) != null ? h : 0),
        allowed: t.allowed + ((d = a.allowed) != null ? d : 0),
        elapsed: t.elapsed,
      }
    : t;
}
const ae = (e, t) => t.elapsed >= e.timeLimit || (e.repTarget !== null && t.reps >= e.repTarget);
function q(e, t) {
  return e >= t[0] ? (e >= t[2] ? 3 : e >= t[1] ? 2 : 1) : 0;
}
function se(e, t) {
  const o = e.score(t);
  return { score: o, stars: q(o, e.stars) };
}
const ne = (e) => (e >= 3 ? "great" : e >= 1 ? "good" : "retry"),
  ie = (e, t) => "".concat(e, ".").concat(t);
function ce(e) {
  var a, r;
  const [t, o] = e.split(".");
  return (r = (a = m[t]) == null ? void 0 : a.coach[o]) != null ? r : "";
}
const le = (e, t) => m[e].goal[t],
  S = "pokejam.tutorialDone";
function pe() {
  try {
    return localStorage.getItem(S) === "1";
  } catch {
    return !1;
  }
}
function ue() {
  try {
    localStorage.setItem(S, "1");
  } catch {}
}
const L = "pokejam.drillStars",
  A = (e) => (typeof e == "number" && Number.isFinite(e) ? Math.max(0, Math.min(3, Math.floor(e))) : 0);
function T() {
  const e = Object.fromEntries(b.map((r) => [r, 0]));
  let t = null;
  try {
    t = localStorage.getItem(L);
  } catch {
    return e;
  }
  if (!t) return e;
  let o;
  try {
    o = JSON.parse(t);
  } catch {
    return e;
  }
  if (!o || typeof o != "object" || Array.isArray(o)) return e;
  const a = o;
  for (const r of b) e[r] = A(a[r]);
  return e;
}
function ge(e) {
  return T()[e];
}
function me(e, t) {
  const o = T(),
    a = A(t);
  if (a <= o[e]) return o[e];
  o[e] = a;
  try {
    localStorage.setItem(L, JSON.stringify(o));
  } catch {}
  return a;
}
export {
  b as D,
  te as M,
  w as T,
  P as a,
  l as b,
  J as c,
  V as d,
  H as e,
  F as f,
  Q as g,
  pe as h,
  G as i,
  ee as j,
  ie as k,
  Y as l,
  oe as m,
  re as n,
  ae as o,
  se as p,
  ue as q,
  ne as r,
  K as s,
  Z as t,
  ce as u,
  ge as v,
  me as w,
  le as x,
  W as y,
  T as z,
};
