// src/App.js
import { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

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

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // Function to call Google AI Studio / Gemini
  const fetchBursariesAI = async (profile) => {
    setLoading(true);
    try {
      const prompt = `
You are an expert in South African bursaries and scholarships. 

Given this student profile, suggest exactly 3 bursaries. Return strictly valid JSON in this format:

[
  {
    "title": "Name of the bursary",
    "reason": "Why this bursary fits the student",
    "eligibility": "Eligibility criteria"
  }
]

Student profile: ${JSON.stringify(profile)}
      `;

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer YOUR_GOOGLE_API_KEY` // <-- Replace with your Gemini API key
          },
          body: JSON.stringify({
            prompt: prompt,
            temperature: 0.2,
            maxOutputTokens: 500
          })
        }
      );

      const data = await response.json();
      const outputText = data?.candidates?.[0]?.output || "[]";
      const aiResults = JSON.parse(outputText);

      setMatches(aiResults);

    } catch (err) {
      console.error("AI Studio error:", err);
      // Fallback for demo
      setMatches([
        { title: "Tech Scholarship", reason: "Matches AI & CS interests", eligibility: "CS students" },
        { title: "Finance Grant", reason: "Finance & Economics student", eligibility: "Finance/Accounting students" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Save profile to Firestore
      await addDoc(collection(db, "profiles"), profile);

      // Call AI Studio / Gemini
      await fetchBursariesAI(profile);

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
            </div>
          ))}
          <button onClick={() => { setSubmitted(false); setMatches([]); }}>Edit Profile</button>
        </div>
      )}
    </div>
  );
}

export default App;
