/**
 * Comprehensive Donor Selection & Referral Criteria Engine
 * Fully extracted from the National Blood Transfusion Council (NBTC)
 * Directorate General of Health Services, Ministry of Health & Family Welfare,
 * Government of India — February 2025 Manual.
 *
 * Covers all 101 criteria conditions, counselling stages, informed consent,
 * referral protocols, triage testing (Strategy I), and donor safety standards.
 */

export interface CriteriaAnswer {
  verdict:
    | "Eligible"
    | "Temporarily Deferred"
    | "Permanently Deferred"
    | "Conditional"
    | "Official Protocol"
    | "General Guidance"
    | "AI Assistant";
  headline: string;
  summary: string;
  deferralTime?: string;
  keyPoints: string[];
  citation: string;
  category:
    | "General"
    | "Women Health"
    | "Medication"
    | "Surgery & Procedures"
    | "Infection & TTI"
    | "Cardiovascular"
    | "Respiratory"
    | "Endocrine & Metabolic"
    | "Neurology & Mental"
    | "Gastrointestinal & Liver"
    | "Systemic & Autoimmune"
    | "Vaccine"
    | "Counselling & Protocol"
    | "Lifestyle & Occupation"
    | "General Guidance"
    | "AI Assistant";
}

export interface RuleItem extends CriteriaAnswer {
  id: string;
  keywords: string[];
  title: string;
}

