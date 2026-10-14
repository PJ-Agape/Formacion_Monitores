// Prueba de las reglas de «cumpleanos» con el emulador de Firestore (no toca la base real).
//
// Cómo correrla (en un computador con internet y Java):
//   npm i -D firebase-tools @firebase/rules-unit-testing firebase
//   npx firebase emulators:exec --only firestore --project demo-agape "node scripts/test-reglas-cumpleanos.mjs"
//
// Si todo está bien, termina con «Todas las pruebas pasaron».
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection, serverTimestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({ projectId: "demo-agape", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
const users = {
  adulto: { role: "dirigente", active: true, name: "Iván Pérez", email: "adulto@x.cl" },
  joven: { role: "ingreso", active: true, name: "Tomás Rojas", email: "joven@x.cl", consent: { mayor: false, cumple: false } },
  jovenOk: { role: "madurez", active: true, name: "Ana Soto", email: "ana@x.cl", consent: { mayor: false, cumple: true } },
  coord: { role: "coordinador", active: true, name: "Coordi Nador", email: "coord@x.cl" },
  pausado: { role: "dirigente", active: false, name: "En Pausa", email: "pausa@x.cl" },
};
await env.withSecurityRulesDisabled(async (c) => { for (const [uid, u] of Object.entries(users)) await setDoc(doc(c.firestore(), "users", uid), u); });
const as = (uid) => env.authenticatedContext(uid, { email: users[uid]?.email || "x@x.cl", email_verified: true }).firestore();
const ok = (n, md = "10-16") => ({ n, md, at: serverTimestamp() });
let n = 0; const t = async (name, p) => { await p; n++; console.log("✓", name); };

await t("un adulto guarda su cumpleaños", assertSucceeds(setDoc(doc(as("adulto"), "cumpleanos", "adulto"), ok("Iván P."))));
await t("lo actualiza", assertSucceeds(setDoc(doc(as("adulto"), "cumpleanos", "adulto"), ok("Iván P.", "02-29"))));
await t("no puede guardar el de otra persona", assertFails(setDoc(doc(as("adulto"), "cumpleanos", "coord"), ok("Coordi N."))));
await t("fecha inválida (13-40) se rechaza", assertFails(setDoc(doc(as("adulto"), "cumpleanos", "adulto"), ok("Iván P.", "13-40"))));
await t("campos extra (año) se rechazan", assertFails(setDoc(doc(as("adulto"), "cumpleanos", "adulto"), { ...ok("Iván P."), anio: 1990 })));
await t("un joven sin autorización no puede", assertFails(setDoc(doc(as("joven"), "cumpleanos", "joven"), ok("Tomás R."))));
await t("un joven con autorización sí puede", assertSucceeds(setDoc(doc(as("jovenOk"), "cumpleanos", "jovenOk"), ok("Ana S."))));
await t("una cuenta en pausa no puede", assertFails(setDoc(doc(as("pausado"), "cumpleanos", "pausado"), ok("En P."))));
await t("quien tiene cuenta puede ver la lista", assertSucceeds(getDocs(collection(as("joven"), "cumpleanos"))));
await t("sin cuenta no se ve", assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "cumpleanos", "adulto"))));
await t("otra persona no puede borrarlo", assertFails(deleteDoc(doc(as("jovenOk"), "cumpleanos", "adulto"))));
await t("el equipo puede quitarlo (moderación)", assertSucceeds(deleteDoc(doc(as("coord"), "cumpleanos", "jovenOk"))));
await t("cada uno puede quitar el suyo", assertSucceeds(deleteDoc(doc(as("adulto"), "cumpleanos", "adulto"))));

await env.cleanup();
console.log(`\nTodas las pruebas pasaron (${n}).`);
