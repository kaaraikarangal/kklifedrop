export interface BloodFrequencyItem {
  type: string;
  ratio: string;
  percentage: string;
  rarity: "Very Common" | "Common" | "Rare" | "Very Rare";
  canGiveTo: string;
  canReceiveFrom: string;
  color: string;
}

export interface FactCategory {
  id: string;
  title: string;
  shortTitle: string;
  icon: string;
  color: string;
  badge?: string;
  description: string;
  facts: string[];
}

export const BLOOD_FREQUENCY_DATA: BloodFrequencyItem[] = [
  {
    type: "O+",
    ratio: "1 person in 3",
    percentage: "35%",
    rarity: "Very Common",
    canGiveTo: "O+, A+, B+, AB+",
    canReceiveFrom: "O+, O-",
    color: "#DC2626",
  },
  {
    type: "A+",
    ratio: "1 person in 3",
    percentage: "30%",
    rarity: "Very Common",
    canGiveTo: "A+, AB+",
    canReceiveFrom: "A+, A-, O+, O-",
    color: "#E11D48",
  },
  {
    type: "B+",
    ratio: "1 person in 12",
    percentage: "8.5%",
    rarity: "Common",
    canGiveTo: "B+, AB+",
    canReceiveFrom: "B+, B-, O+, O-",
    color: "#9333EA",
  },
  {
    type: "AB+",
    ratio: "1 person in 29",
    percentage: "3.4%",
    rarity: "Rare",
    canGiveTo: "AB+ only (Universal Recipient)",
    canReceiveFrom: "All Blood Types",
    color: "#2563EB",
  },
  {
    type: "O-",
    ratio: "1 person in 15",
    percentage: "6.6%",
    rarity: "Common",
    canGiveTo: "All Blood Types (Universal Red Cell Donor)",
    canReceiveFrom: "O- only",
    color: "#D97706",
  },
  {
    type: "A-",
    ratio: "1 person in 16",
    percentage: "6.3%",
    rarity: "Common",
    canGiveTo: "A+, A-, AB+, AB-",
    canReceiveFrom: "A-, O-",
    color: "#EA580C",
  },
  {
    type: "B-",
    ratio: "1 person in 67",
    percentage: "1.5%",
    rarity: "Rare",
    canGiveTo: "B+, B-, AB+, AB-",
    canReceiveFrom: "B-, O-",
    color: "#0891B2",
  },
  {
    type: "AB-",
    ratio: "1 person in 167",
    percentage: "0.6%",
    rarity: "Very Rare",
    canGiveTo: "AB+, AB- (Universal Plasma Donor)",
    canReceiveFrom: "AB-, A-, B-, O-",
    color: "#4F46E5",
  },
];

