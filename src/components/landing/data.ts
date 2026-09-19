export const PHONE = "9817897344";
export const PHONE2 = "7834010065";
export const ADDRESS = "Shop No. 26, Tibetan Market, Near Police Thana Sadar, Mandi, Himachal Pradesh 175001";
export const MAPS = "https://www.google.com/maps/search/?api=1&query=FOSLA%20Cybercafe%20Tibetan%20Market%20Mandi%20Himachal%20Pradesh";

export const chatLink = (text: string) => `https://wa.me/91${PHONE}?text=${encodeURIComponent(text)}`;

export const ROTATING = ["Government Jobs", "Exam Results", "Admit Cards", "Scholarships", "Admissions"];

export const TICKER = ["GOVT JOBS", "RESULTS", "ADMIT CARDS", "ANSWER KEYS", "SCHOLARSHIPS", "ADMISSIONS", "IGNOU", "HPU", "NSP", "eDISTRICT", "PRINT", "SCAN", "XEROX", "PASSPORT PHOTOS", "RESUME"];

export interface Service {
  icon: string;
  title: string;
  text: string;
  group: "gov" | "cafe";
}

export const SERVICES: Service[] = [
  { icon: "💼", title: "HP Government Jobs", text: "Latest Himachal Pradesh job updates, explained seat-wise", group: "gov" },
  { icon: "🎓", title: "Admission Portal", text: "College and technical admission applications", group: "gov" },
  { icon: "📚", title: "IGNOU", text: "Admission, assignments, grade card and more", group: "gov" },
  { icon: "🏫", title: "HPU", text: "Himachal Pradesh University services", group: "gov" },
  { icon: "🏆", title: "NSP Scholarships", text: "National Scholarship Portal registration and login", group: "gov" },
  { icon: "🏛️", title: "eDistrict", text: "Himachal Pradesh eDistrict certificates and services", group: "gov" },
  { icon: "📝", title: "Online Forms", text: "Form filling and submission, done right", group: "cafe" },
  { icon: "🖨️", title: "Print", text: "High quality colour and black & white printing", group: "cafe" },
  { icon: "📠", title: "Scan", text: "Document scanning and PDF creation", group: "cafe" },
  { icon: "📑", title: "Xerox", text: "Black & white and colour photocopy", group: "cafe" },
  { icon: "🌐", title: "Internet", text: "High speed internet services", group: "cafe" },
  { icon: "📋", title: "Lamination", text: "All size lamination services", group: "cafe" },
  { icon: "⌨️", title: "Typing", text: "Fast typing and document preparation", group: "cafe" },
  { icon: "🪪", title: "ID Cards", text: "All types of ID card services", group: "cafe" },
  { icon: "📷", title: "Passport Photos", text: "Instant passport-size photos", group: "cafe" },
  { icon: "📄", title: "Resume", text: "Professional resume / CV making", group: "cafe" },
];

export interface Portal {
  id: string;
  label: string;
  icon: string;
  blurb: string;
  links: { label: string; href: string }[];
}

