// Prueba de las reglas de «momentos» con el emulador de Firestore (no toca la base real).
//   npm i -D firebase-tools @firebase/rules-unit-testing firebase
//   npx firebase emulators:exec --only firestore --project demo-agape "node scripts/test-reglas-momentos.mjs"
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, deleteField, increment } from "firebase/firestore";

const env = await initializeTestEnvironment({ projectId: "demo-agape", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
const users = {
  coord: { role: "coordinador", active: true, name: "Carla Muñoz", email: "c@x.cl" },
  dir: { role: "dirigente", active: true, name: "Iván Pérez", email: "d@x.cl" },
  joven: { role: "ingreso", active: true, name: "Tomás Rojas", email: "j@x.cl" },
};
await env.withSecurityRulesDisabled(async (c) => { for (const [uid, u] of Object.entries(users)) await setDoc(doc(c.firestore(), "users", uid), u); });
const as = (uid) => env.authenticatedContext(uid, { email: users[uid].email, email_verified: true }).firestore();
const IMG = "data:image/jpeg;base64," + "A".repeat(2000);
const post = (uid) => ({ img: IMG, texto: "Encuentro del sábado", authorUid: uid, authorName: "Carla M.", authorAvatar: "", reacts: {}, commentCount: 0, createdAt: serverTimestamp() });
let n = 0; const t = async (name, p) => { await p; n++; console.log("✓", name); };

await t("coordinación sube una foto", assertSucceeds(setDoc(doc(as("coord"), "momentos", "m1"), post("coord"))));
await t("un dirigente no puede subir", assertFails(setDoc(doc(as("dir"), "momentos", "m2"), post("dir"))));
await t("un joven no puede subir", assertFails(setDoc(doc(as("joven"), "momentos", "m3"), post("joven"))));
await t("no se puede subir a nombre de otro", assertFails(setDoc(doc(as("coord"), "momentos", "m4"), post("dir"))));
await t("imagen demasiado grande se rechaza", assertFails(setDoc(doc(as("coord"), "momentos", "m5"), { ...post("coord"), img: "x".repeat(900001) })));
await t("quien tiene cuenta la ve", assertSucceeds(getDoc(doc(as("joven"), "momentos", "m1"))));
await t("sin cuenta no se ve", assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "momentos", "m1"))));
await t("un joven reacciona", assertSucceeds(updateDoc(doc(as("joven"), "momentos", "m1"), { "reacts.joven": "amen" })));
await t("reacción inventada se rechaza", assertFails(updateDoc(doc(as("joven"), "momentos", "m1"), { "reacts.joven": "risa" })));
await t("no puede reaccionar por otro", assertFails(updateDoc(doc(as("joven"), "momentos", "m1"), { "reacts.dir": "amen" })));
await t("quita su reacción", assertSucceeds(updateDoc(doc(as("joven"), "momentos", "m1"), { "reacts.joven": deleteField() })));
await t("un joven no puede cambiar la descripción", assertFails(updateDoc(doc(as("joven"), "momentos", "m1"), { texto: "otra" })));
await t("comenta", assertSucceeds(setDoc(doc(as("joven"), "momentos", "m1", "comentarios", "c1"), { texto: "¡Qué lindo!", authorUid: "joven", authorName: "Tomás R.", authorAvatar: "", createdAt: serverTimestamp() })));
await t("sube el contador de comentarios en 1", assertSucceeds(updateDoc(doc(as("joven"), "momentos", "m1"), { commentCount: increment(1) })));
await t("no puede saltarse el contador", assertFails(updateDoc(doc(as("joven"), "momentos", "m1"), { commentCount: 50 })));
await t("comentario vacío se rechaza", assertFails(setDoc(doc(as("joven"), "momentos", "m1", "comentarios", "c2"), { texto: "", authorUid: "joven", authorName: "Tomás R.", authorAvatar: "", createdAt: serverTimestamp() })));
await t("otra persona no borra su comentario", assertFails(deleteDoc(doc(as("dir"), "momentos", "m1", "comentarios", "c1"))));
await t("el equipo modera (borra el comentario)", assertSucceeds(deleteDoc(doc(as("coord"), "momentos", "m1", "comentarios", "c1"))));
await t("un joven no puede borrar la foto", assertFails(deleteDoc(doc(as("joven"), "momentos", "m1"))));
await t("coordinación borra la foto", assertSucceeds(deleteDoc(doc(as("coord"), "momentos", "m1"))));
await env.cleanup();
console.log(`\nTodas las pruebas pasaron (${n}).`);
