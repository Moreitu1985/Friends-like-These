# ThutoFunds — Setup Guide

A playful, Mario‑style React app that helps South African students find matching bursaries. It uses *Firebase* (Firestore + Auth) for data and *(optional) Gemini* for AI re‑ranking.

---

## 📦 Requirements

* *Node.js 18+* and *npm* (or yarn/pnpm)
* *Firebase* project with *Firestore* and *Authentication → Anonymous* enabled
* (Optional) *Firebase CLI* for local emulators / hosting (npm i -g firebase-tools)
* (Optional) *Gemini API key* (Google AI Studio). For production, proxy through a Cloud Function — do *not* ship the key to the browser.

---

## 🗂 Project Setup

bash
# 1) Clone
git clone <your-repo-url>
cd <repo-name>

# 2) Install deps
npm install
# (or) yarn
# (or) pnpm i


> This project is Vite‑friendly (import.meta.env) but also falls back to process.env for CRA. Check your package.json to confirm scripts.

---

## 🔐 Environment Variables

Create a **.env.local** in the project root (not committed):

bash
# ---- Firebase (from Console > Project settings > Web app config) ----
VITE_FIREBASE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456

# ---- Optional: Gemini key (for client-side demo only!) ----
# For production, leave this blank and call a Cloud Function instead.
VITE_GEMINI_KEY=YOUR_GEMINI_KEY


> If you’re using Create React App, duplicate the same keys with the REACT_APP_ prefix.

---

## 🔧 Firebase Configuration

1. *Create a Firebase project* at [https://console.firebase.google.com](https://console.firebase.google.com).
2. *Add a Web App* (\</>), copy the config, and paste into .env.local as above.
3. *Enable Authentication → Anonymous*.
4. *Enable Firestore* (Start in Test Mode for local/dev, then tighten rules before production).

*Recommended dev rules (only for local/testing!):*

javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Read all in dev; Write requires any signed-in user (including anonymous)
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}


> Collections used: users, opportunities, profiles, nested subcollections profiles/{id}/runs, shortlist, applications.

---

## 🌱 Demo Data (Opportunities)

There’s a built‑in *Seed demo data* button that appears *only in dev*. To use it:

1. Run the dev server (below).
2. Click *“Seed demo data”* in the UI.

This populates opportunities with sample bursaries (title, url, deadline, fields, eligibleYears, provinces, etc.).

> Prefer a script? Create scripts/seed-opportunities.mjs using Admin SDK, or keep the UI button for simplicity during demos.

---

## ▶ Run the App

### Vite (default)

bash
npm run dev
# open the printed localhost URL


### Create React App (if your package.json uses CRA)

bash
npm start


### Build & Preview

bash
npm run build
npm run preview   # (Vite)


---

## 🧠 How It Works (Quick Tour)

* *Stages (Mario-style):*

  * 🏡 Personal Info Village — name, email, province
  * 🌲 Education Forest — field, year, GPA
  * 🏰 Financial Castle — income, interests
* *Coins*: +1 on the first time each field is filled. Progress bar shows coins/totalFields.
* *Badges: e.g., *First 3 fields completed 🍄, Level Up!, Shortlist Star, First Application.
* *Daily perks*: daily claim with streaks; daily quest (N actions/day) → bonus points.
* *Submit (“Face the Boss”)*: saves a profiles/{id} document, computes a shortlist from Firestore opportunities, and optionally re‑ranks with Gemini.

> For production AI use, create a *Cloud Function* (HTTP) that accepts { profile, shortlist }, calls Gemini with a server‑side key, and returns the ranked top 3.

---

## ☁ (Optional) Cloud Function Stub (Node 18)

js
// functions/index.js (Express-style HTTP endpoint)
import functions from "firebase-functions";
import fetch from "node-fetch";

export const rerank = functions.https.onRequest(async (req, res) => {
  const { profile, shortlist } = req.body || {};
  const key = process.env.GEMINI_KEY;
  if (!key) return res.status(500).json({ error: "Missing GEMINI_KEY" });

  const prompt = `You are an expert on South African bursaries...`;
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
  );
  const data = await r.json();
  return res.json(data);
});


Deploy with:

bash
cd functions
npm i
firebase deploy --only functions


Then point the app to your function instead of using VITE_GEMINI_KEY in the client.

---

## 🧪 Local Emulators (Optional)

bash
firebase init emulators   # choose Firestore + Auth
firebase emulators:start


Update your firebase.js to use connectFirestoreEmulator and connectAuthEmulator when import.meta.env.DEV is true.

---

## 🐞 Troubleshooting

* *Permission denied: Ensure **Anonymous Auth* is enabled and rules allow writes in dev.
* *Gemini 403/401*: Invalid or missing VITE_GEMINI_KEY. For production, move to a Cloud Function.
* *No seed button*: Appears only when import.meta.env.DEV === true.
* *Empty results*: Verify opportunities collection exists and deadlines are in the future.

---

## ✅ Next Steps

* Tighten Firestore rules for production.
* Swap client‑side Gemini for a server/function.
* Add CI/CD (lint, type‑checks, deploy).

