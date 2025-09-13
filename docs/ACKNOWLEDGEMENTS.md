# Acknowledgements

This document lists all *third‑party repositories, modules, frameworks, APIs, and services* used directly in this project.

> Only resources actually used by the codebase are included. System runtimes and standard libraries are excluded.

---

## 📦 Libraries & Frameworks

| Name                                       | Link / Repo                                                                                | Author(s)            | License    | Usage                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ | -------------------- | ---------- | ----------------------------------------------------------------------------------- |
| React                                      | [https://react.dev/](https://react.dev/)                                                   | Meta & community     | MIT        | UI library for building the app interface and components                            |
| React DOM                                  | [https://www.npmjs.com/package/react-dom](https://www.npmjs.com/package/react-dom)         | Meta & community     | MIT        | DOM renderer for React                                                              |
| Vite (or CRA)                            | [https://vitejs.dev/](https://vitejs.dev/)                                                 | Evan You & Vite team | MIT        | Dev server & bundler (default). Project also supports CRA scripts as an alternative |
| Firebase JS SDK (v9+)                      | [https://github.com/firebase/firebase-js-sdk](https://github.com/firebase/firebase-js-sdk) | Google               | Apache‑2.0 | Firestore database, Authentication (Anonymous), and client utilities                |
| Firebase Tools (optional for dev)        | [https://github.com/firebase/firebase-tools](https://github.com/firebase/firebase-tools)   | Google               | Apache‑2.0 | Local emulators / deploy tooling for development                                    |
| node‑fetch (optional for Cloud Function) | [https://github.com/node-fetch/node-fetch](https://github.com/node-fetch/node-fetch)       | node‑fetch team      | MIT        | HTTP client inside example Cloud Function stub                                      |

> If your repository uses CRA instead of Vite, substitute the build tool row accordingly.

---

## 🌐 APIs & Services

| Name                                                | Link / Docs                                                                              | Provider        | Usage                                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------- |
| Firebase Firestore                                  | [https://firebase.google.com/docs/firestore](https://firebase.google.com/docs/firestore) | Google Firebase | Persistent storage for users, opportunities, profiles, shortlists, and applications |
| Firebase Authentication (Anonymous)                 | [https://firebase.google.com/docs/auth](https://firebase.google.com/docs/auth)           | Google Firebase | Anonymous user sessions for saving points, badges, and progress                     |
| Google Generative Language API (Gemini 1.5 Flash) | [https://ai.google.dev/](https://ai.google.dev/)                                         | Google          | Optional re‑ranking of bursary recommendations from the rule‑based shortlist        |

> In production, calls to the Gemini API should be proxied through a server or Cloud Function. Avoid exposing API keys in client code.

---

## 📊 Datasets

No third‑party datasets are bundled. Demo bursaries are seeded via a project script/UI and are not sourced from an external dataset.

---

## 🖼 Trademarks & Content

* Bursary names, logos, and brand marks remain the property of their respective owners and are used here for identification and linking only.

---

## 🙌 Thanks

Huge thanks to the open‑source maintainers and service teams above for providing the tools that made *ThutoFunds* possible.
