//inserting bursaries into 
import { collection, doc, writeBatch, Timestamp } from "firebase/firestore";


const DATA = [
  {
    title: "Sasol STEM Undergraduate Bursary",
    org: "Sasol Foundation",
    url: "https://www.sasolbursaries.com/stem-undergraduate",
    deadline: new Date("2025-11-30"),
    fields: ["Engineering", "Information Technology", "Chemical Science"],
    eligibleYears: [1, 2, 3, 4],
    provinces: ["Mpumalanga", "Gauteng", "Free State"],
    minAverage: 65,
    incomeCap: 600000,
    description: "Full funding for STEM degree students with good academic performance.",
    requirements: ["South African citizen", "Matric certificate", "Proof of income", "University acceptance"]
  },{
    title: "Standard Bank Group Bursary",
    org: "Standard Bank (via StudyTrust)",
    url: "https://studytrust.org.za/standardbank/",
    deadline: new Date("2025-09-30"),
    fields: ["Science", "Commerce", "Engineering", "Technology", "Mathematics"],
    eligibleYears: [1, 2, 3, 4],
    provinces: ["All"],
    minAverage: 65,
    incomeCap: null,
    description: "Comprehensive funding (tuition, living costs, devices, mentoring) for high-potential students.",
    requirements: ["South African citizen", "Financial need", "Strong academic results", "University acceptance/registration"]
  },
  {
    title: "Investec Tertiary Bursary Programme",
    org: "Investec",
    url: "https://www.investec.com/en_za/welcome-to-investec/sustainability/our-community/bursaries/tertiary-bursary-programme.html",
    deadline: new Date("2025-09-30"),
    fields: ["Commerce", "Engineering", "Information Technology", "Science", "Mathematics"],
    eligibleYears: [1, 2, 3, 4],
    provinces: ["All"],
    minAverage: 70,
    incomeCap: null,
    description: "Full bursary with mentorship and career readiness support for academically strong, financially needy students.",
    requirements: ["South African citizen", "≥70% English & Mathematics (not Maths Lit)", "Financial need", "University acceptance/registration"]
  },
  {
    title: "Old Mutual Actuarial Bursary",
    org: "Old Mutual",
    url: "https://www.oldmutual.co.za/careers/actuarial-bursary/",
    deadline: new Date("2025-09-30"),
    fields: ["Actuarial Science"],
    eligibleYears: [1, 2, 3, 4],
    provinces: ["All"],
    minAverage: 70,
    incomeCap: null,
    description: "Full actuarial bursary plus mentorship, vacation work and guaranteed employment on graduation.",
    requirements: ["South African citizen", "≥80% Mathematics; strong overall marks", "University acceptance/registration"]
  },
  {
    title: "Absa Fellowship Programme",
    org: "Absa",
    url: "https://absa-bsp.fundi.co.za/",
    deadline: new Date("2025-09-10"),
    fields: ["All (leadership & entrepreneurship focus)"],
    eligibleYears: [1, 2, 3],
    provinces: ["All"],
    minAverage: 65,
    incomeCap: null,
    description: "Scholarship-style fellowship supporting high-potential change-makers with funding and leadership development.",
    requirements: ["South African citizen", "Strong academic record", "Leadership potential", "University acceptance/registration"]
  },
  {
    title: "Momentum Metropolitan Actuarial Youth Bursary",
    org: "Momentum Metropolitan",
    url: "https://www.momentumgroupltd.co.za/about-us/actuarial-programmes",
    deadline: new Date("2025-09-07"),
    fields: ["Actuarial Science"],
    eligibleYears: [1, 2, 3],
    provinces: ["All"],
    minAverage: 70,
    incomeCap: null,
    description: "Full funding, mentorship and vacation work for aspiring actuaries.",
    requirements: ["South African citizen", "Strong Maths results", "University acceptance/registration"]
  },
   {
    title: "Eskom Engineering Bursary",
    org: "Eskom",
    url: "https://www.eskom.co.za/careers/students/",
    deadline: new Date("2025-01-29"),
    fields: ["Engineering (Electrical, Mechanical, Civil, Chemical, Industrial)"],
    eligibleYears: [1],
    provinces: ["All"],
    minAverage: 65,
    incomeCap: null,
    description: "First-year engineering bursary with a work-back/payback obligation.",
    requirements: ["South African citizen", "Matric with strong Maths & Science", "First-year engineering admission", "Agree to work-back/payback terms"]
  },
  {
    title: "Nedbank External Bursary Programme",
    org: "Nedbank",
    url: "https://group.nedbank.co.za/careers/graduates-and-bursaries.html",
    deadline: new Date("2025-08-31"),
    fields: ["STEM", "Green Economy", "Commerce (selected)"],
    eligibleYears: [1, 2, 3, 4],
    provinces: ["All"],
    minAverage: 65,
    incomeCap: null,
    description: "Need-based external bursary supporting SA students in priority fields.",
    requirements: ["South African citizen", "Proven financial need", "Good academic record", "University acceptance/registration"]
  },
  {
    title: "Funza Lushaka Bursary (Teaching)",
    org: "Department of Basic Education",
    url: "https://www.funzalushaka.doe.gov.za/",
    deadline: new Date("2025-01-26"),
    fields: ["Education (BEd, PGCE priority subjects)"],
    eligibleYears: [1, 2, 3, 4],
    provinces: ["All"],
    minAverage: 65,
    incomeCap: null,
    description: "Full-cost bursary for teacher education in priority subjects, with work-back in public schools.",
    requirements: ["South African citizen", "Admission into BEd/PGCE", "Willingness to teach at a public school (work-back)"]
  },
  {
    title: "SARB External Bursary Scheme (Economics)",
    org: "South African Reserve Bank",
    url: "https://www.resbank.co.za/en/home/publications/publication-detail-pages/bursary/2025/economics-bursary-2026",
    deadline: new Date("2025-09-30"),
    fields: ["Economics", "Econometrics", "Mathematical Statistics (economics-focused)"],
    eligibleYears: [1],
    provinces: ["All"],
    minAverage: 70,
    incomeCap: null,
    description: "Undergraduate bursary for aspiring economists with strong Matric results and financial need.",
    requirements: ["South African citizen", "≥70% Matric average (strong Maths)", "Financial need", "University provisional acceptance"]
  },
  {
    title: "Transnet Bursary",
    org: "Transnet",
    url: "https://www.transnet.net/YouthDevelopmentProgrammes",
    deadline: new Date("2025-10-06"),
    fields: ["Engineering", "Accounting", "Information Technology"],
    eligibleYears: [1, 2, 3, 4],
    provinces: ["All"],
    minAverage: 65,
    incomeCap: null,
    description: "Full-cost bursary with a work-back obligation in South Africa’s freight and logistics SOE.",
    requirements: ["South African citizen", "Good academic performance", "University acceptance/registration", "Willingness to complete work-back"]
  },
  {
    title: "SANRAL Bursary",
    org: "South African National Roads Agency (SANRAL)",
    url: "https://www.nra.co.za/uploads/30/Bursary%20brochure%202024_3%20fold_online-2.pdf",
    deadline: new Date("2025-09-30"),
    fields: ["Civil Engineering", "Built Environment", "Related STEM"],
    eligibleYears: [1, 2, 3, 4],
    provinces: ["All"],
    minAverage: 70,
    incomeCap: null,
    description: "Funding for studies relevant to South Africa’s national roads sector.",
    requirements: ["South African citizen", "Strong academic record (≈70%)", "Financial need", "University acceptance/registration"]
  },
  {
    title: "IDC External Bursary Scheme",
    org: "Industrial Development Corporation",
    url: "https://www.idc.co.za/bursaries/",
    deadline: new Date("2025-09-30"),
    fields: ["Finance", "Management", "Law", "Engineering", "STS", "Computer Science"],
    eligibleYears: [1, 2, 3],
    provinces: ["All"],
    minAverage: 70,
    incomeCap: 350000,
    description: "Bursary for unemployed youth studying full-time in eligible fields.",
    requirements: ["South African citizen", "Household income proof", "Matric results"]
  },
  {
    title: "Standard Bank Group Bursary",
    org: "Standard Bank",
    url: "https://www.standardbank.com/sbg/standard-bank-group/careers/early-careers/bursaries",
    deadline: new Date("2025-10-15"),
    fields: ["Commerce", "Finance", "Information Technology", "Economics", "Actuarial Science"],
    eligibleYears: [1, 2, 3, 4],
    provinces: ["Western Cape", "Gauteng", "KwaZulu-Natal"],
    minAverage: 65,
    incomeCap: 500000,
    description: "Bank offers tuition support, mentoring and other support for eligible students.",
    requirements: ["South African citizen", "Minimum average 65%", "Full-time student"]
  },
  {
    title: "CPUT Financial Aid Bursary Opportunities",
    org: "Cape Peninsula University of Technology",
    url: "https://www.cput.ac.za/undergraduate-financial-aid",
    deadline: new Date("2025-12-01"),
    fields: ["Built Environment", "Engineering", "Health Sciences"],
    eligibleYears: [1, 2, 3],
    provinces: ["Western Cape"],
    minAverage: 60,
    incomeCap: 400000,
    description: "CPUT offers bursaries for students with financial need and academic potential.",
    requirements: ["South African citizen", "Proof of residence", "Academic transcript", "Income verification"]
  },
  {
    title: "NSTF Available Undergraduate Bursaries",
    org: "NSTF",
    url: "https://nstf.org.za/available-bursaries-undergraduates/",
    deadline: new Date("2025-09-30"),
    fields: ["Science", "Technology", "Innovation"],
    eligibleYears: [1, 2, 3, 4],
    provinces: ["All"],
    minAverage: 60,
    incomeCap: 450000,
    description: "NSTF supports students in SET fields through trusted bursary programs.",
    requirements: ["South African citizen", "Studying SET discipline", "Proof of average"]
  },
  {
    title: "Amazon Recruitment Bursary via StudyTrust",
    org: "Amazon / StudyTrust",
    url: "https://studytrust.org.za/bursaries/amazon-recruitment",
    deadline: new Date("2025-09-30"),
    fields: ["Computer Science", "Information Systems", "Engineering"],
    eligibleYears: [1, 2, 3, 4],
    provinces: ["Gauteng", "Eastern Cape"],
    minAverage: 70,
    incomeCap: 550000,
    description: "Amazon and StudyTrust support students with promising tech careers.",
    requirements: ["South African citizen", "Minimum average 70%", "ICT/Engineering background", "University acceptance"]
  },
  {
    title: "Masakh’iSizwe Bursary Programme",
    org: "Western Cape Government",
    url: "https://www.westerncape.gov.za/bursaries-internships-and-learnerships",
    deadline: new Date("2025-11-15"),
    fields: ["Health", "Engineering", "Education", "Agriculture"],
    eligibleYears: [1, 2, 3],
    provinces: ["Western Cape"],
    minAverage: 60,
    incomeCap: 400000,
    description: "Provincial bursary for students pursuing priority professions in the Western Cape.",
    requirements: ["South African citizen", "Grade 12 results", "Provisional acceptance to study"]
  },
  {
    title: "Career Wise Corporate Bursary",
    org: "Career Wise",
    url: "https://careerwise.co.za",
    deadline: new Date("2025-10-31"),
    fields: ["Business", "Commerce", "IT"],
    eligibleYears: [2, 3, 4],
    provinces: ["Gauteng"],
    minAverage: 65,
    incomeCap: 500000,
    description: "Corporate bursaries for students in commerce, IT & business with strong leadership potential.",
    requirements: ["South African citizen", "At least second year", "Academic transcript", "Leadership or community involvement"]
  }
];

export default async function seedOpportunities(db) {
  const batch = writeBatch(db);
  const colRef = collection(db, "opportunities");

  DATA.forEach(item => {
    const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const ref = doc(colRef, slug); // deterministic id avoids duplicates on re-run
    batch.set(ref, {
      ...item,
      // convert ISO strings to Firestore Timestamp
       deadline: Timestamp.fromDate(item.deadline instanceof Date ? item.deadline : new Date(item.deadline)),
    }, { merge: true });
  });

  await batch.commit();
}