export const BLOOD_FACT_CATEGORIES: FactCategory[] = [
  {
    id: "frequency",
    title: "Frequency of Blood Types",
    shortTitle: "Frequency",
    icon: "stats-chart",
    color: "#DC2626",
    badge: "Distribution",
    description: "Distribution of ABO and Rh blood types across populations and their demographic prevalence.",
    facts: [
      "O+ is found in approximately 1 in every 3 persons, making it the most common blood type worldwide.",
      "A+ is found in approximately 1 in 3 persons and is among the most requested whole blood types.",
      "B+ is present in 1 in 12 persons globally, but represents over 30% of the donor pool in India and South Asia.",
      "AB+ occurs in about 1 in 29 individuals. Persons with AB+ blood are universal recipients for red cells.",
      "O- is present in 1 in 15 persons. O- donors are universal donors for red blood cells.",
      "A- is present in 1 in 16 persons.",
      "B- is a rare blood type found in only 1 in 67 persons.",
      "AB- is the rarest blood group, occurring in only 1 in 167 persons (approx. 0.6% of people).",
    ],
  },
  {
    id: "donors",
    title: "Facts About Donors",
    shortTitle: "Donors",
    icon: "people",
    color: "#059669",
    badge: "Inspiring",
    description: "Insights into why people donate, life-saving impact, and landmark historical milestones.",
    facts: [
      "The number one reason donors say they give blood is because they 'want to help others'.",
      "Two most common reasons cited by people who don't give blood are: 'Never thought about it' and 'I don't like needles'.",
      "One single whole blood donation can help save the lives of up to three people.",
      "If you began donating blood at age 18 and donated every 90 days (males) or 120 days (females) until age 60, you would donate over 30 gallons of blood, potentially saving more than 500 lives!",
      "Only 7 percent of people in India have O-negative blood type. O-negative donors are universal red cell donors because their red cells lack A, B, and Rh antigens.",
      "Type O-negative blood is critically needed in trauma emergencies before the patient's blood type is known, and for newborns needing transfusions.",
      "Thirty-five percent of people have Type O (positive or negative) blood.",
      "0.4 percent of people have AB- blood type. AB-type donors are universal donors of plasma, frequently used in burn trauma and massive transfusions.",
      "There are four main blood types: A, B, AB, and O.",
      "In 1901, Karl Landsteiner, an Austrian physician, discovered the first three human blood groups (A, B, and O). On his birthday, June 14th, 'World Blood Donor Day' is celebrated worldwide. On October 1st, 'National Voluntary Blood Donation Day' is celebrated across India.",
    ],
  },
  {
    id: "components",
    title: "Facts About Blood & Its Components",
    shortTitle: "Components",
    icon: "water",
    color: "#2563EB",
    badge: "Medical",
    description: "How red cells, platelets, plasma, and cryoprecipitate function and their therapeutic lifespans.",
    facts: [
      "Blood makes up about 7 percent of your total body weight.",
      "There are four types of transfusable products derived from blood: red cells, platelets, plasma, and cryoprecipitate. Typically, two or three of these are produced from a single unit of whole blood — hence each donation can save up to three lives.",
      "Donors can give either whole blood or specific blood components only. The process of donating specific blood components — red cells, plasma, or platelets — is called apheresis.",
      "One transfusion dose of platelets can be obtained through one apheresis donation of platelets or by combining platelets derived from five whole-blood donations.",
      "Donated platelets have a short shelf life and must be used within five days of collection.",
      "Healthy bone marrow makes a constant supply of red cells, plasma, and platelets. The body will replenish elements given during a donation — plasma in 24–48 hours, and red cells within a few weeks.",
    ],
  },
  {
    id: "supply",
    title: "Facts About the Blood Supply",
    shortTitle: "Supply",
    icon: "cube",
    color: "#D97706",
    badge: "Lifeline",
    description: "Why artificial substitutes cannot replace human blood and the critical need for steady reserves.",
    facts: [
      "Blood cannot be manufactured — it can only come from generous voluntary donors.",
      "Type O-negative blood (red cells) can be transfused to patients of all blood types. It is always in great demand and often in short supply.",
      "Type AB-positive plasma can be transfused to patients of all other blood types. AB plasma is also usually in short supply.",
      "Red blood cells have a shelf life of only 35 to 42 days, making continuous voluntary donations essential to prevent life-threatening hospital shortages.",
      "During holidays and monsoon periods, blood donations drop significantly while emergency demand continues unabated.",
    ],
  },
  {
    id: "needs",
    title: "Facts About Blood Needs",
    shortTitle: "Needs",
    icon: "pulse",
    color: "#E11D48",
    badge: "Emergency",
    description: "Urgent healthcare demands, trauma statistics, and recurring patient dependencies.",
    facts: [
      "Every 2 seconds, someone in India needs blood or blood components for emergency treatment or surgeries.",
      "Approximately 1 in 7 patients entering a major hospital will require a life-saving blood transfusion.",
      "Thalassemia and sickle cell anemia patients require regular blood transfusions every 2 to 4 weeks throughout their lives to survive.",
      "Cancer patients undergoing intensive chemotherapy routinely require daily platelet and red cell transfusions.",
      "Severe road traffic accident victims may require up to 50 to 100 units of blood within the first few hours.",
    ],
  },
  {
    id: "process",
    title: "Facts About the Donation Process",
    shortTitle: "Process",
    icon: "checkmark-circle",
    color: "#0891B2",
    badge: "Safe & Easy",
    description: "The 4-step seamless, hygienic donation experience taking less than 30 minutes total.",
    facts: [
      "Blood donation is 100% safe. Sterile, single-use disposable needles and collection kits are used once and safely incinerated. There is zero risk of acquiring any infection.",
      "The actual blood draw takes only 8 to 10 minutes. The entire appointment — including registration, mini-health check, and refreshments — takes less than 30–40 minutes.",
      "A healthy adult has about 5 liters (10–12 pints) of blood. A standard whole blood donation is only about 350 to 450 mL (less than 10% of total volume).",
      "Before donating, a medical officer checks your temperature, pulse, blood pressure, and hemoglobin levels with a quick finger prick.",
      "After donating, resting for 10–15 minutes and drinking fruit juice or water completely rehydrates your body.",
    ],
  },
  {
    id: "examples",
    title: "Example of Blood Use",
    shortTitle: "Examples",
    icon: "medkit",
    color: "#7C3AED",
    badge: "Clinical",
    description: "Typical blood component quantities required for critical medical procedures and surgeries.",
    facts: [
      "Severe automobile accident trauma: Up to 50 units of red blood cells and 20 units of platelets.",
      "Cardiovascular bypass surgery: Typically requires 2 to 6 units of whole blood or red cells.",
      "Organ transplant surgery (liver, heart, kidney): Frequently requires 10 to 20 units of red cells, platelets, and fresh frozen plasma.",
      "Bone marrow transplant: Patients typically require up to 20 units of red cells and 25 units of platelets.",
      "Complicated childbirth / postpartum hemorrhage: Often requires 2 to 4 units of packed red blood cells immediately to save the mother's life.",
      "Severe burn injuries: Require large volumes of fresh frozen plasma (up to 20 units) to restore electrolytes and vascular volume.",
    ],
  },
  {
    id: "who_can",
    title: "Who Can Donate",
    shortTitle: "Eligible",
    icon: "hand-right",
    color: "#16A34A",
    badge: "Criteria",
    description: "Standard physiological prerequisites to qualify as a voluntary whole-blood donor.",
    facts: [
      "Age: Must be between 18 and 65 years old.",
      "Weight: Minimum body weight of 45 kg (50 kg recommended for 450 mL donation).",
      "Hemoglobin: Minimum hemoglobin level of 12.5 g/dL (tested quickly via safe finger-prick).",
      "Deferral Interval: Must observe a mandatory gap of 90 days for males and 120 days for females since last whole-blood donation.",
      "Blood Pressure & Pulse: Systolic 100-140 mmHg, Diastolic 60-90 mmHg, Pulse 60-100 beats per minute.",
      "Well-being: Feeling healthy and well on the day of donation, well-rested, and well-hydrated.",
    ],
  },
  {
    id: "who_cannot",
    title: "Who Cannot Donate",
    shortTitle: "Deferrals",
    icon: "shield-half",
    color: "#B45309",
    badge: "Safety",
    description: "Temporary and permanent deferral guidelines under NBTC Feb 2025 standards.",
    facts: [
      "Temporary Deferral - Alcohol Consumption: Defer for at least 24 hours after alcohol intake.",
      "Temporary Deferral - Tattoos & Body Piercing: Defer for 6 to 12 months after procedure.",
      "Temporary Deferral - Dental Procedures: Defer for 48 hours (cleaning/filling) or 14 days (extraction/root canal).",
      "Temporary Deferral - Pregnancy & Lactation: Defer during pregnancy and for 12 months post-delivery.",
      "Temporary Deferral - Acute Infections & Antibiotics: Defer until fully recovered and at least 14 days after completing antibiotic courses.",
      "Permanent Deferral: Individuals with active Hepatitis B or C, HIV/AIDS, cardiovascular disease, chronic renal disease, epilepsy on active medication, or bleeding disorders are permanently deferred to safeguard both donor and recipient.",
    ],
  },
];

