import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, "serviceAccountKey.json"), "utf-8")
);




// // Load your service account JSON
// const serviceAccount = JSON.parse(
//   fs.readFileSync("./serviceAccountKey.json", "utf-8")
// );

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});



// ✅ Export function (what your code expects)
export const getMessagingInstance = () => admin.messaging();