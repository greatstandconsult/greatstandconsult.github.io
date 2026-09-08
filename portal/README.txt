GREAT STAND EDUCATIONAL CONSULT — PORTAL V17

V17 keeps the working V16 student-management/login system and adds:

1. BULK CBT CREATION
   - Add Manually
   - Paste Questions
   - Paste CSV
   - Supports 50, 100, 150+ questions
   - Recognizes ANSWER:, Answer =, Correct Answer:, etc.
   - Optional question explanations/corrections
   - Preview before publishing

2. STUDY MATERIALS
   - Admin/Superadmin can publish a material title, subject, category,
     description and public PDF/material link.
   - Students can filter All, JAMB, WAEC or Other and open/download the material.

IMPORTANT:
- Keep portal/firebase.js as the working Firebase configuration.
- The corrected student-creation API key is already included in portal.js.
- This version does not change Firestore rules.
- Study Materials V17 uses a public PDF/material URL rather than Firebase Storage upload,
  so no Storage setup is required for this version.
