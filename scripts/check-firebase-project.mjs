import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

for (const file of [".env.local",".env"]) {
  const full=path.join(process.cwd(),file);
  if (fs.existsSync(full)) dotenv.config({path:full,override:false});
}

const expected={
  projectId:"amorabet-f4405",
  apiKey:"AIzaSyBmM5HbRI8KDwDnsVM4UxPABjUXsfElnos",
  authDomain:"amorabet-f4405.firebaseapp.com",
  databaseURL:"https://amorabet-f4405-default-rtdb.firebaseio.com",
  storageBucket:"amorabet-f4405.firebasestorage.app",
  messagingSenderId:"559598024702",
  appId:"1:559598024702:web:f9f028a9fb25100443f2af",
  measurementId:"G-D9W41Y9917",
};

const actual={
  projectId:process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  apiKey:process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  authDomain:process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL,
  storageBucket:process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:process.env.VITE_FIREBASE_APP_ID,
  measurementId:process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let failed=false;
for (const [key,value] of Object.entries(expected)) {
  const ok=actual[key]===value;
  console.log(`${ok?"PASS":"FAIL"} ${key}`);
  if(!ok) {
    console.log(`  expected=${value}`);
    console.log(`  actual=${actual[key]||"<missing>"}`);
    failed=true;
  }
}

const cred=String(process.env.GOOGLE_APPLICATION_CREDENTIALS||"").trim();
if(cred) {
  const resolved=path.isAbsolute(cred)?cred:path.join(process.cwd(),cred);
  if(fs.existsSync(resolved)) {
    const sa=JSON.parse(fs.readFileSync(resolved,"utf8"));
    const same=sa.project_id===expected.projectId;
    console.log(`${same?"PASS":"FAIL"} service-account project_id`);
    if(!same) {
      console.log(`  service-account belongs to: ${sa.project_id||"<missing>"}`);
      console.log(`  expected: ${expected.projectId}`);
      failed=true;
    }
  } else {
    console.log("WARN GOOGLE_APPLICATION_CREDENTIALS file not found yet");
  }
}

if(failed) process.exit(1);
console.log("Firebase project configuration is consistent.");