// Links are exactly the ones on the FOSLA website.
export const PORTALS: Portal[] = [
  {
    id: "ignou", label: "IGNOU", icon: "📚", blurb: "Everything an IGNOU student needs, in one place.",
    links: [
      { label: "First year admission", href: "https://ignouadmission.samarth.edu.in/" },
      { label: "2nd & 3rd year admission", href: "https://ignou.samarth.edu.in/index.php/site/login" },
      { label: "Assignment question paper", href: "https://www.ignou.ac.in/studentService/download/assignments" },
      { label: "Admission status", href: "https://isms.ignou.ac.in/changeadmdata/AdmissionStatusNew.ASP" },
      { label: "Grade card", href: "https://gradecard.ignou.ac.in/" },
      { label: "Student degree apply", href: "https://onlineservices.ignou.ac.in/idms/" },
    ],
  },
  {
    id: "hpu", label: "HPU", icon: "🏫", blurb: "Himachal Pradesh University services.",
    links: [
      { label: "Himachal Pradesh University", href: "https://hpuniv.ac.in/" },
      { label: "ICDEOL & pre admission", href: "https://nadmissions.hpushimla.in/PreAdm/PA_OpenDegree.aspx" },
      { label: "HPU student portal", href: "https://nstudentportal.hpushimla.in/" },
      { label: "Notifications", href: "https://hpuniv.ac.in/innerpage/view_all_news.php" },
    ],
  },
  {
    id: "nsp", label: "NSP", icon: "🏆", blurb: "National Scholarship Portal.",
    links: [
      { label: "Student registration", href: "https://scholarships.gov.in/otrapplication/" },
      { label: "Student login", href: "https://scholarships.gov.in/ApplicationForm/login" },
      { label: "Scholarship eligibility", href: "https://scholarships.gov.in/scholarshipEligibility/" },
      { label: "Schemes on NSP", href: "https://scholarships.gov.in/All-Scholarships" },
    ],
  },
  {
    id: "admission", label: "Admissions", icon: "🎓", blurb: "College and technical admission portals.",
    links: [
      { label: "VGC Mandi", href: "https://admission.vgcmandi.co.in/" },
      { label: "GDC Kullu", href: "https://www.gckullu.ac.in/online_registration.aspx" },
      { label: "ITI, PAT, LEET, Pharmacy", href: "https://www.hptechboard.com/online-admission-2017" },
    ],
  },
  {
    id: "edistrict", label: "eDistrict", icon: "🏛️", blurb: "Himachal Pradesh eDistrict services.",
    links: [{ label: "eDistrict Himachal Pradesh", href: "https://www.edistrict.hp.gov.in/pages/staticSite/new_home.xhtml" }],
  },
];

export const STEPS = [
  { n: "01", title: "Join the channel", text: "One tap, free. Every new notification lands on your phone." },
  { n: "02", title: "Spot your job", text: "A clear poster and message: posts, seats by category, dates, fees." },
  { n: "03", title: "Message us", text: `WhatsApp or call ${PHONE}. We tell you exactly which documents to bring.` },
  { n: "04", title: "We fill your form", text: "Visit the shop. We fill and submit it properly, first time." },
];

export interface Checklist {
  id: string;
  label: string;
  icon: string;
  items: string[];
}

// Typical lists only; the page says so and we confirm the exact documents for each form.
export const CHECKLISTS: Checklist[] = [
  { id: "job", label: "Government job", icon: "💼", items: ["Aadhaar card", "Passport-size photo", "Signature (on white paper)", "10th, 12th & degree marksheets", "Category certificate (if any)", "HP Bonafide certificate (HP jobs)", "Mobile number & e-mail ID"] },
  { id: "scholarship", label: "Scholarship", icon: "🏆", items: ["Aadhaar card", "Bank passbook (Aadhaar-linked)", "Previous year marksheet", "Income certificate", "Category certificate (if any)", "Institute bonafide / fee receipt", "Passport-size photo"] },
  { id: "admission", label: "College admission", icon: "🎓", items: ["10th & 12th marksheets", "Aadhaar card", "Passport-size photo", "Signature (on white paper)", "Category certificate (if any)", "HP Bonafide certificate", "Mobile number & e-mail ID"] },
  { id: "ignou", label: "IGNOU", icon: "📚", items: ["Aadhaar card", "Qualification marksheets", "Passport-size photo", "Signature (on white paper)", "Category certificate (if any)", "Mobile number & e-mail ID"] },
];

export const ANATOMY = [
  { id: "seats", tab: "Post-wise seats", hint: "Every post and how many seats it has" },
  { id: "cats", tab: "Category seats", hint: "UR, SC, ST, OBC, EWS and more: see your own category" },
  { id: "dates", tab: "Dates & mode", hint: "Last date, application mode, pay" },
  { id: "links", tab: "Official links", hint: "Apply and notification links, no fake ones" },
];