export const DID_YOU_KNOW_HIGHLIGHTS = [
  {
    id: "1",
    tag: "Life Saver",
    headline: "1 Donation = Up to 3 Lives Saved",
    body: "Whole blood is separated into red cells, platelets, and plasma, helping up to three different patients in need.",
    icon: "heart-circle",
    accent: "#DC2626",
  },
  {
    id: "2",
    tag: "Body Science",
    headline: "Blood is 7% of Your Body Weight",
    body: "A standard donation is only ~450 mL (less than 10% of total volume), which your body replenishes in days.",
    icon: "water",
    accent: "#0284C7",
  },
  {
    id: "3",
    tag: "Universal Donor",
    headline: "O- Negative: Emergency Lifesaver",
    body: "Only 7% of people in India have O- blood. It can be given to anyone in sudden trauma before their blood group is known.",
    icon: "shield-checkmark",
    accent: "#D97706",
  },
  {
    id: "4",
    tag: "Global Days",
    headline: "World Blood Donor Day: June 14",
    body: "Honors Karl Landsteiner, who discovered the ABO blood groups in 1901. India also marks National Donation Day on Oct 1.",
    icon: "calendar",
    accent: "#7C3AED",
  },
  {
    id: "5",
    tag: "Platelets",
    headline: "Platelets Last Only 5 Days",
    body: "Platelets have a critical 5-day shelf life, making regular apheresis donors indispensable for cancer patients.",
    icon: "pulse",
    accent: "#059669",
  },
];
