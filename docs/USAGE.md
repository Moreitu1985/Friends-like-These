# ThutoFunds — Usage Guide

This guide shows judges and users how to run, explore, and evaluate the Mario‑style bursary finder.

---

## ▶ Running the Application

> Assumes you completed the steps in *SETUP.md* (env vars + Firebase). and installed all libraries

### Dev server (Vite)

bash
npm run dev


Open the printed *localhost* URL in your browser.

### Create React App (if your project uses CRA)

bash
before npm start move to bursary-finder
cd bursary finder .

npm start


### Production build

bash
npm run build
npm run preview   # vite preview server


---

## 🖥 How to Use (Step‑by‑Step)

### 1) Start at the Map

* You’ll see a *Mario‑style map* with three stops:

  * 🏡 *Personal Info Village*
  * 🌲 *Education Forest*
  * 🏰 *Financial Castle* (Boss)
* Your avatar (🧑‍🎓) moves right as you clear each stage.

### 2) Fill a Stage, Earn Coins

* Each stage shows just the fields for that stop. As you complete a *field for the first time, you earn **coins* and see progress.
* When all required fields for the current stage are filled, click *Clear Stage* to move forward.

  * Village → Forest → Castle

### 3) Face the Boss (Submit)

* At the *Financial Castle, press **Face the Boss — Get Matches*.
* The app will:

  1. Save your profile to Firestore
  2. Run the *rule‑based matcher* against opportunities
  3. (Optional) *Gemini re‑rank* the shortlist to the top 3 (when VITE_GEMINI_KEY is provided)
* You’ll then see *Recommended bursaries* with *Apply, **Save to Shortlist, and **Mark as Applied* actions.

### 4) Daily Perks & Badges (Optional but fun!)

* Click *Claim daily* to receive bonus points; consecutive days increase the reward (*streaks*).
* Do *N actions/day* (view/save/apply) to complete the *Daily Quest* and claim extra points.
* Badges unlock for milestones like *First 3 fields completed 🍄, **Profile Pro, **Shortlist Star, **First Application, **Level Up!*
* A simple *Leaderboard* shows the top users by points.

### 5) Load Last Results

* After submitting once, you can click *Load last saved* to retrieve your latest recommendations for the current profile.

---

## 🌱 Demo Walkthrough (for judges)

> If you’re running locally in dev mode, a *Seed demo data* button is available to quickly populate Firestore with example bursaries.

1. Start the dev server.
2. Click *Seed demo data*.
3. Stage 1 — Village:

   * Enter Full name, Email, Province → *Clear Stage*.
4. Stage 2 — Forest:

   * Enter Field, Year, GPA → *Clear Stage*.
5. Stage 3 — Castle:

   * Enter Income and optionally Interests → *Face the Boss — Get Matches*.
6. Review the *Recommended bursaries* list; use *Apply / Save to Shortlist / Mark as Applied*.
7. Optionally try *Claim daily* and complete the *Daily Quest* to see *badges/levels* update.

*Tip:* Use fields like Information Technology, Computer Science, or Engineering for fast demo matches.

---

## 🎮 Controls & UI Notes

* *Map buttons* under the path let you jump back to accessible stages (you can’t skip ahead).
* *Coins bar* reflects how many unique fields you’ve completed.
* *Level bar* increases with actions (profile, view, shortlist, apply, daily, quest complete).
* *Confetti* triggers on level‑ups and reward claims.

---

## 🎥 Demo

 demo video included in demo folder.


If you host a live demo page, include the URL here as well.

---

## 📌 Notes & Tips

* *Anonymous Auth* must be enabled for writes in dev; harden rules before production.
* *Deadlines: only opportunities with **future deadlines* are shown.
* *AI key*: If VITE_GEMINI_KEY is not set, the app falls back to *rule‑based top matches*.
* *Resetting*: Clear local storage or use the UI’s reset button (if present) to simulate a new user.
* *Troubleshooting*: If no results appear, seed data and ensure your Firestore timestamps/deadlines are valid.


