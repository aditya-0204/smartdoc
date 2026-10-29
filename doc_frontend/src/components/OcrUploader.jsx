// src/components/OcrUploader.js
import React, { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

/* ------------------------------------------------------------------ *
 *  DOCUMENT CATALOGUE (India)
 *  To support a new document, append an object to DOC_TYPES.
 * ------------------------------------------------------------------ */
// Catalogue of documents commonly used in India.
// To support a new document, just append an object to DOC_TYPES:
//   key        unique id
//   name       label shown to the user
//   group      one of DOC_GROUPS (used for the dropdown)
//   hasExpiry  true if the document normally expires (only sets the default of the "no expiry" checkbox)
//   match      regexes; any hit makes the type a candidate (more hits = higher score)
//   require    optional regexes that must ALL match for the type to be a candidate
//   findId     optional (text) => string|null. If missing, the generic "ID No / Reg No / ..." search is used.

/* ---------- small helpers ---------- */
const rx = (re, group = 1) => (text) => {
  const m = text.match(re);
  return m ? m[group] : null;
};

// "<label>: <value>" finder; the value must contain at least one digit
const lab = (label, value = String.raw`[A-Z0-9][A-Z0-9\/\-]{4,24}`) => {
  const re = new RegExp(String.raw`(?:${label})\.?\s*[:\-—#]*\s*(${value})`, 'i');
  return (text) => {
    const m = text.match(re);
    return m && /\d/.test(m[1]) ? m[1] : null;
  };
};

const first = (...fns) => (text) => {
  for (const f of fns) {
    const v = f(text);
    if (v) return v;
  }
  return null;
};

const aadhaarId = (text) => {
  let m = text.match(/(?:X{4}|\*{4})[\sX*\-]*(\d{4})/i);
  if (m) return `XXXX XXXX ${m[1]}`;
  m = text.match(/\b(\d{4})\s(\d{4})\s(\d{4})\b/);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : null;
};

// MH12AB1234, TN-09-AB-1234, 22BH1234AA (Bharat series)
const vehicleNo = (text) => {
  const m =
    text.match(/\b(\d{2}[\s\-]?BH[\s\-]?\d{4}[\s\-]?[A-Z]{2})\b/) ||
    text.match(/\b([A-Z]{2}[\s\-]?\d{1,2}[\s\-]?[A-Z]{1,3}[\s\-]?\d{4})\b/);
  return m ? m[1].replace(/[\s\-]/g, '') : null;
};

const DL_NO = rx(/\b([A-Z]{2}[\s\-]?\d{2}[\s\-]?(?:19|20)\d{2}[\s\-]?\d{7})\b/);
const POLICY = String.raw`policy\s*(?:no|number)`;
const CERT_NO = String.raw`certificate\s*(?:no|number|id)`;
const REG_NO = String.raw`registration\s*(?:no|number)|reg\.?\s*(?:no|number)`;
const CONSUMER_NO = String.raw`consumer\s*(?:no|number|id)`;

const DOC_GROUPS = [
  'Identity',
  'Vehicle',
  'Insurance & Finance',
  'Tax & Business',
  'Employment & Pension',
  'Education',
  'Certificates',
  'Health',
  'Utilities & Property',
  'Travel',
];

const DOC_TYPES = [
  /* ================= Identity ================= */
  {
    key: 'aadhaar', name: 'Aadhaar Card', group: 'Identity', hasExpiry: false,
    match: [/aadhaa?r/i, /unique\s*identification/i, /\buidai\b/i, /आधार/],
    findId: aadhaarId,
  },
  {
    key: 'pan', name: 'PAN Card', group: 'Identity', hasExpiry: false,
    match: [/permanent\s*account\s*number/i, /income\s*tax\s*department/i, /\bpan\s*card\b/i, /आयकर\s*विभाग/],
    findId: rx(/\b([A-Z]{5}\d{4}[A-Z])\b/),
  },
  {
    key: 'voter', name: 'Voter ID (EPIC)', group: 'Identity', hasExpiry: false,
    match: [/voter/i, /election\s*commission/i, /\bepic\b/i, /निर्वाचन/, /electoral\s*(?:identity|photo)/i],
    findId: rx(/\b([A-Z]{3}\d{7})\b/),
  },
  {
    key: 'passport', name: 'Passport', group: 'Identity', hasExpiry: true,
    match: [/passport/i, /\bP<IND/i],
    findId: rx(/\b([A-PR-WY]\d{7})\b/),
  },
  {
    key: 'learner', name: "Learner's Licence", group: 'Identity', hasExpiry: true,
    match: [/learner'?s?\s*(?:driving\s*)?licen[cs]e/i, /\blearner\b/i, /\bll\s*no\b/i],
    findId: DL_NO,
  },
  {
    key: 'dl', name: "Driver's License", group: 'Identity', hasExpiry: true,
    match: [/driving\s*licen[cs]e/i, /driver'?s?\s*licen[cs]e/i, /\bdl\s*no\b/i, /ड्राइविंग/],
    findId: DL_NO,
  },
  {
    key: 'ration', name: 'Ration Card', group: 'Identity', hasExpiry: false,
    match: [/ration\s*card/i, /public\s*distribution/i, /food\s*(?:and|&)\s*civil\s*supplies/i],
    findId: lab(String.raw`ration\s*card\s*(?:no|number)`, String.raw`[A-Z0-9\/\-]{6,20}`),
  },
  {
    key: 'oci', name: 'OCI Card', group: 'Identity', hasExpiry: false,
    match: [/overseas\s*citizen\s*of\s*india/i, /\boci\b/i],
    findId: lab(REG_NO, String.raw`[A-Z0-9]{6,20}`),
  },
  {
    key: 'udid', name: 'Disability Card (UDID)', group: 'Identity', hasExpiry: false,
    match: [/\budid\b/i, /unique\s*disability/i, /disabilit(?:y|ies)\s*certificate/i],
    findId: rx(/\b([A-Z]{2}\d{14,18})\b/),
  },
  {
    key: 'senior', name: 'Senior Citizen Card', group: 'Identity', hasExpiry: false,
    match: [/senior\s*citizen/i],
  },

  /* ================= Vehicle ================= */
  {
    key: 'rc', name: 'Vehicle RC (Registration Certificate)', group: 'Vehicle', hasExpiry: true,
    require: [/registration\s*certificate/i],
    match: [/chassis/i, /engine\s*no/i, /owner\s*name/i, /\bregn?\.?\s*(?:no|validity)/i],
    findId: vehicleNo,
  },
  {
    key: 'vehins', name: 'Vehicle Insurance', group: 'Vehicle', hasExpiry: true,
    require: [/insurance/i, /(motor|vehicle|two\s*wheeler|private\s*car|\bidv\b|chassis)/i],
    match: [/motor\s*insurance/i, /\bidv\b/i, /chassis/i, /third\s*party/i, /package\s*polic/i],
    findId: first(lab(POLICY), vehicleNo),
  },
  {
    key: 'puc', name: 'PUC Certificate', group: 'Vehicle', hasExpiry: true,
    match: [/pollution\s*under\s*control/i, /\bpuc\b/i, /emission\s*test/i],
    findId: first(lab(CERT_NO), lab(String.raw`puc\s*(?:no|number)`), vehicleNo),
  },
  {
    key: 'fitness', name: 'Vehicle Fitness Certificate', group: 'Vehicle', hasExpiry: true,
    match: [/fitness\s*certificate/i, /certificate\s*of\s*fitness/i],
    findId: first(lab(CERT_NO), vehicleNo),
  },

  /* ================= Insurance & Finance ================= */
  {
    key: 'healthins', name: 'Health Insurance', group: 'Insurance & Finance', hasExpiry: true,
    require: [/insurance/i, /(health|mediclaim|medical|cashless|sum\s*insured|\btpa\b)/i],
    match: [/health\s*insurance/i, /mediclaim/i, /sum\s*insured/i, /cashless/i, /\btpa\b/i],
    findId: lab(POLICY),
  },
  {
    key: 'lifeins', name: 'Life Insurance', group: 'Insurance & Finance', hasExpiry: true,
    require: [/(insurance|assurance|\blic\b)/i],
    match: [/life\s*insurance/i, /\blic\b/i, /sum\s*assured/i, /maturity/i, /premium\s*paying/i],
    findId: lab(POLICY),
  },
  {
    key: 'insurance', name: 'Insurance Policy', group: 'Insurance & Finance', hasExpiry: true,
    match: [/insurance/i, /policy\s*(?:no|number)/i],
    findId: lab(POLICY),
  },
  {
    key: 'bank', name: 'Bank Passbook / Statement', group: 'Insurance & Finance', hasExpiry: false,
    match: [/passbook/i, /\bifsc\b/i, /account\s*(?:no|number)/i, /bank\s*statement/i],
    findId: lab(String.raw`(?:account|a\/c)\s*(?:no|number)`, String.raw`[X*\d]{9,18}`),
  },
  {
    key: 'itr', name: 'Income Tax Return (ITR-V)', group: 'Insurance & Finance', hasExpiry: false,
    match: [/itr-?v/i, /acknowledgement\s*(?:no|number)/i, /income\s*tax\s*return/i],
    findId: lab(String.raw`acknowledgement\s*(?:no|number)`, String.raw`\d{15}`),
  },
  {
    key: 'form16', name: 'Form 16 (TDS Certificate)', group: 'Insurance & Finance', hasExpiry: false,
    match: [/\bform\s*(?:no\.?\s*)?16\b/i, /tax\s*deducted\s*at\s*source/i, /\btan\b/i],
    findId: first(lab(CERT_NO), rx(/\b([A-Z]{4}\d{5}[A-Z])\b/)),
  },

  /* ================= Tax & Business ================= */
  {
    key: 'gst', name: 'GST Registration', group: 'Tax & Business', hasExpiry: false,
    match: [/\bgstin\b/i, /goods\s*(?:and|&)\s*services\s*tax/i, /gst\s*registration/i],
    findId: rx(/\b(\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/),
  },
  {
    key: 'udyam', name: 'Udyam (MSME) Registration', group: 'Tax & Business', hasExpiry: false,
    match: [/udyam/i, /\bmsme\b/i],
    findId: (t) => {
      const m = t.match(/\b(UDYAM[\s\-]?[A-Z]{2}[\s\-]?\d{2}[\s\-]?\d{7})\b/i);
      return m ? m[1].toUpperCase().replace(/\s+/g, '-') : null;
    },
  },
  {
    key: 'fssai', name: 'FSSAI Licence', group: 'Tax & Business', hasExpiry: true,
    match: [/fssai/i, /food\s*safety\s*(?:and|&)\s*standards/i],
    findId: rx(/\b(\d{14})\b/),
  },
  {
    key: 'iec', name: 'Import Export Code (IEC)', group: 'Tax & Business', hasExpiry: false,
    match: [/import\s*export\s*code/i, /\biec\b/i],
    findId: lab(String.raw`(?:iec|import\s*export\s*code)\s*(?:no|number)?`, String.raw`[A-Z0-9]{10}`),
  },
  {
    key: 'shop', name: 'Shop & Establishment / Trade Licence', group: 'Tax & Business', hasExpiry: true,
    match: [/shops?\s*(?:and|&)\s*establishment/i, /trade\s*licen[cs]e/i],
    findId: first(lab(String.raw`licen[cs]e\s*(?:no|number)`), lab(REG_NO), lab(CERT_NO)),
  },
  {
    key: 'incorp', name: 'Certificate of Incorporation', group: 'Tax & Business', hasExpiry: false,
    match: [/certificate\s*of\s*incorporation/i, /ministry\s*of\s*corporate\s*affairs/i, /\bcin\b/i],
    findId: rx(/\b([LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6})\b/),
  },

  /* ================= Employment & Pension ================= */
  {
    key: 'empid', name: 'Employee ID Card', group: 'Employment & Pension', hasExpiry: true,
    match: [/employee\s*(?:id|card|code)/i, /\bemp\.?\s*(?:id|code|no)\b/i, /staff\s*(?:id|card)/i],
  },
  {
    key: 'uan', name: 'EPFO / UAN', group: 'Employment & Pension', hasExpiry: false,
    match: [/\buan\b/i, /universal\s*account\s*number/i, /\bepfo\b/i, /provident\s*fund/i],
    findId: lab(String.raw`(?:uan|universal\s*account\s*number)`, String.raw`\d{12}`),
  },
  {
    key: 'esic', name: 'ESIC Card', group: 'Employment & Pension', hasExpiry: false,
    match: [/\besic\b/i, /employees'?\s*state\s*insurance/i],
    findId: lab(String.raw`(?:ip|insurance)\s*(?:no|number)`, String.raw`\d{10,17}`),
  },
  {
    key: 'eshram', name: 'e-Shram Card', group: 'Employment & Pension', hasExpiry: false,
    match: [/e-?shram/i],
    findId: rx(/\b(\d{12})\b/),
  },
  {
    key: 'nps', name: 'NPS (PRAN) Card', group: 'Employment & Pension', hasExpiry: false,
    match: [/\bpran\b/i, /national\s*pension\s*system/i],
    findId: first(lab(String.raw`pran`, String.raw`\d{12}`), rx(/\b(\d{12})\b/)),
  },
  {
    key: 'ppo', name: 'Pension Payment Order (PPO)', group: 'Employment & Pension', hasExpiry: false,
    match: [/pension\s*payment\s*order/i, /\bppo\b/i],
    findId: lab(String.raw`ppo\s*(?:no|number)`),
  },

  /* ================= Education ================= */
  {
    key: 'marksheet', name: 'Marksheet / Result', group: 'Education', hasExpiry: false,
    match: [
      /mark\s*sheet/i, /statement\s*of\s*marks/i, /grade\s*(?:card|sheet)/i,
      /\bcbse\b/i, /\bicse\b/i, /board\s*of\s*(?:secondary|higher)/i,
    ],
    findId: lab(String.raw`roll\s*(?:no|number)`, String.raw`[A-Z0-9]{5,15}`),
  },
  {
    key: 'degree', name: 'Degree / Provisional Certificate', group: 'Education', hasExpiry: false,
    match: [
      /degree\s*certificate/i, /provisional\s*certificate/i, /convocation/i,
      /hereby\s*(?:awarded|conferred)/i, /bachelor\s*of/i, /master\s*of/i,
    ],
  },
  {
    key: 'vit', name: 'VIT ID Card', group: 'Education', hasExpiry: true,
    priority: 5, // institution-specific cards beat generic ones
    match: [/vellore\s*institute/i, /\bvit\b/i],
    findId: rx(/\b(\d{2}[A-Z]{3,4}\d{4})\b/i),
  },
  {
    key: 'apar', name: 'Apar ID', group: 'Education', hasExpiry: false,
    match: [/\bapa{1,2}r\s*id\b/i],
    findId: lab(String.raw`apa{1,2}r\s*id`, String.raw`[A-Z0-9@]{6,}`),
  },
  {
    key: 'studentid', name: 'Student ID Card', group: 'Education', hasExpiry: true,
    weak: true, // generic words like "university" should not outvote a specific type
    match: [/student\s*(?:id|identity)/i, /\bcollege\b/i, /\buniversity\b/i, /\binstitute\b/i, /\bbonafide\b/i],
  },

  /* ================= Certificates ================= */
  {
    key: 'birth', name: 'Birth Certificate', group: 'Certificates', hasExpiry: false,
    match: [/birth\s*certificate/i, /certificate\s*of\s*birth/i, /registrar\s*of\s*births/i],
    findId: first(lab(REG_NO), lab(CERT_NO)),
  },
  {
    key: 'death', name: 'Death Certificate', group: 'Certificates', hasExpiry: false,
    match: [/death\s*certificate/i, /certificate\s*of\s*death/i],
    findId: first(lab(REG_NO), lab(CERT_NO)),
  },
  {
    key: 'marriage', name: 'Marriage Certificate', group: 'Certificates', hasExpiry: false,
    match: [/marriage\s*certificate/i, /certificate\s*of\s*marriage/i],
    findId: first(lab(REG_NO), lab(CERT_NO)),
  },
  {
    key: 'caste', name: 'Caste Certificate', group: 'Certificates', hasExpiry: false,
    match: [/caste\s*certificate/i, /\b(?:sc|st|obc)\s*certificate/i, /scheduled\s*(?:caste|tribe)/i],
    findId: first(lab(CERT_NO), lab(String.raw`(?:application|reference)\s*(?:no|number)`)),
  },
  {
    key: 'income', name: 'Income Certificate', group: 'Certificates', hasExpiry: true,
    match: [/income\s*certificate/i],
    findId: first(lab(CERT_NO), lab(String.raw`(?:application|reference)\s*(?:no|number)`)),
  },
  {
    key: 'domicile', name: 'Domicile / Residence Certificate', group: 'Certificates', hasExpiry: false,
    match: [/domicile/i, /residence\s*certificate/i, /resident\s*certificate/i, /nativity/i],
    findId: first(lab(CERT_NO), lab(String.raw`(?:application|reference)\s*(?:no|number)`)),
  },
  {
    key: 'ews', name: 'EWS Certificate', group: 'Certificates', hasExpiry: true,
    match: [/economically\s*weaker/i, /\bews\b/i],
    findId: first(lab(CERT_NO), lab(String.raw`(?:application|reference)\s*(?:no|number)`)),
  },
  {
    key: 'pcc', name: 'Police Clearance Certificate', group: 'Certificates', hasExpiry: true,
    match: [/police\s*clearance/i, /clearance\s*certificate/i, /\bpcc\b/i, /character\s*(?:and|&)?\s*antecedents/i],
    findId: first(lab(String.raw`file\s*(?:no|number)`, String.raw`[A-Z0-9]{8,20}`), lab(CERT_NO)),
  },

  /* ================= Health ================= */
  {
    key: 'covid', name: 'COVID-19 Vaccine Certificate', group: 'Health', hasExpiry: false,
    match: [/covid-?\s?19\s*vaccination/i, /co-?win/i],
    findId: lab(String.raw`certificate\s*id`, String.raw`\d{6,}`),
  },
  {
    key: 'vaccine', name: 'Vaccination Certificate', group: 'Health', hasExpiry: false,
    match: [/vaccination\s*(?:card|certificate)/i, /immuni[sz]ation/i, /yellow\s*fever/i],
  },
  {
    key: 'abha', name: 'ABHA (Health ID) Card', group: 'Health', hasExpiry: false,
    match: [/\babha\b/i, /ayushman\s*bharat\s*health\s*account/i, /ayushman\s*bharat\s*digital\s*mission/i],
    findId: rx(/\b(\d{2}-\d{4}-\d{4}-\d{4})\b/),
  },
  {
    key: 'pmjay', name: 'Ayushman Bharat (PM-JAY) Card', group: 'Health', hasExpiry: false,
    match: [/pm-?jay/i, /ayushman\s*bharat/i, /ayushman\s*card/i],
    findId: lab(String.raw`(?:ayushman\s*id|card\s*(?:no|number)|beneficiary\s*id)`, String.raw`[A-Z0-9\-]{8,20}`),
  },

  /* ================= Utilities & Property ================= */
  {
    key: 'electricity', name: 'Electricity Bill', group: 'Utilities & Property', hasExpiry: false,
    match: [/electricity/i, /\bkwh\b/i, /discom|bescom|tneb|tangedco|msedcl|bses|tata\s*power/i],
    findId: lab(CONSUMER_NO, String.raw`[A-Z0-9\-\/]{6,20}`),
  },
  {
    key: 'lpg', name: 'LPG / Gas Connection', group: 'Utilities & Property', hasExpiry: false,
    match: [/\blpg\b/i, /indane|bharat\s*gas|hp\s*gas/i],
    findId: lab(String.raw`(?:lpg\s*id|consumer\s*(?:no|number))`, String.raw`\d{10,17}`),
  },
  {
    key: 'rent', name: 'Rent Agreement', group: 'Utilities & Property', hasExpiry: true,
    match: [/rent\s*agreement/i, /leave\s*(?:and|&)\s*licen[cs]e/i, /tenancy/i, /\b(?:lessor|lessee|landlord|tenant)\b/i],
  },
  {
    key: 'saledeed', name: 'Property / Sale Deed', group: 'Utilities & Property', hasExpiry: false,
    match: [/sale\s*deed/i, /sub-?\s*registrar/i, /property\s*registration/i],
    findId: first(lab(String.raw`document\s*(?:no|number)`), lab(REG_NO)),
  },

  /* ================= Travel ================= */
  {
    key: 'visa', name: 'Visa', group: 'Travel', hasExpiry: true,
    match: [/\bvisa\b/i],
    findId: lab(String.raw`visa\s*(?:no|number)`, String.raw`[A-Z0-9]{6,15}`),
  },
  {
    key: 'railpass', name: 'Railway Pass / Concession', group: 'Travel', hasExpiry: true,
    match: [/railway\s*(?:pass|concession)/i, /season\s*ticket/i],
  },

  {
    key: 'proofage', name: 'Proof of Age Card', group: 'Identity', hasExpiry: true,
    match: [/proof\s*of\s*age/i, /\bpass\s*card\b/i],
    findId: (t) => {
      const m = t.match(/(?<!\d)\d{4}(?:[ \-]\d{4}){2,3}(?!\d)/);
      return m ? m[0] : null;
    },
  },

  /* ================= Generic fallback (keep last) ================= */
  {
    key: 'idcard', name: 'ID Card', group: 'Identity', hasExpiry: true,
    match: [/\bid\s*card\b/i, /identity\s*card/i],
  },
];

// Picks the best-matching type: most pattern hits wins, ties go to the earlier entry
const classifyDocument = (text) => {
  let best = null;
  let bestScore = 0;
  for (const t of DOC_TYPES) {
    if (t.require && !t.require.every((re) => re.test(text))) continue;
    const hits = t.match.filter((re) => re.test(text)).length;
    if (!hits) continue;
    const score = hits * (t.weak ? 0.4 : 1) + (t.require ? t.require.length : 0) + (t.priority || 0);
    if (score > bestScore) {
      best = t;
      bestScore = score;
    }
  }
  return best;
};


/* ------------------------------------------------------------------ *
 *  1. DATE PARSING
 * ------------------------------------------------------------------ */
const MONTH_INDEX = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const MONTH_RE =
  '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const monthNum = (s) => MONTH_INDEX[s.slice(0, 3).toLowerCase()];
const pad = (n) => String(n).padStart(2, '0');
const lastDayOfMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const fullYear = (s) => {
  const n = Number(s);
  if (s.length === 4) return n;
  return n < 70 ? 2000 + n : 1900 + n;
};

// Returns "YYYY-MM-DD" or null if the date is not valid
const buildISO = (y, m, d) => {
  if (!y || !m || !d) return null;
  if (y < 1990 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > lastDayOfMonth(y, m)) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
};

// Finds every date in the text, supporting many formats
const findDates = (text) => {
  const found = [];
  const covered = [];
  const overlaps = (s, e) => covered.some(([a, b]) => s < b && e > a);

  const patterns = [
    // 2027-03-15 , 2027/03/15
    {
      re: /\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g,
      fn: (m) => buildISO(+m[1], +m[2], +m[3]),
    },
    // 15/03/2027 , 15-03-27 , 15.03.2027
    {
      re: /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}|\d{2})\b/g,
      fn: (m) => buildISO(fullYear(m[3]), +m[2], +m[1]),
    },
    // 15 March 2027 , 15-Mar-2027 , 15th Mar, 2027
    {
      re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-,.]*${MONTH_RE}\\b\\.?[\\s\\-,.]*(\\d{4})\\b`, 'gi'),
      fn: (m) => buildISO(+m[3], monthNum(m[2]), +m[1]),
    },
    // March 15, 2027
    {
      re: new RegExp(`\\b${MONTH_RE}\\b\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'gi'),
      fn: (m) => buildISO(+m[3], monthNum(m[1]), +m[2]),
    },
    // March 2027  -> last day of that month
    {
      re: new RegExp(`\\b${MONTH_RE}\\b\\.?[\\s\\-,.]+(\\d{4})\\b`, 'gi'),
      fn: (m) => {
        const y = +m[2];
        const mo = monthNum(m[1]);
        return buildISO(y, mo, lastDayOfMonth(y, mo));
      },
    },
    // 03/2027 , 03-2027  -> last day of that month (cards often print only month/year)
    {
      re: /\b(0?[1-9]|1[0-2])[\/\-](\d{4})\b/g,
      fn: (m) => {
        const y = +m[2];
        const mo = +m[1];
        return buildISO(y, mo, lastDayOfMonth(y, mo));
      },
    },
  ];

  for (const { re, fn } of patterns) {
    for (const m of text.matchAll(re)) {
      const start = m.index;
      const end = start + m[0].length;
      if (overlaps(start, end)) continue;
      const iso = fn(m);
      if (!iso) continue;
      covered.push([start, end]);
      found.push({ iso, index: start, raw: m[0] });
    }
  }
  return found.sort((a, b) => a.index - b.index);
};

const EXPIRY_KW =
  /(valid\s*(?:up\s*to|upto|till|until|through|thru|to)|validity|expiry|expires?|expiration|expiring|exp\.?\s*date|date\s*of\s*expiry|renewal\s*due|next\s*due|policy\s*end|end\s*date|fitness\s*(?:valid\s*)?upto|tax\s*(?:paid\s*)?upto|regn?\.?\s*validity|insurance\s*(?:valid\s*)?upto|period\s*of\s*insurance|date\s*of\s*maturity|maturity\s*date)/gi;
const NON_EXPIRY_KW =
  /(date\s*of\s*birth|d\.?o\.?b|birth|issued?|date\s*of\s*issue|\bdoi\b|dispatch|printed|generated|dated|effective|valid\s*from|start\s*date|from)/gi;

const lastMatchEnd = (re, str) => {
  let end = -1;
  for (const m of str.matchAll(new RegExp(re.source, 'gi'))) end = m.index + m[0].length;
  return end;
};

// Picks the expiry date using nearby keywords; also returns all dates found
const extractExpiry = (text) => {
  const dates = findDates(text);
  const candidates = [];

  for (const d of dates) {
    const window = text.slice(Math.max(0, d.index - 45), d.index);
    const expEnd = lastMatchEnd(EXPIRY_KW, window);
    const nonEnd = lastMatchEnd(NON_EXPIRY_KW, window);
    const isRangeEnd = /\b(?:to|till|until)\s*[:\-]?\s*$/i.test(window);
    if ((expEnd > -1 && expEnd > nonEnd) || isRangeEnd) candidates.push(d.iso);
  }

  const allDates = [...new Set(dates.map((d) => d.iso))].sort().reverse();
  const expiry = candidates.length ? candidates.sort().reverse()[0] : null;
  return { expiry, allDates };
};

/* ------------------------------------------------------------------ *
 *  2. DOCUMENT TYPE + ID PARSING
 * ------------------------------------------------------------------ */
const LABELLED_ID =
  /(?:certificate\s*(?:id|no|number)|licen[cs]e\s*(?:no|number)|passport\s*(?:no|number)|policy\s*(?:no|number)|reg(?:istration)?\.?\s*(?:id|no)|enrol(?:l)?ment\s*(?:id|no)|roll\s*(?:no|number)|employee\s*id|member\s*id|card\s*(?:no|number)|document\s*(?:no|number)|id\s*(?:no|number)|ref(?:erence)?\s*(?:no|number))\.?\s*[:\-—#]*\s*([A-Z0-9][A-Z0-9\-\/]{4,24})/gi;


// Remove phone-like numbers so they are never mistaken for a document ID
const stripPhones = (text) =>
  text
    // anything labelled as a phone/fax/contact number, even if the number is on the next line
    .replace(/\b(?:contact|mobile|mob|phone|ph|tel|fax|whatsapp|helpline)[\s.:\-#a-z]{0,12}[\s:+\-\d()]{8,}/gi, ' ')
    // +91 / 0091 / 91 prefixed numbers
    .replace(/(?:\+91|\b0091|\b91)[\s\-]?\(?\d{2,5}\)?[\s\-]?\d{3,5}[\s\-]?\d{3,5}/g, ' ')
    // plain 10-digit Indian mobile numbers (start with 6-9)
    .replace(/\b[6-9]\d{9}\b/g, ' ');

const extractDocumentId = (text, type) => {
  // 1) type-specific format
  if (type) {
    const id = type.findId ? type.findId(text) : null;
    if (id) return id.trim();
  }
  // 2) labelled generic ("ID No: ...", "Licence No ...")
  for (const m of text.matchAll(LABELLED_ID)) {
    if (/\d/.test(m[1])) return m[1];
  }
  // 2b) label and value separated (table layout):
  //     "CARD NO.  DATE OF BIRTH  EXPIRY DATE \n BELO-56656  24/07/1995  20/07/2030"
  const clean = stripPhones(text);
  const LABEL_ONLY =
    /\b(?:card|licen[cs]e|passport|policy|registration|reg|epic|document|enrol(?:l)?ment|roll|member|employee|serial|certificate|reference|ref|id)\.?\s*(?:no|number|id|#)\b\.?/gi;
  for (const lm of clean.matchAll(LABEL_ONLY)) {
    const from = lm.index + lm[0].length;
    const after = clean
      .slice(from, from + 160)
      .replace(/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g, ' ') // dates
      .replace(new RegExp(`\\b${MONTH_RE}[a-z]*[\\s\\-]+\\d{4}\\b`, 'gi'), ' '); // JUL-2027
    const tok = after.match(/(?<![A-Za-z0-9])(?=[A-Z0-9\-\/]*\d)[A-Z0-9][A-Z0-9\-\/]{4,24}(?![A-Za-z0-9])/);
    if (tok) return tok[0];
  }

  // 3) generic shapes (phone numbers already removed)
  let m = clean.match(/\b[A-Z]{1,3}\d{6,12}\b/);
  if (m) return m[0];
  m = clean.match(/\b[A-Z]{2,6}-\d{5,10}\b/); // BELO-56656
  if (m) return m[0];
  m = clean.match(/\b\d{2}[A-Z]{2,4}\d{3,5}\b/); // roll/registration style: 23BPS1185
  if (m) return m[0];
  // card numbers printed in groups: 5843 2166 1964 2184 / 1234-5678-9012
  m = clean.match(/(?<!\d)\d{4}(?:[ \-]\d{4}){2,3}(?!\d)/);
  if (m) return m[0];
  m = clean.match(/\b\d{8,16}\b/);
  return m ? m[0] : null;
};

// If the type is unknown, take the first meaningful line as a title suggestion
const guessTitle = (text) => {
  const line = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /[A-Za-z]{4,}/.test(l) && l.length <= 50);
  return line || '';
};

const normalizeText = (raw) =>
  raw
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

const analyzeText = (rawText) => {
  const text = normalizeText(rawText);
  const type = classifyDocument(text);
  const { expiry, allDates } = extractExpiry(text);
  return {
    text,
    typeKey: type ? type.key : 'other',
    name: type ? type.name : guessTitle(text),
    docNumber: extractDocumentId(text, type) || '',
    expiry: expiry || '',
    allDates,
    hasExpiryByDefault: type ? type.hasExpiry : true,
  };
};

/* ------------------------------------------------------------------ *
 *  3. FILE PROCESSING HELPERS
 * ------------------------------------------------------------------ */
const MAX_FILE_MB = 15;

// Upscale + grayscale + contrast boost = noticeably better OCR on phone photos
const preprocessImage = async (file) => {
  try {
    const bmp = await createImageBitmap(file);
    const scale = bmp.width < 1600 ? 1600 / bmp.width : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const c = Math.max(0, Math.min(255, (g - 128) * 1.4 + 128));
      d[i] = d[i + 1] = d[i + 2] = c;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  } catch {
    return file; // fall back to the raw file
  }
};

const pageTextLayer = async (page) => {
  const content = await page.getTextContent();
  let out = '';
  for (const item of content.items) {
    out += item.str + (item.hasEOL ? '\n' : ' ');
  }
  return out;
};

const daysUntil = (iso) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(`${iso}T00:00:00`) - today) / 86400000);
};

/* ------------------------------------------------------------------ *
 *  4. COMPONENT
 * ------------------------------------------------------------------ */
const EMPTY_FORM = { typeKey: 'other', name: '', docNumber: '', expiry: '', noExpiry: false };

export const OcrUploader = ({ onScanComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // raw analysis
  const [form, setForm] = useState(EMPTY_FORM); // user-editable values
  const fileInputRef = useRef(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
  }, []);

  const recognize = async (source, lang, label) => {
    const { data } = await Tesseract.recognize(source, lang, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setStatusMessage(`${label} ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    return { text: data.text || '', confidence: data.confidence || 0 };
  };

  // OCR is language-automatic: English first (fast). If the result looks weak
  // (low confidence or almost no readable English words) it may be a Hindi
  // document, so we retry with English+Hindi and keep the better result.
  const looksWeak = (r) =>
    r.confidence < 72 || (r.text.match(/[A-Za-z]{3,}/g) || []).length < 8;

  const runOcr = async (source, label) => {
    const first = await recognize(source, 'eng', label);
    if (!looksWeak(first)) return first.text;
    try {
      const second = await recognize(source, 'eng+hin', `${label} (checking Hindi)`);
      return second.confidence > first.confidence ? second.text : first.text;
    } catch (e) {
      console.warn('Hindi OCR pass failed, using English result:', e);
      return first.text;
    }
  };

  const processImage = async (file) => {
    setStatusMessage('Preparing image...');
    const prepared = await preprocessImage(file);
    return runOcr(prepared, 'Recognizing text...');
  };

  const processPdf = async (file) => {
    setStatusMessage('Loading PDF...');
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      setStatusMessage(`Reading page ${i} of ${pdf.numPages}...`);
      const page = await pdf.getPage(i);

      // Fast path: digital PDFs already contain real text
      let text = await pageTextLayer(page);

      // Slow path: scanned PDFs -> render page and OCR it
      if (text.replace(/\s/g, '').length < 30) {
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        text = await runOcr(canvas, `OCR page ${i}/${pdf.numPages}:`);
      }
      fullText += text + '\n';
    }
    return fullText;
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    event.target.value = ''; // allows re-selecting the same file
    if (!file) return;

    setError('');
    setResult(null);

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File is too large (max ${MAX_FILE_MB} MB).`);
      return;
    }
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf && !file.type.startsWith('image/')) {
      setError('Unsupported file type. Please upload an image or a PDF.');
      return;
    }

    setIsProcessing(true);
    try {
      const rawText = isPdf ? await processPdf(file) : await processImage(file);
      const analysis = analyzeText(rawText);
      setResult(analysis);
      setForm({
        typeKey: analysis.typeKey,
        name: analysis.name,
        docNumber: analysis.docNumber,
        expiry: analysis.expiry,
        noExpiry: !analysis.expiry && !analysis.hasExpiryByDefault,
      });
    } catch (e) {
      console.error('Document processing failed:', e);
      setError(`Could not process this file: ${e.message || 'unknown error'}`);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const updateForm = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleTypeChange = (key) => {
    const type = DOC_TYPES.find((t) => t.key === key);
    if (type) {
      updateForm({
        typeKey: key,
        name: type.name,
        noExpiry: !type.hasExpiry && !form.expiry,
      });
    } else {
      updateForm({ typeKey: 'other' });
    }
  };

  const handleConfirm = () => {
    if (!form.name.trim()) return;
    const expiry = form.noExpiry || !form.expiry ? 'N/A' : form.expiry;
    onScanComplete?.({
      name: form.name.trim(),
      expiry,
      docNumber: form.docNumber.trim() || 'N/A',
      type: form.name.trim(),
    });
    setResult(null);
    setForm(EMPTY_FORM);
  };

  const handleReset = () => {
    setResult(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  /* ---------- derived UI info ---------- */
  const days = form.expiry && !form.noExpiry ? daysUntil(form.expiry) : null;
  const badge = (found) =>
    found ? (
      <span className="ml-2 text-xs text-green-600 dark:text-green-400">auto-detected</span>
    ) : (
      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">not found, please enter</span>
    );

  const inputCls =
    'mt-1 w-full rounded border px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600';

  return (
    <div className="p-4 border-2 border-dashed dark:border-gray-600 rounded-lg text-center">
      <label htmlFor="file-upload" className="font-semibold text-sm mb-2 block">
        Upload an Image or PDF
      </label>

      <input
        id="file-upload"
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/50 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100"
        disabled={isProcessing}
      />

      {isProcessing && (
        <div className="mt-4">
          <p className="text-sm dark:text-gray-300 animate-pulse">{statusMessage}</p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {result && !isProcessing && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left space-y-3">
          <h4 className="font-bold">Review &amp; confirm</h4>
          <p className="text-xs text-gray-500">
            Check the detected values. Anything missing or wrong can be edited before saving.
          </p>

          {/* Document type */}
          <div>
            <label className="text-sm font-medium">Document type</label>
            <select
              className={inputCls}
              value={form.typeKey}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              {DOC_GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {DOC_TYPES.filter((t) => t.group === g).map((t) => (
                    <option key={t.key} value={t.key}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
              <option value="other">Other / custom</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium">
              Document name {badge(!!result.name)}
            </label>
            <input
              className={inputCls}
              value={form.name}
              placeholder="e.g. Health Insurance"
              onChange={(e) => updateForm({ name: e.target.value })}
            />
          </div>

          {/* ID */}
          <div>
            <label className="text-sm font-medium">
              Document ID / number {badge(!!result.docNumber)}
            </label>
            <input
              className={inputCls}
              value={form.docNumber}
              placeholder="Enter manually if not detected"
              onChange={(e) => updateForm({ docNumber: e.target.value })}
            />
          </div>

          {/* Expiry */}
          <div>
            <label className="text-sm font-medium">
              Expiry date {!form.noExpiry && badge(!!result.expiry)}
            </label>
            <input
              type="date"
              className={inputCls}
              value={form.noExpiry ? '' : form.expiry}
              disabled={form.noExpiry}
              onChange={(e) => updateForm({ expiry: e.target.value })}
            />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.noExpiry}
                onChange={(e) => updateForm({ noExpiry: e.target.checked })}
              />
              This document has no expiry
            </label>

            {days !== null && days < 0 && (
              <p className="mt-1 text-xs text-red-600">This document expired {Math.abs(days)} day(s) ago.</p>
            )}
            {days !== null && days >= 0 && days <= 30 && (
              <p className="mt-1 text-xs text-amber-600">Expires in {days} day(s).</p>
            )}

            {!form.noExpiry && result.allDates.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500">Dates found in the document (tap to use):</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {result.allDates.map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => updateForm({ expiry: d })}
                      className={`text-xs px-2 py-1 rounded-full border ${
                        form.expiry === d
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-700 dark:border-gray-600'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!form.name.trim()}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              Confirm &amp; Save
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded border text-sm dark:border-gray-600"
            >
              Discard
            </button>
          </div>

          <details>
            <summary className="text-xs cursor-pointer text-gray-500">Show Full Extracted Text</summary>
            <pre className="text-xs whitespace-pre-wrap bg-white dark:bg-gray-700 p-2 rounded mt-1">
              {result.text}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};