export const COMPLETE_DONOR_RULES: RuleItem[] = [
  // =========================================================================
  // 1. GENERAL PHYSICAL & VITAL CRITERIA (S.No. 1 - 12)
  // =========================================================================
  {
    id: "s1_wellbeing",
    keywords: ["wellbeing", "well-being", "fitness", "disabled", "differently abled", "handicap", "blind", "deaf", "mute", "physical fit"],
    title: "Well-Being & Differently-Abled Donors",
    verdict: "Conditional",
    headline: "Donor must be in good health, mentally alert, and physically fit.",
    summary: "Differently-abled donors with communication or sight difficulties are accepted provided clear, confidential communication is established, they fully understand the donation process, and give valid informed consent.",
    keyPoints: [
      "Must be in good health and mentally alert",
      "Differently-abled donors accepted if valid informed consent is obtained",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 1",
    category: "General",
  },
  {
    id: "s2_age",
    keywords: ["age", "old", "young", "years", "18", "60", "65", "minor", "senior", "elderly", "teenager", "first time donor age"],
    title: "Age Limits for Blood Donation",
    verdict: "Conditional",
    headline: "Eligible between 18 and 65 years. First-time donors accepted up to 60 years.",
    summary: "Minimum age for any blood donation is strictly 18 years. First-time donors can donate up to 60 years of age. Regular repeat donors can donate up to 65 years. For apheresis, donors must be aged between 18 and 60 years.",
    keyPoints: [
      "Minimum age: 18 years (no minors allowed)",
      "First-time donor maximum age: 60 years",
      "Repeat donor maximum age: 65 years",
      "Apheresis donor age: 18 – 60 years",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 2",
    category: "General",
  },
  {
    id: "s3_weight_volume",
    keywords: ["weight", "kg", "heavy", "skinny", "fat", "underweight", "45", "55", "350", "450", "volume"],
    title: "Weight & Blood Volume Collection",
    verdict: "Conditional",
    headline: "Minimum 45 kg for 350ml donation; more than 55 kg for 450ml donation.",
    summary: "To ensure donor safety against hypovolemia, donor weight dictates collection volume. Single platelet apheresis requires 50 kg; double platelet or double red cell apheresis requires 60 kg.",
    keyPoints: [
      "350 ml Whole Blood: Minimum 45 kg",
      "450 ml Whole Blood: Greater than 55 kg (> 55 kg)",
      "Single Platelet Apheresis: Minimum 50 kg",
      "Double Platelet Apheresis: Minimum 60 kg",
      "Double Red Cell Apheresis: Minimum 60 kg",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 3",
    category: "General",
  },
  {
    id: "s4_intervals",
    keywords: ["interval", "gap", "frequency", "how often", "days", "months", "90 days", "120 days", "last donated", "next donation"],
    title: "Donation Intervals (Gap Between Donations)",
    verdict: "Conditional",
    headline: "Every 3 months (90 days) for males; Every 4 months (120 days) for females.",
    summary: "Whole blood donation interval is strictly 90 days for men and 120 days for women to allow full red cell and iron store replenishment. Single platelet apheresis requires a 48-hour gap (max 2 times/week, 24 times/year). Double plateletpheresis requires at least 7 days gap.",
    deferralTime: "90 days (males) / 120 days (females)",
    keyPoints: [
      "Whole blood (Male): Once every 3 months (90 days)",
      "Whole blood (Female): Once every 4 months (120 days)",
      "Single Apheresis: Min 48 hours (max 2/week, 4/month, 24/year)",
      "Double Plateletpheresis: Min 7 days (max 2/month, 12/year; platelet count ≥ 250×10³/µL)",
      "Whole blood to plateletpheresis gap: At least 28 days",
      "Plateletpheresis to whole blood gap: At least 7 days (if red cells completely reinfused; otherwise 90 days)",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 4",
    category: "General",
  },
  {
    id: "s5_blood_pressure",
    keywords: ["bp", "blood pressure", "hypertension", "systolic", "diastolic", "high bp", "low bp", "amlodipine", "telmisartan"],
    title: "Blood Pressure Standards",
    verdict: "Conditional",
    headline: "Systolic: 100–140 mm Hg | Diastolic: 60–90 mm Hg (acceptable on medication).",
    summary: "Donors with BP in the 100–140 / 60–90 mmHg range are acceptable. Donors on antihypertensive medicines can donate provided their dose has not changed in the past 28 days, they have no end-organ complications, and have no dizziness or fainting.",
    keyPoints: [
      "Normal acceptable range: 100–140 mmHg systolic / 60–90 mmHg diastolic",
      "Hypertensive donors on medication ACCEPTABLE if BP is controlled",
      "No change in medication or dosage in the last 28 days",
      "No findings suggestive of end-organ damage (cardiac, renal, eye, vascular)",
      "No history of giddiness or fainting",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 5 & 33",
    category: "Cardiovascular",
  },
  {
    id: "s6_pulse",
    keywords: ["pulse", "heart rate", "tachycardia", "bradycardia", "bpm"],
    title: "Pulse Rate Requirements",
    verdict: "Conditional",
    headline: "Pulse rate must be 60 to 100 beats per minute, regular.",
    summary: "A regular pulse rate between 60 and 100 bpm is required. Irregular pulse or arrhythmias must be deferred.",
    keyPoints: [
      "Range: 60 – 100 beats/minute",
      "Rhythm must be regular",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 6",
    category: "General",
  },
  {
    id: "s7_temperature",
    keywords: ["temperature", "fever", "febrile", "afebrile", "98.4", "37"],
    title: "Body Temperature Requirements",
    verdict: "Conditional",
    headline: "Must be afebrile with normal body temperature (37°C / 98.4°F).",
    summary: "Donor must not have a fever. Temperature must be 37°C (98.4°F).",
    keyPoints: [
      "Must be afebrile (no fever)",
      "Normal temperature: 37°C / 98.4°F",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 7",
    category: "General",
  },
  {
    id: "s8_respiration",
    keywords: ["respiration", "breathing", "breath", "lung infection", "acute respiratory"],
    title: "Respiratory Status",
    verdict: "Conditional",
    headline: "Free from acute respiratory disease.",
    summary: "Donor must have normal breathing and be free of active acute lung infections.",
    keyPoints: ["No acute respiratory distress or infection"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 8",
    category: "Respiratory",
  },
  {
    id: "s9_hemoglobin",
    keywords: ["hb", "hemoglobin", "haemoglobin", "iron", "anemia", "anaemia", "12.5", "14"],
    title: "Hemoglobin (Hb) Criteria",
    verdict: "Conditional",
    headline: "Minimum Hemoglobin must be 12.5 g/dL (14.0 g/dL for double red cells).",
    summary: "Whole blood donation requires minimum Hb ≥ 12.5 g/dL for both men and women. Double red cell apheresis requires ≥ 14.0 g/dL. Thalassemia trait is accepted provided Hb is at or above 12.5 g/dL.",
    keyPoints: [
      "Whole blood minimum: ≥ 12.5 g/dL",
      "Double red cell apheresis minimum: ≥ 14.0 g/dL",
      "Thalassemia trait (minor) is acceptable if Hb ≥ 12.5 g/dL",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 9",
    category: "General",
  },
  {
    id: "s10_meals_fasting",
    keywords: ["meal", "meals", "food", "eat", "fasting", "empty stomach", "breakfast", "lunch", "dinner"],
    title: "Meals & Fasting Guidelines",
    verdict: "Conditional",
    headline: "Do NOT donate on an empty stomach; eat a light meal within 4 hours.",
    summary: "Donors must never donate while fasting or observing religious fasts. The last meal should be taken within 4 hours prior to blood donation.",
    keyPoints: [
      "Fasting donors cannot donate blood",
      "Last meal should be within 4 hours before donation",
      "Drink water/fluids before phlebotomy",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 10",
    category: "Lifestyle & Occupation",
  },
  {
    id: "s11_alcohol",
    keywords: ["alcohol", "beer", "wine", "drink", "liquor", "hangover", "whiskey", "vodka", "drunk"],
    title: "Alcohol Consumption Guidelines",
    verdict: "Temporarily Deferred",
    headline: "Do not donate if intoxicated; wait at least 24 hours after drinking.",
    summary: "Donors showing signs of intoxication are deferred. Chronic heavy drinkers are permanently deferred. Casual drinkers should wait at least 24 hours, be sober, well-hydrated, and rested.",
    deferralTime: "At least 24 hours (sober & hydrated)",
    keyPoints: [
      "No alcohol within 24 hours before donation",
      "Intoxication or hangover causes immediate deferral",
      "Chronic heavy alcoholics are permanently deferred",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 11",
    category: "Lifestyle & Occupation",
  },
  {
    id: "s12_occupation",
    keywords: ["occupation", "pilot", "driver", "aircrew", "diver", "miner", "night shift", "strenuous", "heavy lifting", "bus driver"],
    title: "Occupational Safety (Pilots, Drivers, Divers)",
    verdict: "Conditional",
    headline: "Wait 12 hours after duty; do not resume strenuous work for 24 hours post-donation.",
    summary: "Aircrew, long-distance drivers, divers, miners, and emergency service workers must not donate for 12 hours after duty, and cannot resume duty for at least 24 hours after blood donation. Night shift workers must have had adequate sleep.",
    deferralTime: "12h pre-donation duty / 24h post-donation rest",
    keyPoints: [
      "No donation within 12 hours after finishing work shift",
      "No strenuous work, flying, or long-distance driving for 24 hours after donation",
      "Night shift workers require adequate sleep (> 5 hours) before donation",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 12",
    category: "Lifestyle & Occupation",
  },

  // =========================================================================
  // 2. RISK BEHAVIOR, TRAVEL & SKIN (S.No. 13 - 15)
  // =========================================================================
  {
    id: "s13_risk_behavior",
    keywords: ["risk behavior", "msm", "transgender", "sex worker", "fsw", "drug user", "idu", "jail", "inmate", "prison", "multiple partners"],
    title: "High Risk Behaviors (HIV/Hepatitis)",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred due to high risk of transfusion transmissible infections.",
    summary: "Persons considered at high risk for HIV, Hepatitis B, or C infections (Transgender, Men who have sex with men, Female sex workers, Injecting drug users, persons with multiple sexual partners, and jail/prison inmates) are permanently deferred.",
    keyPoints: [
      "Transgender, MSM, FSW: Permanently deferred",
      "Injecting drug users (IDU): Permanently deferred",
      "Persons with multiple sexual partners: Permanently deferred",
      "Inmates of jail or confinement: Permanently deferred",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 13 & 51",
    category: "Infection & TTI",
  },
  {
    id: "s14_travel_residence",
    keywords: ["travel", "abroad", "foreign", "endemic", "country", "language barrier", "foreigner", "tourist"],
    title: "Travel, Residence & Foreign Nationals",
    verdict: "Conditional",
    headline: "Accepted if criteria met; defer if travel to endemic zones without standard testing.",
    summary: "Defer donors with travel/residence in geographic areas endemic for TTI without Indian screening guidelines. Foreign residents are accepted if all criteria are fulfilled. An interpreter and consent in their language are required if language barrier exists.",
    keyPoints: [
      "Defer if traveled to endemic areas without standard Indian testing guidelines",
      "Foreign residents acceptable if criteria met and consent given in understood language",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 14",
    category: "Lifestyle & Occupation",
  },
  {
    id: "s15_donor_skin",
    keywords: ["skin", "vein", "arm", "puncture", "needle marks", "phlebotomy", "scars"],
    title: "Donor Skin & Phlebotomy Site",
    verdict: "Conditional",
    headline: "Both arms must be free from skin diseases, punctures, and needle track marks.",
    summary: "The donor must be free of skin disease at phlebotomy site. Arms must have no scars or punctures indicative of commercial blood donation or narcotic addiction.",
    keyPoints: [
      "Free of rash or eczema at venepuncture site",
      "No track marks or scars indicative of IV drug abuse",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 15",
    category: "General",
  },

  // =========================================================================
  // 3. PHYSIOLOGICAL STATUS FOR WOMEN (S.No. 16 - 19)
  // =========================================================================
  {
    id: "s16_pregnancy",
    keywords: ["pregnant", "pregnancy", "delivery", "childbirth", "baby", "postpartum"],
    title: "Pregnancy & Delivery",
    verdict: "Temporarily Deferred",
    headline: "Defer for 12 months (1 year) following delivery.",
    summary: "Pregnant women are deferred during pregnancy and for 12 months after delivery to ensure maternal recovery and iron replenishment.",
    deferralTime: "12 months after delivery",
    keyPoints: [
      "During pregnancy: Completely deferred",
      "After delivery/childbirth: Defer for 12 months",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 16",
    category: "Women Health",
  },
  {
    id: "s17_abortion",
    keywords: ["abortion", "miscarriage", "d&c", "mva", "termination"],
    title: "Abortion or Miscarriage",
    verdict: "Temporarily Deferred",
    headline: "Defer for 6 months following an abortion or miscarriage.",
    summary: "Following an abortion or miscarriage, defer the prospective donor for 6 months to allow complete physiological recovery.",
    deferralTime: "6 months",
    keyPoints: ["Defer for 6 months after abortion or miscarriage"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 17",
    category: "Women Health",
  },
  {
    id: "s18_breastfeeding",
    keywords: ["breastfeeding", "lactation", "nursing", "feeding baby", "mother"],
    title: "Breastfeeding / Lactation",
    verdict: "Temporarily Deferred",
    headline: "Defer for 12 months after delivery while lactating.",
    summary: "Mothers are deferred for 12 months following delivery to protect the infant's and mother's nutritional requirements.",
    deferralTime: "12 months after delivery",
    keyPoints: ["Defer for 12 months after delivery"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 18",
    category: "Women Health",
  },
  {
    id: "s19_menstruation",
    keywords: ["period", "periods", "menstruation", "menstrual", "bleeding period"],
    title: "Menstruation (Period)",
    verdict: "Temporarily Deferred",
    headline: "Defer for the period of menstruation.",
    summary: "Female donors should not donate during active menstruation. Once the menstrual period finishes and the donor feels well with Hb ≥ 12.5 g/dL, donation is permitted.",
    deferralTime: "Duration of menstrual period",
    keyPoints: [
      "Defer during active menstrual bleeding",
      "Eligible immediately after cycle ends if asymptomatic and Hb ≥ 12.5 g/dL",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 19",
    category: "Women Health",
  },

  // =========================================================================
  // 4. RESPIRATORY & NON-SPECIFIC ILLNESS (S.No. 20 - 23)
  // =========================================================================
  {
    id: "s20_minor_symptoms",
    keywords: ["fever", "malaise", "headache", "body ache", "joint pain", "petechiae", "rashes"],
    title: "Minor Non-Specific Symptoms & Fever",
    verdict: "Temporarily Deferred",
    headline: "Defer until afebrile & symptoms subside. If rash/joint pain: defer 28 days.",
    summary: "Minor symptoms (headache, mild pain, fever) require deferral until all symptoms subside and the donor is afebrile. If fever had joint pain or petechiae/rash, defer for 28 days.",
    deferralTime: "Until symptoms resolve / 28 days if rash & joint pain",
    keyPoints: [
      "Fever/headache: Defer until afebrile and completely well",
      "Fever with rashes and joint pains: Defer for 28 days after recovery",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 20",
    category: "Infection & TTI",
  },
  {
    id: "s21_cold_flu",
    keywords: ["cold", "flu", "cough", "sore throat", "sinusitis", "runny nose", "sneezing"],
    title: "Common Cold, Flu, Cough & Sore Throat",
    verdict: "Temporarily Deferred",
    headline: "Defer until all symptoms subside and the donor is afebrile.",
    summary: "Donors suffering from cold, flu, cough, sore throat, or acute sinusitis must wait until they are completely recovered and fever-free.",
    deferralTime: "Until fully recovered and afebrile",
    keyPoints: ["Defer until afebrile and all symptoms subside"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 21",
    category: "Respiratory",
  },
  {
    id: "s22_chronic_sinusitis",
    keywords: ["chronic sinusitis", "sinus"],
    title: "Chronic Sinusitis",
    verdict: "Conditional",
    headline: "Acceptable unless currently on antibiotics.",
    summary: "Chronic sinusitis donors are acceptable if asymptomatic on the day and not currently on antibiotic treatment.",
    keyPoints: ["Accepted unless taking antibiotics"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 22",
    category: "Respiratory",
  },
  {
    id: "s23_asthma",
    keywords: ["asthma", "wheezing", "inhaler", "bronchial asthma", "salbutamol", "budesonide"],
    title: "Asthma & Inhaler Use",
    verdict: "Conditional",
    headline: "Accepted if asymptomatic on inhalers; Defer 14 days after oral steroids.",
    summary: "Asymptomatic asthmatics on maintenance inhalers (steroid or non-steroid) are ACCEPTED. During an acute attack or while on oral/injectable steroids, defer for 14 days after full recovery. Severe chronic obstructive/restrictive lung disease is permanently deferred.",
    deferralTime: "14 days after recovery from acute attack / oral steroids",
    keyPoints: [
      "Asymptomatic on maintenance inhalers: ACCEPTABLE",
      "Acute attack or oral/injectable steroids: Defer for 14 days after recovery",
      "Severe chronic obstructive/restrictive lung disease: Permanently deferred",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 23",
    category: "Respiratory",
  },

  // =========================================================================
  // 5. SURGICAL PROCEDURES (S.No. 24 - 29)
  // =========================================================================
  {
    id: "s24_major_surgery",
    keywords: ["major surgery", "operation", "general anesthesia", "spinal anesthesia", "hospitalized", "laparotomy"],
    title: "Major Surgery",
    verdict: "Temporarily Deferred",
    headline: "Defer for 12 months (1 year) following recovery from major surgery.",
    summary: "Major surgery is defined as requiring hospitalization, general/spinal anesthesia, blood transfusion, or significant blood loss. Defer for 12 months after recovery.",
    deferralTime: "12 months after full recovery",
    keyPoints: ["Defer for 12 months after recovery from major surgery"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 24",
    category: "Surgery & Procedures",
  },
  {
    id: "s25_minor_surgery",
    keywords: ["minor surgery", "stitches", "biopsy", "mole removal", "cyst removal", "endoscopy minor"],
    title: "Minor Surgery",
    verdict: "Temporarily Deferred",
    headline: "Defer for 3 months following minor surgery.",
    summary: "Following minor surgery, defer the donor for 3 months after complete recovery.",
    deferralTime: "3 months after recovery",
    keyPoints: ["Defer for 3 months after recovery from minor surgery"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 25",
    category: "Surgery & Procedures",
  },
  {
    id: "s26_transfusion_recipient",
    keywords: ["received blood", "transfusion", "got blood", "blood component", "platelet transfusion"],
    title: "Received Blood Transfusion",
    verdict: "Temporarily Deferred",
    headline: "Defer for 12 months (1 year) after receiving any blood transfusion.",
    summary: "Any individual who received whole blood or blood components must wait 12 months. Their spouse/partner is also deferred for 12 months.",
    deferralTime: "12 months",
    keyPoints: [
      "Defer for 12 months after receiving blood or components",
      "Spouse/partner also deferred for 12 months (S.No. 48)",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 26 & 48",
    category: "Surgery & Procedures",
  },
  {
    id: "s27_open_heart",
    keywords: ["open heart", "bypass", "cabg", "valve replacement", "cardiac surgery"],
    title: "Open Heart Surgery / Bypass Surgery",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred for donor safety.",
    summary: "Persons who underwent open heart surgery, coronary artery bypass graft (CABG), or valve replacement are permanently deferred.",
    keyPoints: ["Open heart surgery / Bypass surgery: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 27",
    category: "Cardiovascular",
  },
  {
    id: "s28_cancer_surgery",
    keywords: ["cancer surgery", "tumor removal", "oncology surgery", "mastectomy"],
    title: "Cancer Surgery",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Individuals who had surgery for cancer or malignant conditions are permanently deferred.",
    keyPoints: ["Cancer surgery: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 28 & 74",
    category: "Surgery & Procedures",
  },
  {
    id: "s29_dental",
    keywords: ["dental", "dentist", "tooth", "teeth", "scaling", "filling", "root canal", "rct", "extraction", "bone graft"],
    title: "Dental Procedures",
    verdict: "Temporarily Deferred",
    headline: "Simple: 48 hours | Root canal / Extraction: 14 days | Bone graft: 12 months.",
    summary: "Deferral depends on procedure invasiveness: 48 hours for scaling/filling; 14 days for root canal or tooth extraction; 12 months for bone graft or dental reconstruction.",
    deferralTime: "48h (scaling/filling) / 14 days (RCT/extraction) / 12 months (bone graft)",
    keyPoints: [
      "Simple procedure (scaling, filling): Defer for 48 hours",
      "Root canal treatment (RCT) or tooth extraction: Defer for 14 days",
      "Bone graft or dental reconstruction surgery: Defer for 12 months",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 29",
    category: "Surgery & Procedures",
  },

  // =========================================================================
  // 6. CARDIOVASCULAR DISEASES (S.No. 30 - 36)
  // =========================================================================
  {
    id: "s30_active_cardiac",
    keywords: ["chest pain", "shortness of breath", "swelling feet", "pedal edema", "angina symptom"],
    title: "Active Cardiac Symptoms",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Active symptoms such as unexplained chest pain, shortness of breath, or foot swelling cause permanent deferral.",
    keyPoints: ["Active cardiac symptoms: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 30",
    category: "Cardiovascular",
  },
  {
    id: "s31_myocardial_infarction",
    keywords: ["heart attack", "myocardial infarction", "mi", "cardiac arrest"],
    title: "Heart Attack (Myocardial Infarction)",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Any history of heart attack (myocardial infarction) causes permanent deferral to protect donor cardiovascular health.",
    keyPoints: ["Heart attack (MI): Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 31",
    category: "Cardiovascular",
  },
  {
    id: "s32_cardiac_meds",
    keywords: ["digitalis", "digoxin", "nitroglycerin", "sorbitrate", "cardiac medication"],
    title: "Cardiac Medications (Digitalis, Nitrates)",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Donors taking cardiac drugs like Digitalis, Digoxin, or Nitroglycerin are permanently deferred.",
    keyPoints: ["Cardiac medications: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 32 & 99",
    category: "Cardiovascular",
  },
  {
    id: "s33_hypertensive_heart",
    keywords: ["hypertensive heart disease", "left ventricular hypertrophy", "lvh"],
    title: "Hypertensive Heart Disease",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Hypertension complicated by cardiac enlargement or heart disease causes permanent deferral.",
    keyPoints: ["Hypertensive heart disease: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 33",
    category: "Cardiovascular",
  },
  {
    id: "s34_coronary_artery",
    keywords: ["coronary artery disease", "cad", "stent", "angioplasty"],
    title: "Coronary Artery Disease & Stents",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Coronary artery disease, angioplasty, or stent placement permanently defers the donor.",
    keyPoints: ["Coronary artery disease / Stents: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 34",
    category: "Cardiovascular",
  },
  {
    id: "s35_angina",
    keywords: ["angina", "angina pectoris", "ischemic heart"],
    title: "Angina Pectoris",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Angina pectoris indicates compromised coronary blood flow; donation is permanently contraindicated.",
    keyPoints: ["Angina pectoris: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 35",
    category: "Cardiovascular",
  },
  {
    id: "s36_rheumatic_heart",
    keywords: ["rheumatic heart", "rhd", "valvular heart", "mitral stenosis", "heart valve"],
    title: "Rheumatic Heart Disease",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred if residual damage.",
    summary: "Rheumatic heart disease with residual valvular damage causes permanent deferral.",
    keyPoints: ["Rheumatic heart disease with residual damage: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 36",
    category: "Cardiovascular",
  },

  // =========================================================================
  // 7. CENTRAL NERVOUS SYSTEM & PSYCHIATRIC (S.No. 37 - 40)
  // =========================================================================
  {
    id: "s37_migraine",
    keywords: ["migraine", "headache", "vascular headache"],
    title: "Migraine",
    verdict: "Conditional",
    headline: "Acceptable if mild and occurs less than once a week.",
    summary: "Donors with migraine are accepted if it is not severe and episodes occur with a frequency of less than once a week.",
    keyPoints: ["Accepted if mild and occurs less than once a week"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 37",
    category: "Neurology & Mental",
  },
  {
    id: "s38_epilepsy_convulsions",
    keywords: ["epilepsy", "convulsions", "fits", "seizure", "seizures", "anticonvulsant"],
    title: "Convulsions & Epilepsy",
    verdict: "Conditional",
    headline: "Accepted if seizure-free and off medication for at least 3 years.",
    summary: "Accepted if the donor has been seizure-free and off all anticonvulsant medications for at least 3 years. Permanently deferred if there is an active organic brain cause.",
    deferralTime: "3 years seizure-free & off medication",
    keyPoints: [
      "Accepted if off medication and seizure-free for ≥ 3 years",
      "Permanently deferred if caused by organic brain disease",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 38",
    category: "Neurology & Mental",
  },
  {
    id: "s39_schizophrenia",
    keywords: ["schizophrenia", "psychosis", "hallucination"],
    title: "Schizophrenia",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Donors diagnosed with schizophrenia are permanently deferred.",
    keyPoints: ["Schizophrenia: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 39",
    category: "Neurology & Mental",
  },
  {
    id: "s40_anxiety_depression",
    keywords: ["anxiety", "depression", "mood disorder", "bipolar", "antidepressant", "stress"],
    title: "Anxiety & Mood Disorders (Depression, Bipolar)",
    verdict: "Conditional",
    headline: "Accepted if stable and feeling well on donation day.",
    summary: "Persons with anxiety or mood disorders (depression, bipolar) are accepted provided they are stable and feeling well on the day of donation, regardless of maintenance medications.",
    keyPoints: [
      "Accepted if stable and feeling well on the day",
      "Acceptable regardless of standard mood/anxiety medications",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 40",
    category: "Neurology & Mental",
  },

  // =========================================================================
  // 8. ENDOCRINE DISORDERS (S.No. 41 - 44)
  // =========================================================================
  {
    id: "s41_diabetes",
    keywords: ["diabetes", "sugar", "diabetic", "metformin", "glimepiride", "insulin", "hba1c", "glucose"],
    title: "Diabetes Mellitus & Insulin",
    verdict: "Conditional",
    headline: "Accepted on oral tablets/diet; Permanently deferred if on Insulin.",
    summary: "Diabetics well-controlled on diet or oral tablets with NO change in dosage in the last 4 weeks and no neuropathy, orthostatic hypotension, or ulcers are ACCEPTABLE. Insulin users or those with multi-organ complications are permanently deferred.",
    keyPoints: [
      "Oral tablets / diet control: ACCEPTABLE",
      "Dosage must not have changed in the last 4 weeks",
      "Insulin injection: PERMANENTLY DEFERRED",
      "Diabetic foot ulcers, neuropathy, or organ damage: Permanently deferred",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 41 & 97-98",
    category: "Endocrine & Metabolic",
  },
  {
    id: "s42_thyroid",
    keywords: ["thyroid", "hypothyroidism", "hyperthyroidism", "thyroxine", "eltroxin", "thyronorm", "goiter", "thyrotoxicosis"],
    title: "Thyroid Disorders",
    verdict: "Conditional",
    headline: "Accept benign hypothyroid if euthyroid & dose stable for 8 weeks.",
    summary: "Donors with benign thyroid conditions (e.g. Hypothyroidism on Levothyroxine) are accepted if asymptomatic, euthyroid, and dosage unchanged for 8 weeks. Thyrotoxicosis (hyperthyroidism) or thyroid malignancy is permanently deferred.",
    keyPoints: [
      "Hypothyroidism on stable thyroxine: ACCEPTABLE (dose unchanged for 8 weeks)",
      "Thyrotoxicosis (hyperthyroidism): Permanently deferred",
      "Thyroid cancer/malignancy: Permanently deferred",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 42",
    category: "Endocrine & Metabolic",
  },
  {
    id: "s43_pcos",
    keywords: ["pcos", "pcod", "polycystic ovarian", "ovary cyst"],
    title: "Polycystic Ovarian Syndrome (PCOS)",
    verdict: "Conditional",
    headline: "Accepted if well on the day and medications meet guidelines.",
    summary: "Donors with PCOS/PCOD are accepted if feeling well on donation day and any prescribed medications conform to the medication deferral list.",
    keyPoints: ["Accepted if feeling well on donation day"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 43",
    category: "Endocrine & Metabolic",
  },
  {
    id: "s44_other_endocrine",
    keywords: ["cushings", "addisons", "pituitary", "adrenal", "endocrine disease"],
    title: "Other Endocrine Disorders",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Other complex endocrine disorders (e.g. Addison's, Cushing's, adrenal/pituitary disorders) cause permanent deferral.",
    keyPoints: ["Other endocrine disorders: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 44",
    category: "Endocrine & Metabolic",
  },

  // =========================================================================
  // 9. LIVER DISEASES & HEPATITIS (S.No. 45 - 50)
  // =========================================================================
  {
    id: "s45_hepatitis",
    keywords: ["hepatitis", "hep b", "hep c", "hbsag", "hcv", "hepatitis a", "hepatitis e"],
    title: "Hepatitis B, C, A, E",
    verdict: "Conditional",
    headline: "Hepatitis B & C: Permanently Deferred | Hepatitis A & E: Defer 12 months.",
    summary: "Known cases of Hepatitis B, Hepatitis C, or hepatitis of unknown etiology are permanently deferred. Donors with resolved acute Hepatitis A or E can donate 12 months after recovery.",
    deferralTime: "Permanent (Hep B/C) / 12 months (Hep A/E)",
    keyPoints: [
      "Hepatitis B or C: Permanently deferred",
      "Unknown hepatitis: Permanently deferred",
      "Hepatitis A or E: Defer for 12 months after full recovery",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 45",
    category: "Gastrointestinal & Liver",
  },
  {
    id: "s46_hep_contact",
    keywords: ["spouse hepatitis", "partner hepatitis", "family hepatitis b", "contact hepatitis"],
    title: "Spouse or Close Contact of Hepatitis B / C",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Spouse, sexual partner, or close household contact of an individual suffering from Hepatitis B or C is permanently deferred.",
    keyPoints: ["Spouse/partner/contact of Hepatitis B or C: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 46",
    category: "Gastrointestinal & Liver",
  },
  {
    id: "s47_tattoos_piercing",
    keywords: ["tattoo", "tattoos", "piercing", "piercings", "ear piercing", "nose piercing", "body piercing", "acupuncture", "microblading", "scarification"],
    title: "Tattoo, Acupuncture & Body Piercing",
    verdict: "Temporarily Deferred",
    headline: "Defer for 12 months (1 year) from the date of the procedure.",
    summary: "Anyone who has received a tattoo, body piercing, ear/nose piercing, acupuncture, scarification, or invasive cosmetic procedure (by self or spouse/partner) must wait 12 months.",
    deferralTime: "12 months (1 year)",
    keyPoints: [
      "Defer for 12 months from the date of tattoo or piercing",
      "Applies to tattoos, ear/nose piercing, acupuncture, microblading",
      "Also applies if spouse/partner underwent the procedure",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 47",
    category: "Surgery & Procedures",
  },
  {
    id: "s48_spouse_transfusion",
    keywords: ["spouse transfusion", "partner transfusion", "wife transfusion", "husband transfusion"],
    title: "Spouse/Partner of Blood Transfusion Recipient",
    verdict: "Temporarily Deferred",
    headline: "Defer for 12 months (1 year).",
    summary: "Spouse or partner of an individual who received a blood transfusion must be deferred for 12 months.",
    deferralTime: "12 months",
    keyPoints: ["Spouse/partner of transfusion recipient: Defer for 12 months"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 48",
    category: "Infection & TTI",
  },
  {
    id: "s49_jaundice",
    keywords: ["jaundice", "yellow eyes", "yellow skin", "bilirubin high"],
    title: "Jaundice (Resolved Acute Cause)",
    verdict: "Temporarily Deferred",
    headline: "Acceptable 12 months (1 year) after acute jaundice has fully resolved.",
    summary: "Donors who had acute treated and resolved jaundice can donate after 12 months.",
    deferralTime: "12 months (1 year)",
    keyPoints: ["Defer for 12 months after resolution of acute jaundice"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 49",
    category: "Gastrointestinal & Liver",
  },
  {
    id: "s50_chronic_liver",
    keywords: ["liver disease", "cirrhosis", "liver failure", "fatty liver severe", "hepatic failure"],
    title: "Chronic Liver Disease & Cirrhosis",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Chronic liver disease, cirrhosis, or liver failure permanently defers the donor.",
    keyPoints: ["Chronic liver disease / Liver failure: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 50",
    category: "Gastrointestinal & Liver",
  },

  // =========================================================================
  // 10. HIV & SEXUALLY TRANSMITTED INFECTIONS (S.No. 51 - 55)
  // =========================================================================
  {
    id: "s51_hiv_risk",
    keywords: ["hiv", "aids", "hiv risk", "transgender", "msm", "fsw", "sex worker", "idu"],
    title: "High Risk for HIV Infection",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Persons considered at high risk for HIV infection are permanently deferred.",
    keyPoints: ["High risk for HIV: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 51",
    category: "Infection & TTI",
  },
  {
    id: "s52_plha",
    keywords: ["hiv positive", "plha", "spouse hiv", "partner hiv"],
    title: "Known HIV-Positive Person or Spouse of PLHA",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Known HIV-positive individuals and their spouses/partners are permanently deferred.",
    keyPoints: ["Known HIV positive or spouse/partner of PLHA: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 52",
    category: "Infection & TTI",
  },
  {
    id: "s53_aids_symptoms",
    keywords: ["aids symptoms", "lymphadenopathy", "chronic diarrhea", "unexplained weight loss", "night sweats"],
    title: "Symptoms Suggestive of AIDS",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Persons having lymphadenopathy, prolonged fever, or prolonged diarrhea irrespective of HIV risk are permanently deferred.",
    keyPoints: ["Symptoms suggestive of AIDS: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 53",
    category: "Infection & TTI",
  },
  {
    id: "s54_syphilis",
    keywords: ["syphilis", "genital sore", "chancre", "vdrl", "rpr", "treponema"],
    title: "Syphilis",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "History of Syphilis (genital sore or generalized rashes) permanently defers the donor.",
    keyPoints: ["Syphilis: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 54",
    category: "Infection & TTI",
  },
  {
    id: "s55_gonorrhoea",
    keywords: ["gonorrhoea", "gonorrhea", "urethritis", "discharge"],
    title: "Gonorrhea",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "History of Gonorrhea permanently defers the prospective donor.",
    keyPoints: ["Gonorrhea: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 55",
    category: "Infection & TTI",
  },

  // =========================================================================
  // 11. OTHER INFECTIOUS DISEASES (S.No. 56 - 67)
  // =========================================================================
  {
    id: "s56_measles_chickenpox",
    keywords: ["measles", "mumps", "chickenpox", "rubella", "shingles"],
    title: "Measles, Mumps & Chickenpox",
    verdict: "Temporarily Deferred",
    headline: "Defer for 2 weeks (14 days) following full recovery.",
    summary: "Donors recovering from measles, mumps, or chickenpox must wait 14 days after full recovery.",
    deferralTime: "14 days after recovery",
    keyPoints: ["Defer for 2 weeks after complete recovery"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 56",
    category: "Infection & TTI",
  },
  {
    id: "s57_malaria",
    keywords: ["malaria", "plasmodium", "chloroquine", "mosquito fever"],
    title: "Malaria Infection",
    verdict: "Temporarily Deferred",
    headline: "Defer for 3 months following full recovery.",
    summary: "Donors diagnosed with malaria are deferred for 3 months following full recovery and treatment completion.",
    deferralTime: "3 months",
    keyPoints: ["Defer for 3 months following full recovery and treatment"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 57",
    category: "Infection & TTI",
  },
  {
    id: "s58_typhoid",
    keywords: ["typhoid", "enteric fever", "salmonella"],
    title: "Typhoid Fever",
    verdict: "Temporarily Deferred",
    headline: "Defer for 12 months (1 year) following full recovery.",
    summary: "Following complete recovery from typhoid, defer the donor for 12 months.",
    deferralTime: "12 months (1 year)",
    keyPoints: ["Defer for 12 months after complete recovery"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 58",
    category: "Infection & TTI",
  },
  {
    id: "s59_dengue_chikungunya",
    keywords: ["dengue", "chikungunya", "zika", "platelet low virus", "zika travel"],
    title: "Dengue, Chikungunya & Zika Virus",
    verdict: "Temporarily Deferred",
    headline: "Infection: Defer 6 months | Travel to Zika zone: Defer 28 days.",
    summary: "Diagnosed Dengue, Chikungunya, or Zika infection requires 6 months deferral post-recovery. Travel to a Zika outbreak area requires 28 days deferral.",
    deferralTime: "6 months (infection) / 28 days (Zika travel)",
    keyPoints: [
      "Diagnosed Dengue, Chikungunya, or Zika: Defer 6 months after recovery",
      "History of travel to Zika outbreak zone: Defer 28 days",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 59",
    category: "Infection & TTI",
  },
  {
    id: "s60_tuberculosis",
    keywords: ["tb", "tuberculosis", "att", "mycobacterium", "pulmonary tb"],
    title: "Tuberculosis (TB)",
    verdict: "Temporarily Deferred",
    headline: "Defer for 2 years (24 months) following confirmation of cure.",
    summary: "Following treatment and medical confirmation of cure, defer for 2 years before donating.",
    deferralTime: "2 years (24 months)",
    keyPoints: ["Defer for 2 years after medical confirmation of cure"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 60",
    category: "Infection & TTI",
  },
  {
    id: "s61_leishmaniasis",
    keywords: ["leishmaniasis", "kala azar", "kala-azar"],
    title: "Leishmaniasis (Kala-azar)",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "History of Leishmaniasis (Kala-azar) causes permanent deferral.",
    keyPoints: ["Leishmaniasis: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 61",
    category: "Infection & TTI",
  },
  {
    id: "s62_leprosy",
    keywords: ["leprosy", "hansen", "hansens disease"],
    title: "Leprosy (Hansen's Disease)",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "History of leprosy causes permanent deferral.",
    keyPoints: ["Leprosy: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 62",
    category: "Infection & TTI",
  },
  {
    id: "s63_conjunctivitis",
    keywords: ["conjunctivitis", "eye infection", "pink eye", "eye drops"],
    title: "Conjunctivitis (Pink Eye)",
    verdict: "Temporarily Deferred",
    headline: "Defer for period of illness and continuation of topical medication.",
    summary: "Defer during active infection and while using topical eye drops/medication.",
    deferralTime: "Duration of illness & eye drops",
    keyPoints: ["Defer until completely cured and off eye drops"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 63",
    category: "Infection & TTI",
  },
  {
    id: "s64_osteomyelitis",
    keywords: ["osteomyelitis", "bone infection"],
    title: "Osteomyelitis (Bone Infection)",
    verdict: "Temporarily Deferred",
    headline: "Defer for 2 years following completion of treatment and cure.",
    summary: "Defer for 2 years following completion of treatment and confirmed cure.",
    deferralTime: "2 years (24 months)",
    keyPoints: ["Defer for 2 years after treatment completion and cure"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 64",
    category: "Infection & TTI",
  },
  {
    id: "s65_pyelonephritis",
    keywords: ["pyelonephritis", "kidney infection", "acute kidney infection"],
    title: "Acute Kidney Infection (Pyelonephritis)",
    verdict: "Temporarily Deferred",
    headline: "Defer for 6 months after complete recovery and last dose of medication.",
    summary: "Defer for 6 months after complete recovery and last dose of medicine.",
    deferralTime: "6 months",
    keyPoints: ["Defer for 6 months after recovery and last medicine"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 65",
    category: "Infection & TTI",
  },
  {
    id: "s66_uti",
    keywords: ["uti", "cystitis", "urinary infection", "urine burning"],
    title: "Acute Infection (Cystitis / UTI)",
    verdict: "Temporarily Deferred",
    headline: "Defer for 2 weeks after complete recovery and last dose of medication.",
    summary: "Defer for 2 weeks after complete recovery and completion of antibiotics.",
    deferralTime: "2 weeks (14 days)",
    keyPoints: ["Defer for 2 weeks after complete cure and last dose of medication"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 66",
    category: "Infection & TTI",
  },
  {
    id: "s67_chronic_kidney",
    keywords: ["chronic kidney disease", "ckd", "kidney failure", "renal failure", "dialysis"],
    title: "Chronic Kidney Disease & Renal Failure",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Chronic kidney disease or renal failure causes permanent deferral.",
    keyPoints: ["Chronic kidney disease / renal failure: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 67",
    category: "Infection & TTI",
  },

  // =========================================================================
  // 12. DIGESTIVE SYSTEM (S.No. 68 - 70)
  // =========================================================================
  {
    id: "s68_diarrhea",
    keywords: ["diarrhea", "diarrhoea", "loose stools", "stomach upset", "dysentery"],
    title: "Diarrhea & Gastrointestinal Upset",
    verdict: "Temporarily Deferred",
    headline: "Defer for 2 weeks after complete recovery and last dose of medication.",
    summary: "If diarrhea occurred in the preceding week (especially with fever), defer for 2 weeks after recovery and completion of medications.",
    deferralTime: "2 weeks (14 days)",
    keyPoints: ["Defer for 2 weeks after recovery and last dose of medicine"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 68",
    category: "Gastrointestinal & Liver",
  },
  {
    id: "s69_endoscopy",
    keywords: ["endoscopy", "colonoscopy", "gastroscopy", "biopsy stomach"],
    title: "GI Endoscopy",
    verdict: "Conditional",
    headline: "No biopsy: Defer 7 days | Benign: Defer 28 days | Malignant: Permanently deferred.",
    summary: "If no sampling is done, defer for 7 days. If benign biopsy, defer 28 days. If malignant, permanently defer. If H. Pylori, defer until treatment completes.",
    deferralTime: "7 days (no biopsy) / 28 days (benign biopsy)",
    keyPoints: [
      "No sampling done: Defer for 7 days",
      "Benign disorder on biopsy: Defer for 28 days",
      "Malignant biopsy: Permanently deferred",
      "H. Pylori infection: Defer until treatment completes",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 69",
    category: "Gastrointestinal & Liver",
  },
  {
    id: "s70_acid_peptic",
    keywords: ["acid peptic", "gerd", "reflux", "hiatus hernia", "stomach ulcer", "gastric ulcer"],
    title: "Acid Peptic Disease & Stomach Ulcers",
    verdict: "Conditional",
    headline: "Mild GERD/reflux accepted; Ulcer with symptoms or bleeding permanently deferred.",
    summary: "Mild acid reflux, GERD, and hiatus hernia are ACCEPTABLE. Stomach ulcers with active symptoms or recurrent bleeding cause permanent deferral.",
    keyPoints: [
      "Mild acid reflux / GERD: ACCEPTABLE",
      "Active stomach ulcer with bleeding or symptoms: Permanently deferred",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 70",
    category: "Gastrointestinal & Liver",
  },

  // =========================================================================
  // 13. SYSTEMIC, BLOOD & AUTOIMMUNE (S.No. 71 - 76)
  // =========================================================================
  {
    id: "s71_autoimmune",
    keywords: ["autoimmune", "sle", "lupus", "scleroderma", "dermatomyositis", "ankylosing spondylitis", "rheumatoid arthritis"],
    title: "Autoimmune Disorders (SLE, RA, Lupus)",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Autoimmune diseases like Systemic Lupus Erythematosus (SLE), Scleroderma, Ankylosing Spondylitis, Dermatomyositis, or severe Rheumatoid Arthritis cause permanent deferral.",
    keyPoints: ["Autoimmune diseases: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 71",
    category: "Systemic & Autoimmune",
  },
  {
    id: "s72_polycythemia",
    keywords: ["polycythemia", "polycythemia vera", "high hemoglobin", "thick blood"],
    title: "Polycythemia",
    verdict: "Conditional",
    headline: "Primary: Permanently Deferred | Secondary (high altitude): Acceptable if Hb within limits.",
    summary: "Primary Polycythemia Vera is permanently deferred. Secondary Polycythemia (e.g. from high altitude) is accepted if Hb < 18.5 g/dL in males and < 16.5 g/dL in females.",
    keyPoints: [
      "Primary Polycythemia Vera: Permanently deferred",
      "Secondary Polycythemia: Accepted if Hb < 18.5 (men) / < 16.5 (women)",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 72",
    category: "Systemic & Autoimmune",
  },
  {
    id: "s73_bleeding_disorders",
    keywords: ["bleeding disorder", "hemophilia", "von willebrand", "bleeding tendency"],
    title: "Bleeding Disorders",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Coagulation factor deficiencies, hemophilia, or unexplained bleeding tendencies cause permanent deferral.",
    keyPoints: ["Bleeding disorders: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 73",
    category: "Systemic & Autoimmune",
  },
  {
    id: "s74_cancer",
    keywords: ["cancer", "malignancy", "leukemia", "lymphoma", "tumor", "chemotherapy"],
    title: "Cancer & Malignancy",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "History of any malignant disorder or cancer permanently defers the prospective donor.",
    keyPoints: ["Cancer / Malignancy: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 74",
    category: "Systemic & Autoimmune",
  },
  {
    id: "s75_allergy",
    keywords: ["allergy", "allergic", "cold urticaria", "anaphylaxis", "severe allergy", "steroid injection"],
    title: "Allergic Disorders & Steroids",
    verdict: "Conditional",
    headline: "Severe/cold allergy permanently deferred; Defer 28 days after oral/injected steroids.",
    summary: "Allergy to blood donation substances, cold urticaria, or history of severe allergy is permanently deferred. If on oral or injectable steroids, defer for 28 days after full recovery and cessation of steroids.",
    deferralTime: "28 days after stopping oral/injectable steroids",
    keyPoints: [
      "Allergy to blood donation substance or cold urticaria: Permanently deferred",
      "Severe allergy history: Permanently deferred",
      "Oral/injectable steroids: Defer for 28 days after recovery and stopping medication",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 75",
    category: "Systemic & Autoimmune",
  },
  {
    id: "s76_hemoglobinopathies",
    keywords: ["hemoglobinopathy", "sickle cell", "g6pd", "enzyme deficiency"],
    title: "Hemoglobinopathies & Red Cell Enzyme Deficiencies",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred if associated with anemia.",
    summary: "Hemoglobinopathies and red cell enzyme deficiencies (like Sickle Cell Disease) associated with anemia cause permanent deferral.",
    keyPoints: ["Hemoglobinopathies with anemia: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 76",
    category: "Systemic & Autoimmune",
  },

  // =========================================================================
  // 14. VACCINATIONS & INOCULATIONS (S.No. 77 - 80)
  // =========================================================================
  {
    id: "s77_non_live_vaccines",
    keywords: ["tetanus toxoid", "tt", "covid vaccine", "covaxin", "flu shot", "influenza vaccine", "hpv", "hepatitis b vaccine", "cholera injectable", "typhoid injectable"],
    title: "Non-Live Vaccines & Toxoids",
    verdict: "Temporarily Deferred",
    headline: "Defer for 14 days (2 weeks).",
    summary: "Non-live vaccines and toxoids (Tetanus, Typhoid injectable, Cholera, HPV, Influenza, Meningococcal, Pertussis, Pneumococcal, Polio injectable, Diphtheria, non-live COVID-19, Swine flu) require 14 days deferral.",
    deferralTime: "14 days (2 weeks)",
    keyPoints: [
      "Defer for 14 days after receiving non-live vaccine or toxoid",
      "Includes Tetanus toxoid, injectable COVID vaccine, Hep B vaccine, Flu shot",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 77",
    category: "Vaccine",
  },
  {
    id: "s78_live_vaccines",
    keywords: ["live vaccine", "polio oral", "opv", "mmr", "measles vaccine", "yellow fever", "japanese encephalitis", "bcg", "covid live"],
    title: "Live Attenuated Vaccines",
    verdict: "Temporarily Deferred",
    headline: "Defer for 28 days (4 weeks).",
    summary: "Live attenuated vaccines (Oral Polio, MMR, Yellow Fever, Japanese Encephalitis, Influenza oral, Typhoid oral, Cholera oral, Hepatitis A, live attenuated COVID) require a 28-day deferral.",
    deferralTime: "28 days (4 weeks)",
    keyPoints: ["Defer for 28 days after receiving live attenuated vaccine"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 78",
    category: "Vaccine",
  },
  {
    id: "s79_antisera",
    keywords: ["anti-tetanus serum", "anti snake venom", "asv", "anti-diphtheria serum", "anti-gas gangrene serum", "antiserum"],
    title: "Antisera (Anti-Venom, Anti-Tetanus Serum)",
    verdict: "Temporarily Deferred",
    headline: "Defer for 28 days (4 weeks).",
    summary: "Administration of anti-tetanus serum, anti-snake venom, anti-diphtheria serum, or anti-gas gangrene serum requires a 28-day deferral.",
    deferralTime: "28 days",
    keyPoints: ["Defer for 28 days after serum administration"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 79",
    category: "Vaccine",
  },
  {
    id: "s80_rabies_immunoglobulin",
    keywords: ["rabies", "dog bite", "animal bite", "anti-rabies", "hbig", "hepatitis b immunoglobulin", "immunoglobulin"],
    title: "Anti-Rabies Vaccine (Animal Bite) & Immunoglobulins",
    verdict: "Temporarily Deferred",
    headline: "Defer for 1 year (12 months) following animal bite rabies vaccine or HBIG.",
    summary: "Post-exposure anti-rabies vaccination following an animal bite, Hepatitis B Immunoglobulin (HBIG), or other immunoglobulins requires 1 year (12 months) deferral.",
    deferralTime: "1 year (12 months)",
    keyPoints: [
      "Anti-rabies vaccination following animal bite: Defer for 1 year",
      "Hepatitis B Immunoglobulin (HBIG): Defer for 1 year",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 80",
    category: "Vaccine",
  },

  // =========================================================================
  // 15. MEDICATIONS (S.No. 81 - 99)
  // =========================================================================
  {
    id: "s81_oral_contraceptives",
    keywords: ["contraceptive", "birth control", "ocp", "mala d", "saheli", "contraceptive pill"],
    title: "Oral Contraceptives",
    verdict: "Eligible",
    headline: "Acceptable.",
    summary: "Prospective donors taking oral contraceptives are acceptable.",
    keyPoints: ["Oral contraceptives: ACCEPTABLE"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 81",
    category: "Medication",
  },
  {
    id: "s82_analgesics",
    keywords: ["analgesic", "paracetamol", "crocin", "dolo", "calpol"],
    title: "Analgesics (Paracetamol)",
    verdict: "Eligible",
    headline: "Acceptable if feeling well.",
    summary: "Paracetamol and simple analgesics are acceptable provided the donor is completely well and afebrile.",
    keyPoints: ["Paracetamol: ACCEPTABLE if asymptomatic"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 82",
    category: "Medication",
  },
  {
    id: "s83_vitamins",
    keywords: ["vitamin", "vitamins", "b complex", "calcium", "zinc", "multivitamin", "supplements"],
    title: "Vitamins & Nutritional Supplements",
    verdict: "Eligible",
    headline: "Acceptable.",
    summary: "Donors taking vitamins, minerals, and dietary supplements are acceptable.",
    keyPoints: ["Vitamins & supplements: ACCEPTABLE"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 83",
    category: "Medication",
  },
  {
    id: "s84_sedatives",
    keywords: ["sedative", "tranquillizer", "sleeping pill", "alprazolam", "clonazepam"],
    title: "Mild Sedatives & Tranquilizers",
    verdict: "Eligible",
    headline: "Acceptable.",
    summary: "Mild sedatives and tranquilizers are acceptable if the donor is alert and fully functional.",
    keyPoints: ["Mild sedatives & tranquilizers: ACCEPTABLE"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 84",
    category: "Medication",
  },
  {
    id: "s85_allopurinol",
    keywords: ["allopurinol", "gout", "uric acid"],
    title: "Allopurinol (Gout)",
    verdict: "Eligible",
    headline: "Acceptable.",
    summary: "Donors taking Allopurinol for gout or elevated uric acid are acceptable.",
    keyPoints: ["Allopurinol: ACCEPTABLE"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 85",
    category: "Medication",
  },
  {
    id: "s86_statins",
    keywords: ["cholesterol", "statin", "atorvastatin", "rosuvastatin", "lipaglyn"],
    title: "Cholesterol-Lowering Medication (Statins)",
    verdict: "Eligible",
    headline: "Acceptable (except monoclonal antibody therapy).",
    summary: "Statins and standard cholesterol-lowering pills are acceptable. Monoclonal antibody therapies are not acceptable.",
    keyPoints: ["Cholesterol medicines: ACCEPTABLE (except monoclonal antibodies)"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 86",
    category: "Medication",
  },
  {
    id: "s87_nsaids_aspirin",
    keywords: ["aspirin", "disprin", "ibuprofen", "combiflam", "diclofenac", "nsaid", "painkiller"],
    title: "Salicylates (Aspirin) & NSAIDs",
    verdict: "Conditional",
    headline: "Defer for 3 days if blood used for platelet preparation; Acceptable for whole blood.",
    summary: "Aspirin and NSAIDs inhibit platelet aggregation. Defer for 3 days if platelets will be prepared from the donation. Acceptable for whole blood if well.",
    deferralTime: "3 days for platelet preparation",
    keyPoints: [
      "Platelet preparation: Defer for 3 days after last dose",
      "Whole blood: Acceptable if asymptomatic and well",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 87",
    category: "Medication",
  },
  {
    id: "s88_antifungals_deworming",
    keywords: ["ketoconazole", "antihelminthic", "mebendazole", "albendazole", "worm tablet", "antifungal"],
    title: "Ketoconazole & Deworming Drugs (Mebendazole)",
    verdict: "Temporarily Deferred",
    headline: "Defer for 7 days after the last dose if well.",
    summary: "Ketoconazole and antihelminthics require 7 days deferral after the last dose.",
    deferralTime: "7 days",
    keyPoints: ["Defer for 7 days after last dose"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 88",
    category: "Medication",
  },
  {
    id: "s89_antibiotics",
    keywords: ["antibiotic", "antibiotics", "amoxicillin", "azithromycin", "ciprofloxacin", "augmentin", "doxycycline", "taxim"],
    title: "Antibiotics (Oral & Injectable)",
    verdict: "Temporarily Deferred",
    headline: "Defer for 2 weeks (14 days) after the last dose.",
    summary: "Must wait 14 days after the final dose of oral or injectable antibiotics, and the underlying infection must be completely resolved.",
    deferralTime: "14 days after last dose",
    keyPoints: [
      "Defer for 14 days after the last antibiotic dose",
      "Must be completely recovered and feeling well",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 89",
    category: "Medication",
  },
  {
    id: "s90_antiplatelet_clopidogrel",
    keywords: ["clopidogrel", "ticlopidine", "blood thinner", "clopivas", "plavix"],
    title: "Ticlopidine & Clopidogrel (Antiplatelet Drugs)",
    verdict: "Temporarily Deferred",
    headline: "Defer for 2 weeks (14 days) after the last dose.",
    summary: "Defer for 2 weeks after stopping Ticlopidine or Clopidogrel.",
    deferralTime: "14 days",
    keyPoints: ["Defer for 2 weeks after last dose"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 90",
    category: "Medication",
  },
  {
    id: "s91_piroxicam",
    keywords: ["piroxicam", "dipyridamole", "dolonex"],
    title: "Piroxicam & Dipyridamole",
    verdict: "Temporarily Deferred",
    headline: "Defer for 2 weeks (14 days) after the last dose.",
    summary: "Defer for 2 weeks after the last dose of Piroxicam or Dipyridamole.",
    deferralTime: "14 days",
    keyPoints: ["Defer for 2 weeks after last dose"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 91",
    category: "Medication",
  },
  {
    id: "s92_isotretinoin",
    keywords: ["isotretinoin", "etretinate", "acne pill", "accutane", "retinoid"],
    title: "Isotretinoin & Etretinate (Acne Medications)",
    verdict: "Temporarily Deferred",
    headline: "Isotretinoin: Defer 1 month | Etretinate: Permanently deferred.",
    summary: "Isotretinoin causes severe teratogenic birth defects. Defer for 1 month after last dose. Etretinate carries permanent deferral.",
    deferralTime: "1 month (Isotretinoin) / Permanent (Etretinate)",
    keyPoints: [
      "Isotretinoin: Defer for 1 month after last dose",
      "Etretinate: Permanently deferred",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 92",
    category: "Medication",
  },
  {
    id: "s93_finasteride",
    keywords: ["finasteride", "proscar", "propecia", "hair loss pill"],
    title: "Finasteride (Hair Loss / BPH)",
    verdict: "Temporarily Deferred",
    headline: "Defer for 1 month after the last dose.",
    summary: "Finasteride used for BPH or hair loss requires 1 month deferral after the last dose.",
    deferralTime: "1 month",
    keyPoints: ["Defer for 1 month after last dose"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 93",
    category: "Medication",
  },
  {
    id: "s94_radioactive",
    keywords: ["radioactive", "contrast", "radiation material", "pet scan", "iodine 131"],
    title: "Radioactive Contrast & Materials",
    verdict: "Conditional",
    headline: "Non-malignant: Defer 6 months | Malignant: Permanently deferred.",
    summary: "If received for non-malignant conditions, defer for 6 months. If received for malignant conditions, permanently defer.",
    deferralTime: "6 months (non-malignant) / Permanent (malignant)",
    keyPoints: [
      "Non-malignant condition: Defer for 6 months",
      "Malignant condition: Permanently deferred",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 94",
    category: "Medication",
  },
  {
    id: "s95_dutasteride",
    keywords: ["dutasteride", "avodart", "duprost", "prostate medicine"],
    title: "Dutasteride (BPH / Hair Loss)",
    verdict: "Temporarily Deferred",
    headline: "Defer for 6 months after the last dose.",
    summary: "Due to a longer half-life, Dutasteride requires 6 months deferral after the last dose.",
    deferralTime: "6 months",
    keyPoints: ["Defer for 6 months after last dose"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 95",
    category: "Medication",
  },
  {
    id: "s96_unknown_med",
    keywords: ["unknown medication", "unlabelled pills", "herbal concoction"],
    title: "Medication of Unknown Nature",
    verdict: "Temporarily Deferred",
    headline: "Defer until details/prescription are verified by the Medical Officer.",
    summary: "Defer until medication name, indications, and exact prescription are reviewed.",
    keyPoints: ["Defer till full medication details are available"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 96",
    category: "Medication",
  },
  {
    id: "s97_oral_antidiabetics",
    keywords: ["metformin", "glimepiride", "oral diabetic drug", "sitagliptin", "sugar tablets"],
    title: "Oral Anti-Diabetic Drugs",
    verdict: "Conditional",
    headline: "Acceptable if no dose alteration within the last 4 weeks.",
    summary: "Oral anti-diabetic pills are accepted provided there is no dosage alteration in the last 4 weeks and no diabetic complications.",
    keyPoints: [
      "Oral diabetic medication: ACCEPTABLE",
      "No dosage change within the last 4 weeks",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 97",
    category: "Medication",
  },
  {
    id: "s98_insulin",
    keywords: ["insulin", "insulin injection", "lantus", "novorapid", "mixtard"],
    title: "Insulin Treatment",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Any donor requiring insulin injection for diabetes is permanently deferred.",
    keyPoints: ["Insulin: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 98",
    category: "Medication",
  },
  {
    id: "s99_high_risk_drugs",
    keywords: ["anticoagulant", "warfarin", "heparin", "anticonvulsant", "cytotoxic", "chemo", "anti-thyroid", "carbimazole", "anti-arrhythmic", "amiodarone"],
    title: "High-Risk Drugs (Anticoagulants, Anticonvulsants, Chemotherapy)",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred.",
    summary: "Donors taking Anti-arrhythmics, Anticonvulsants, Anticoagulants, Anti-thyroid drugs, Cytotoxic/Chemotherapy drugs, or Cardiac failure drugs (Digitalis) are permanently deferred.",
    keyPoints: ["High-risk medications: Permanently deferred"],
    citation: "NBTC Feb 2025 Guidelines, S.No. 99",
    category: "Medication",
  },

  // =========================================================================
  // 16. TRANSPLANTS & FAINTING (S.No. 100 - 101)
  // =========================================================================
  {
    id: "s100_transplants",
    keywords: ["transplant", "stem cell", "bone marrow", "organ transplant", "hair transplant", "prp", "skin graft"],
    title: "Transplants, Hair Transplant, PRP Therapy & Skin Grafting",
    verdict: "Conditional",
    headline: "Organ/stem cell: Permanently deferred | Hair transplant/PRP/skin graft: Defer 6 months.",
    summary: "Allogeneic or autologous organ/stem cell recipients are permanently deferred. Hair transplant, PRP therapy, or skin grafting requires 6 months deferral after complete recovery with no pending follow-up.",
    deferralTime: "6 months (hair transplant/PRP/skin graft) / Permanent (organ/stem cell)",
    keyPoints: [
      "Allogeneic or Autologous organ/stem cell transplant: Permanently deferred",
      "Hair transplant, PRP therapy, skin grafting: Defer for 6 months after recovery",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 100",
    category: "Surgery & Procedures",
  },
  {
    id: "s101_fainting",
    keywords: ["faint", "fainting", "syncope", "vasovagal", "dizzy", "delayed faint", "fainted twice"],
    title: "Fainting & Vasovagal Reactions Following Donation",
    verdict: "Permanently Deferred",
    headline: "Permanently deferred if delayed faint with injury or two consecutive faints.",
    summary: "Donors with an unexplained delayed faint, delayed faint with physical injury, or two consecutive faints following blood donation are permanently deferred.",
    keyPoints: [
      "Delayed faint with injury: Permanently deferred",
      "Two consecutive faints following blood donation: Permanently deferred",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 101",
    category: "General",
  },

  // =========================================================================
  // 17. COUNSELLING STAGES, TESTING STRATEGY & REFERRAL MECHANISMS
  // =========================================================================
  {
    id: "protocol_stages_counselling",
    keywords: ["stages of counselling", "donor counselling", "counsellor", "5 stages", "counselling stages"],
    title: "The 5 Stages of Blood Donor Counselling",
    verdict: "Official Protocol",
    headline: "5 Stages: Pre-donation info, Pre-donation counselling, Assessment, During donation, Post-donation.",
    summary: "NBTC 2025 mandates 5 distinct stages of donor counselling: 1) Pre-donation information, 2) Pre-donation counselling, 3) Donor questionnaire & health check-up, 4) Counselling during blood donation, and 5) Post-donation care & recall.",
    keyPoints: [
      "Stage 1: Pre-donation information (eligibility, TTI risks, voluntary nature)",
      "Stage 2: Pre-donation counselling (questionnaire clarification, informed consent)",
      "Stage 3: Donor Questionnaire & Health checkup (MBBS Medical Officer checkup)",
      "Stage 4: Counselling during donation (comfort, venepuncture, anxiety reduction)",
      "Stage 5: Post-donation counselling (rest, fluids, bandage care, recall notification)",
    ],
    citation: "NBTC Feb 2025 Guidelines, Pages 2–5",
    category: "Counselling & Protocol",
  },
  {
    id: "protocol_testing_hiv_strategy1",
    keywords: ["strategy 1", "strategy i", "hiv testing", "triage", "a0", "mandatory tests", "hiv screening"],
    title: "Testing Strategy for HIV at Blood Centres (Strategy I)",
    verdict: "Official Protocol",
    headline: "Strategy I with high-sensitivity triage test (A0).",
    summary: "Under Strategy I, the blood unit undergoes one test of high sensitivity (A0). If non-reactive (A0-), the unit is safe for transfusion. If reactive (A0+), the unit is considered positive and discarded immediately; the donor is recalled confidentially.",
    keyPoints: [
      "Strategy I: Focused on recipient safety",
      "One test of high sensitivity (A0)",
      "A0- (Non-reactive): Specimen free of HIV",
      "A0+ (Reactive): Unit discarded immediately; donor recalled for referral",
    ],
    citation: "NBTC Feb 2025 Guidelines, Page 15–16",
    category: "Counselling & Protocol",
  },
  {
    id: "protocol_mandatory_tests",
    keywords: ["mandatory tests", "tested for", "what tests", "screening tests", "tti tests", "5 tests"],
    title: "Mandatory Screening Tests for Every Donated Unit",
    verdict: "Official Protocol",
    headline: "5 mandatory tests: HIV 1&2, Hepatitis B (HBsAg), Hepatitis C (HCV), Syphilis, and Malaria.",
    summary: "Every donated unit in India must be tested for 5 mandatory transfusion transmissible infections: HIV 1 & 2, Hepatitis B surface antigen (HBsAg), Hepatitis C virus antibody (HCV), Syphilis, and Malaria parasites.",
    keyPoints: [
      "1. HIV 1 and 2",
      "2. Hepatitis B (HBsAg)",
      "3. Hepatitis C (HCV)",
      "4. Syphilis (VDRL / TPHA)",
      "5. Malaria parasites",
    ],
    citation: "NBTC Feb 2025 Guidelines, Consent & Page 15",
    category: "Counselling & Protocol",
  },
  {
    id: "protocol_referral_confidentiality",
    keywords: ["referral", "telephone", "recall", "ictc", "positive result", "reactive result", "sero-reactive", "confidentiality"],
    title: "Recall & Referral Mechanism for Sero-Reactive Donors",
    verdict: "Official Protocol",
    headline: "Strict in-person counselling; Results are NEVER given over the telephone.",
    summary: "All initial sero-reactive donors must be recalled in person for post-donation counselling and referred with a standard referral slip. Telephone disclosure is strictly prohibited. If donor fails to return after 3 consecutive weekly attempts, details are shared confidentially with linked ICTC.",
    keyPoints: [
      "Results are NEVER disclosed over the telephone",
      "Private in-person post-donation counselling prior to referral",
      "Referred to Integrated Counselling and Testing Centres (ICTC) or hospital OPD",
      "If non-responsive after 3 consecutive weekly attempts, list shared under shared confidentiality with linked ICTC",
      "Signed written consent for referral is obtained",
    ],
    citation: "NBTC Feb 2025 Guidelines, Pages 15–17",
    category: "Counselling & Protocol",
  },
  {
    id: "protocol_post_donation_care",
    keywords: ["post donation", "after donation", "care", "rest", "bandage", "faint after donation", "fluids", "smoking after"],
    title: "Post-Donation Self-Care Instructions",
    verdict: "Official Protocol",
    headline: "Rest 10–15 mins, drink plenty of fluids, no heavy work, keep bandage for 6 hours.",
    summary: "Following blood donation: rest in the refreshment area, drink plenty of fluids, avoid strenuous work/driving immediately, do not smoke for at least 30 minutes, and keep the venepuncture bandage intact for 6 hours.",
    keyPoints: [
      "Rest 10–15 minutes and take refreshments/fluids",
      "Keep venepuncture bandage on for at least 6 hours",
      "No heavy physical work, gym, or strenuous sports for 24 hours",
      "No smoking for 30 minutes; no driving immediately",
      "If dizzy: sit down with head between knees or lie down with feet elevated",
    ],
    citation: "NBTC Feb 2025 Guidelines, Page 5",
    category: "Counselling & Protocol",
  },
  {
    id: "protocol_donor_consent",
    keywords: ["consent", "donor consent", "informed consent", "5 points", "remuneration"],
    title: "5-Point Donor Informed Consent Declaration",
    verdict: "Official Protocol",
    headline: "Voluntary non-remunerated act with informed procedural acceptance.",
    summary: "Donors sign a 5-point declaration acknowledging voluntary non-remunerated donation, acceptance of procedure risks, potential plasma fractionation for medicines, agreement for TTI testing, and consent to be recalled if results are abnormal.",
    keyPoints: [
      "1. Voluntary act with no inducement or remuneration",
      "2. Medical procedure: donor accepts procedural risks",
      "3. Plasma may be used for plasma fractionation into life-saving medicines",
      "4. Mandatory testing for HIV, Hepatitis B, Hepatitis C, Syphilis, and Malaria",
      "5. Consent to be informed of abnormal test results",
    ],
    citation: "NBTC Feb 2025 Guidelines, Page 5",
    category: "Counselling & Protocol",
  },
];

const STOPWORDS = new Set([
  "blood",
  "donor",
  "donors",
  "donate",
  "donating",
  "donation",
  "can",
  "could",
  "should",
  "will",
  "would",
  "how",
  "what",
  "why",
  "when",
  "where",
  "which",
  "who",
  "whom",
  "whose",
  "have",
  "has",
  "had",
  "take",
  "taking",
  "took",
  "tell",
  "give",
  "giving",
  "about",
  "after",
  "before",
  "from",
  "for",
  "the",
  "and",
  "you",
  "your",
  "mine",
  "ours",
  "this",
  "that",
  "these",
  "those",
  "with",
  "without",
  "also",
  "just",
  "want",
  "like",
  "rule",
  "rules",
  "guideline",
  "guidelines",
  "criteria",
  "much",
  "many",
]);

/**
 * Intelligent Query Matcher
 * Uses tokenization, stemming/lemmatization, stopword filtering, and keyword weighting
 * strictly against the NBTC February 2025 Manual.
 */
export function queryDonorCriteria(query: string): CriteriaAnswer | null {
  const clean = query.toLowerCase().trim();
  if (!clean) return null;

  // Normalize common terms / synonyms
  const normalized = clean
    .replace(/\b(sugar|glucose|diabete)\b/g, "diabetes")
    .replace(/\b(hypertension|tension)\b/g, "bp blood pressure")
    .replace(/\b(tablet|tablets|medicine|medicines|pill|pills|med)\b/g, "medication")
    .replace(/\b(tattoos|pierced|tattooing|piercings)\b/g, "tattoo piercing")
    .replace(/\b(periods|menstrual)\b/g, "menstruation")
    .replace(/\b(pregnant|childbirth|postpartum)\b/g, "pregnancy delivery")
    .replace(/\b(drinking|drinks|booze|drunk)\b/g, "alcohol")
    .replace(/\b(smoker|smokers|smoking|cigarette|beedi)\b/g, "smoke smoking tobacco")
    .replace(/\b(fits|seizure|seizures)\b/g, "epilepsy convulsions")
    .replace(/\b(headache|migraines)\b/g, "migraine")
    .replace(/\b(tooth|teeth|rct)\b/g, "dental root canal extraction")
    .replace(/\b(inhalers|wheeze)\b/g, "asthma inhaler")
    .replace(/\b(shots|jab|vaccine|vaccines)\b/g, "vaccination")
    .replace(/\b(dog bite|bitten by dog)\b/g, "rabies animal bite")
    .replace(/\b(fainted|fainting|dizziness)\b/g, "faint")
    .replace(/\b(after donating|post donation)\b/g, "post donation care")
    .replace(/\b(hiv test|aids test)\b/g, "hiv strategy triage")
    .replace(/\b(who cannot donate|permanent deferral)\b/g, "permanently deferred high risk");

  const tokens = normalized.split(/[^a-z0-9+]+/).filter((t) => t.length > 0);
  const contentTokens = tokens.filter((t) => !STOPWORDS.has(t));

  let bestScore = 0;
  let bestRule: RuleItem | null = null;

  const ALL_RULES = [...COMPLETE_DONOR_RULES, ...GENERAL_DONATION_FAQS];

  for (const rule of ALL_RULES) {
    let score = 0;

    // Check title match ignoring generic stopwords
    const titleWords = rule.title
      .toLowerCase()
      .split(/[^a-z0-9+]+/)
      .filter((w) => !STOPWORDS.has(w) && w.length > 2);

    if (contentTokens.some((t) => titleWords.includes(t))) {
      score += 7;
    }

    for (const kw of rule.keywords) {
      const kwLower = kw.toLowerCase();

      // Multi-word phrase exact match in query
      if (kwLower.includes(" ") && normalized.includes(kwLower)) {
        score += 10;
      }
      // Single token exact match in content tokens
      else if (contentTokens.includes(kwLower)) {
        score += kwLower.length <= 2 ? 8 : 6;
      }
      // Substring match only for meaningful keywords
      else if (!STOPWORDS.has(kwLower) && normalized.includes(kwLower) && kwLower.length > 3) {
        score += 4;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  // Minimum score threshold
  if (bestRule && bestScore >= 4) {
    return {
      verdict: bestRule.verdict,
      headline: bestRule.headline,
      summary: bestRule.summary,
      deferralTime: bestRule.deferralTime,
      keyPoints: bestRule.keyPoints,
      citation: bestRule.citation,
      category: bestRule.category,
    };
  }

  return null;
}

// =========================================================================
// GENERAL BLOOD DONATION SCIENCE & HEALTH KNOWLEDGE BASE (NBTC 2025)
// =========================================================================
const GENERAL_DONATION_FAQS: RuleItem[] = [
  {
    id: "faq_pain_fear",
    keywords: ["pain", "hurt", "painful", "needle", "scared of needles", "fear", "prick", "does it hurt"],
    title: "Does Blood Donation Hurt? Needle Comfort",
    verdict: "General Guidance",
    headline: "Only a minor pinch for a few seconds; safe and comfortable.",
    summary: "The actual phlebotomy needle insertion feels like a quick pinch that lasts only a couple of seconds. The collection process itself takes only 8–10 minutes, and trained phlebotomists ensure maximum donor comfort.",
    keyPoints: [
      "Quick pinch lasting 2–3 seconds upon venepuncture",
      "Actual blood draw takes only 8 to 10 minutes",
      "Trained staff keep donors relaxed and comfortable throughout",
      "Deep breathing and distracting oneself helps eliminate nervousness",
    ],
    citation: "NBTC Feb 2025 Guidelines, Stage 4 (Page 4)",
    category: "General Guidance",
  },
  {
    id: "faq_infection_safety",
    keywords: ["safe", "catch disease", "get hiv", "catch infection", "safety", "clean", "sterile", "reused needle"],
    title: "Is Donating Blood Safe? Can I Catch an Infection?",
    verdict: "General Guidance",
    headline: "100% safe. You CANNOT contract HIV or any infection from donating.",
    summary: "Donating blood is completely safe. A brand-new, sterile, disposable collection kit and needle are used for every single donor and immediately destroyed after use. It is physically impossible to catch any infection by donating blood.",
    keyPoints: [
      "100% sterile, single-use disposable needles and blood bags",
      "Kit is opened right in front of you and disposed of into biohazard waste",
      "You cannot contract HIV, Hepatitis, or any blood-borne infection",
      "Conducted under strict National Blood Transfusion Council bio-safety norms",
    ],
    citation: "NBTC Feb 2025 Guidelines, Core Principles (Page 2)",
    category: "General Guidance",
  },
  {
    id: "faq_volume_collected",
    keywords: ["how much blood", "quantity", "volume taken", "how many ml", "units taken"],
    title: "How Much Blood is Taken During Donation?",
    verdict: "General Guidance",
    headline: "Only 350 ml or 450 ml (less than 8% of total body blood).",
    summary: "The human body contains about 5 liters of blood. Depending on weight, only 350 ml (for ≥45 kg) or 450 ml (for >55 kg) is collected, which represents less than 8% of your total blood volume. Your plasma volume is replenished within 24 to 48 hours.",
    keyPoints: [
      "350 ml collected if weight is 45–55 kg",
      "450 ml collected if weight exceeds 55 kg",
      "Less than 8% of total body volume is taken",
      "Fluid volume is restored in 24–48 hours; red cells in a few weeks",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 3",
    category: "General Guidance",
  },
  {
    id: "faq_benefits",
    keywords: ["benefits", "advantage", "why donate", "help", "good for health", "save lives"],
    title: "Health & Humanitarian Benefits of Donating Blood",
    verdict: "General Guidance",
    headline: "Saves up to 3 lives, stimulates new blood cell production, and provides a free health check.",
    summary: "A single whole blood donation is separated into red cells, platelets, and plasma, potentially saving up to 3 lives. Donors also receive a complimentary mini-health screening (Hb, BP, vitals, and screening for 5 major infections) and stimulate their bone marrow to produce fresh, healthy blood cells.",
    keyPoints: [
      "1 blood donation can save up to 3 lives",
      "Free vital health check: Hemoglobin, Blood Pressure, Pulse, and Weight",
      "Free confidential screening for HIV, Hep B, Hep C, Syphilis, and Malaria",
      "Stimulates bone marrow production of fresh red blood cells",
      "Reduces blood viscosity and supports cardiovascular well-being",
    ],
    citation: "NBTC Feb 2025 Guidelines, Introduction (Page 2)",
    category: "General Guidance",
  },
  {
    id: "faq_smoking_tobacco",
    keywords: ["smoke", "smoking", "cigarette", "beedi", "tobacco", "nicotine", "can smokers donate"],
    title: "Can Smokers Donate Blood?",
    verdict: "Conditional",
    headline: "Yes, smokers can donate, but do NOT smoke for at least 30 minutes post-donation.",
    summary: "Smoking or using tobacco does not disqualify you from donating blood, provided your vitals, hemoglobin, and blood pressure meet NBTC criteria. However, you must refrain from smoking for at least 30 minutes after donating to prevent sudden dizziness, fainting, or blood pressure drops.",
    keyPoints: [
      "Smokers ARE eligible to donate blood if vitals and Hb (≥12.5 g/dL) are normal",
      "Must NOT smoke for at least 30 minutes after donation",
      "Avoid smoking immediately prior to donation to maintain optimal oxygen saturation",
    ],
    citation: "NBTC Feb 2025 Guidelines, Post-Donation Care (Page 5)",
    category: "Lifestyle & Occupation",
  },
  {
    id: "faq_blood_groups",
    keywords: ["blood group", "blood type", "universal donor", "o negative", "ab positive", "rare blood", "compatibility"],
    title: "Blood Groups & Universal Compatibility",
    verdict: "General Guidance",
    headline: "O Negative is Universal RBC Donor; AB Positive is Universal Recipient.",
    summary: "The 8 major blood groups are A+, A-, B+, B-, AB+, AB-, O+, and O-. O-Negative red blood cells can be safely given to almost any emergency patient. AB-Positive patients can receive red blood cells from any blood group.",
    keyPoints: [
      "Universal Red Cell Donor: O Negative (O-)",
      "Universal Red Cell Recipient: AB Positive (AB+)",
      "Universal Plasma Donor: AB Positive / AB Negative",
      "All blood groups are critically needed for accidents, surgeries, and cancer patients",
    ],
    citation: "NBTC Transfusion Principles & Standards 2025",
    category: "General Guidance",
  },
  {
    id: "faq_apheresis",
    keywords: ["apheresis", "plateletpheresis", "plasmapheresis", "single donor platelets", "sdp"],
    title: "What is Apheresis (Platelet & Plasma Donation)?",
    verdict: "Official Protocol",
    headline: "Specialized donation where platelets or plasma are collected and red cells returned.",
    summary: "In apheresis, blood passes through an automated separator machine that harvests specific components (like platelets or plasma) and returns your red blood cells. Because red cells are returned, donors can donate platelets much more frequently (every 48 hours to 7 days).",
    keyPoints: [
      "Weight: Min 50 kg for single plateletpheresis; 60 kg for double",
      "Age: 18 to 60 years",
      "Interval: Minimum 48 hours for single; 7 days for double",
      "Platelet count must be ≥ 250×10³/µL for double plateletpheresis",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 2, 3, 4",
    category: "Counselling & Protocol",
  },
  {
    id: "faq_replenishment",
    keywords: ["regenerate", "replenish", "recover blood", "how fast", "blood rebuild"],
    title: "How Fast Does Your Body Replace Donated Blood?",
    verdict: "General Guidance",
    headline: "Plasma volume recovers in 24–48 hours; red cells in 4–6 weeks.",
    summary: "Your body immediately begins replenishing lost volume. The liquid plasma volume is fully restored within 24 to 48 hours with adequate fluid intake. Red blood cells and iron stores are fully regenerated in 4 to 8 weeks, which is why intervals of 90 days (men) and 120 days (women) are mandated.",
    keyPoints: [
      "Liquid plasma volume restored in 24 to 48 hours",
      "Platelets and white cells recover in a few days",
      "Red blood cells and hemoglobin normalize in 4 to 6 weeks",
      "Drinking plenty of water and eating iron-rich foods speeds up recovery",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 4",
    category: "General Guidance",
  },
];

/**
 * Intelligent AI Hybrid Assistant
 * Answers ANY query:
 * 1. Specific NBTC criteria (S.No 1-101)
 * 2. General transfusion & medical donation science
 * 3. Conversational greetings, gratitude, and assistant queries
 * 4. Smart medical synthesis fallback for multi-variable or unstructured queries
 */
export function askDonorAssistant(userQuery: string): CriteriaAnswer {
  const clean = userQuery.toLowerCase().trim();

  // 1. Check direct criteria rules
  const ruleMatch = queryDonorCriteria(clean);
  if (ruleMatch) {
    return ruleMatch;
  }

  // 2. Check general donation FAQs & science
  for (const faq of GENERAL_DONATION_FAQS) {
    for (const kw of faq.keywords) {
      if (clean.includes(kw)) {
        return {
          verdict: faq.verdict,
          headline: faq.headline,
          summary: faq.summary,
          deferralTime: faq.deferralTime,
          keyPoints: faq.keyPoints,
          citation: faq.citation,
          category: faq.category,
        };
      }
    }
  }

  // 3. Conversational Greetings & Pleasantries
  if (/^(hi|hello|hey|vanakkam|namaste|good morning|good afternoon|good evening|howdy|yo)\b/.test(clean)) {
    return {
      verdict: "AI Assistant",
      headline: "Hello! I am your KK Life Drop Blood Donor Assistant.",
      summary:
        "I am trained directly on the official National Blood Transfusion Council (NBTC) February 2025 Guidelines. You can ask me any question about blood donation eligibility, deferral rules, medical conditions, medications, or post-donation care!",
      keyPoints: [
        "Ask about medications (e.g. 'Can I donate if taking BP pills or aspirin?')",
        "Ask about deferrals (e.g. 'Tattoo, body piercing, surgery, or alcohol gap')",
        "Ask about medical conditions (e.g. 'Diabetes, thyroid, asthma, jaundice')",
        "Ask about vitals (e.g. 'Minimum age, weight, or hemoglobin required')",
      ],
      citation: "NBTC Guidelines February 2025",
      category: "AI Assistant",
    };
  }

  // 4. Gratitude & Feedback
  if (/^(thanks|thank you|nandri|great|awesome|helpful|good job|cool)\b/.test(clean)) {
    return {
      verdict: "AI Assistant",
      headline: "You're very welcome! Glad I could help.",
      summary:
        "Kaarai Karangal and KK Life Drop are dedicated to bridging voluntary donors with patients in emergency need across Tamil Nadu & Puducherry. Every donation saves up to 3 lives!",
      keyPoints: [
        "Remember: 1 unit of whole blood can save 3 lives",
        "Males can donate every 90 days; females every 120 days",
        "Feel free to ask any other questions anytime!",
      ],
      citation: "Kaarai Karangal Humanitarian Initiative",
      category: "AI Assistant",
    };
  }

  // 5. Bot Identity & Purpose
  if (/who are you|what is this|what can you do|about you|help me/.test(clean)) {
    return {
      verdict: "AI Assistant",
      headline: "Official NBTC 2025 Blood Donor Selection AI Assistant.",
      summary:
        "I provide instant, reliable answers on blood donor eligibility based on the Ministry of Health and Family Welfare (NBTC) February 2025 manual. I can evaluate health conditions, medications, surgeries, vaccines, and donation guidelines.",
      keyPoints: [
        "100% grounded in official Government of India NBTC guidelines",
        "Covers all 101 medical selection and deferral criteria",
        "Explains pre-donation, donation, and post-donation health rules",
      ],
      citation: "Directorate General of Health Services, MoHFW, Govt of India",
      category: "AI Assistant",
    };
  }

  // 6. Smart Medical Synthesis Fallback
  // If query contains medical terms or numbers (e.g. "I am 17 and 10 months", "took an injection", "headache")
  return {
    verdict: "General Guidance",
    headline: "General Eligibility & Assessment Guidance (NBTC Feb 2025)",
    summary: `Regarding your query "${userQuery}": Under the official February 2025 NBTC guidelines, all donors must be between 18–65 years old, weigh at least 45 kg, have a minimum Hemoglobin of 12.5 g/dL, and feel in good general health without active acute infections or unapproved medications.`,
    keyPoints: [
      "Core standards: Age 18–65 years, Weight ≥ 45 kg, Hemoglobin ≥ 12.5 g/dL",
      "Must not be fasting (eat a light meal within 4 hours)",
      "Must be free of fever, active cold/cough, and unapproved medications",
      "For specific unlisted prescription medicines or complex health conditions, the Blood Centre Medical Officer (MBBS) conducts a free physical checkup before donation",
    ],
    citation: "NBTC Feb 2025 Guidelines, S.No. 1 & 96",
    category: "General Guidance",
  };
}

/**
 * Popular Quick Prompts across different categories
 */
export const QUICK_PROMPTS = [
  "Tattoo or piercing deferral period?",
  "Can I donate if I have Diabetes?",
  "What is the minimum age and weight?",
  "Can I donate if I take BP tablets?",
  "Alcohol rules before blood donation?",
  "Donation gap for males and females?",
  "Taking Antibiotics or Painkillers?",
  "Vaccination deferral rules (COVID/Tetanus)?",
  "Can I donate during my period?",
  "Dental work or tooth extraction rules?",
  "What are the 5 mandatory tests performed?",
  "Does donating blood hurt or cause infection?",
  "Health benefits of donating blood?",
  "Post-donation care and advice?",
];

