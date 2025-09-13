// src/App.js
import { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, doc , setDoc,serverTimestamp,getDoc } from "firebase/firestore";



function App() {
  const [profile, setProfile] = useState({
    field: "",
    year: "",
    province: "",
    gpa: "",
    income: "",
    interests: ""
  });

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState(null);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // Function to call Google AI Studio / Gemini
 // Function to call Google AI Studio / Gemini (free-mode, browser-safe)
const fetchBursariesAI = async (profile,profileId) => {
  setLoading(true);
  try {
    const prompt = `
You are an expert in South African bursaries and scholarships.

Given this student profile, suggest exactly 3 bursaries.
Return STRICT, valid JSON ONLY in this exact format:

[
  {
    "title": "Name of the bursary",
    "reason": "Why this bursary fits the student",
    "eligibility": "Eligibility criteria"
  }
]

Student profile: ${JSON.stringify(profile)}
    `;

    // Use the browser-friendly endpoint with the API key in the URL
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyA8QzMhj-B2kMIdAi24-p4t7L1lIFrE8eI`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await res.json();

    // Gemini's response shape for this endpoint:
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

    // Try to parse the JSON the model returned
    //const aiResults = JSON.parse(text);
    let aiResults;
    try{
      aiResults=JSON.parse(text);
    }catch (parseErr) {
      console.warn("Model did not return valid JSON;raw text:",text);
      throw parseErr;
    }
    setMatches(aiResults);
    console.log("Saving results under profileId:",profileId);
    if(profileId){
      await setDoc(doc(db, "profiles",profileId,"runs","latest"),{
        createdAt: serverTimestamp(),
        results: aiResults
      });
    }
    
  } catch (err) {
    console.error("Gemini error:", err);
    // Fallback for demo so the UI still shows something
    const fallback = [
      { title: "Tech Scholarship", reason: "Matches AI & CS interests", eligibility: "Computer Science students" },
      { title: "Finance Grant", reason: "Finance & Economics student", eligibility: "Finance/Accounting students" },
      { title: "Cloud Internship", reason: "Cloud computing focus", eligibility: "IT/IS students" }
    ];
    setMatches(fallback);

    //still save the fallback so you get the subcollection even if AI failed
    try {
      if (profileId) {
        await setDoc(doc(db, "profiles", profileId, "runs", "latest"), {
          createdAt: serverTimestamp(),
          results: fallback
        });
        console.log("Saved fallback runs/latest");
      }
    } catch (saveErr) {
      console.error("Failed to save fallback results:", saveErr);
    }
  } finally {
    setLoading(false);
  }
};

//load last function
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
    } else {
      alert("No saved recommendations yet for this profile.");
    }
  } catch (e) {
    console.error("Failed to load last recommendations:", e);
    alert("Could not load saved recommendations.");
  }
}

  ////////

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Save profile to Firestore
      const saved=await addDoc(collection(db, "profiles"), profile);
      console.log("New profileID:",saved.id)

      //saving id so we can load the runs later
      setCurrentProfileId(saved.id);

      // Call AI Studio / Gemini
      await fetchBursariesAI(profile,saved.id);

      
      setSubmitted(true);
    } catch (err) {
      console.error("Error saving profile:", err);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "auto", padding: 20 }}>
      <h1>Bursary Finder AI</h1>

      {!submitted && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input name="field" placeholder="Field of Study" onChange={handleChange} required />
          <input name="year" placeholder="Year of Study" onChange={handleChange} required />
          <input name="province" placeholder="Province" onChange={handleChange} required />
          <input name="gpa" placeholder="GPA / Average" onChange={handleChange} required />
          <input name="income" placeholder="Household Income" onChange={handleChange} required />
          <input name="interests" placeholder="Interests (comma separated)" onChange={handleChange} />
          <button type="submit">Find Bursaries</button>
          <button type="button" onClick={loadLast}>Load last saved recommendations</button>
        </form>
      )}

      {loading && <p>Loading AI bursaries...</p>}

      {submitted && !loading && (
        <div>
          <h2>Recommended Bursaries</h2>
          {matches.map((b, i) => (
            <div key={i} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10, borderRadius: 5 }}>
              <h3>{b.title}</h3>
              <p>{b.reason}</p>
              {b.eligibility && <p><strong>Eligibility:</strong> {b.eligibility}</p>}
              <a
              href={`https://www.google.com/search?q=${encodeURIComponent(b.title + " bursary South Africa")}`}
              target="_blank"
              rel="noreferrer"
>
              Apply / Learn more
              </a>

            </div>
          ))}
          <button onClick={() => { setSubmitted(false); setMatches([]); }}>Edit Profile</button>
          <button onClick={loadLast} style={{ marginLeft: 8 }}>Load last saved recommendations</button>
        </div>
      )}
    </div>
  );
}

export default App;
