import fs from 'fs';

// Static verification of the Dirty Dozen security invariants in firestore.rules
const rules = fs.readFileSync('firestore.rules', 'utf8');

const requiredAssertions: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Default deny catch-all', pattern: /match \/\{document=\*\*\} \{\s*allow read, write: if false;/ },
  { name: 'Verified email check', pattern: /request\.auth\.token\.email_verified == true/ },
  { name: 'Strict ID regex guard', pattern: /id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\)/ },
  { name: 'PII isolation on /users', pattern: /match \/users\/\{userId\}[\s\S]*?allow list: if false;/ },
  { name: 'Book ownerId equality guard', pattern: /data\.ownerId == request\.auth\.uid/ },
  { name: 'Server timestamp enforcement', pattern: /incoming\(\)\.createdAt == request\.time/ },
  { name: 'Note parent book existence check', pattern: /exists\(\/databases\/\$\(database\)\/documents\/books\/\$\(incoming\(\)\.bookId\)\)/ },
  { name: 'Review completed status gate', pattern: /data\.status == '완독'/ },
  { name: 'Review 1-5 rating bounds', pattern: /data\.rating >= 1\s*&&\s*data\.rating <= 5/ },
  { name: 'Secure list query without get()', pattern: /allow list: if existing\(\)\.isPublic == true/ },
];

for (const check of requiredAssertions) {
  if (!check.pattern.test(rules)) {
    throw new Error(`Security rule assertion failed: ${check.name}`);
  }
}

console.log('All Firestore security rule assertions verified.');
