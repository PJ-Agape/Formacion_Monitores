// Prueba de las reglas de «partidas» (juegos en línea) con el emulador de Firestore (no toca la base real).
//   npm i -D firebase-tools @firebase/rules-unit-testing firebase
//   npx firebase emulators:exec --only firestore --project demo-agape "node scripts/test-reglas-partidas.mjs"
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, deleteField } from "firebase/firestore";

const env = await initializeTestEnvironment({ projectId: "demo-agape", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
const users = {
  ana: { role: "ingreso", active: true, name: "Ana Pérez", email: "a@x.cl" },
  tomas: { role: "madurez", active: true, name: "Tomás Rojas", email: "t@x.cl" },
  luis: { role: "ingreso", active: true, name: "Luis Soto", email: "l@x.cl" },
  coord: { role: "coordinador", active: true, name: "Carla Muñoz", email: "c@x.cl" },
  baja: { role: "ingreso", active: false, name: "Pedro Díaz", email: "p@x.cl" },
};
await env.withSecurityRulesDisabled(async (c) => { for (const [uid, u] of Object.entries(users)) await setDoc(doc(c.firestore(), "users", uid), u); });
const as = (uid) => env.authenticatedContext(uid, { email: users[uid].email, email_verified: true }).firestore();
const P = (uid) => ({ n: users[uid].name.split(" ")[0], av: "", j: Date.now() });
const sala = (uid) => ({ game: "ultima", host: uid, status: "lobby", players: { [uid]: P(uid) }, g: null, said: {}, pen: {}, at: serverTimestamp(), createdAt: serverTimestamp() });
const up = (uid, data) => updateDoc(doc(as(uid), "partidas", "ABCD"), { ...data, at: serverTimestamp() });
let n = 0; const t = async (name, p) => { await p; n++; console.log("✓", name); };

await t("crea una sala", assertSucceeds(setDoc(doc(as("ana"), "partidas", "ABCD"), sala("ana"))));
await t("código inválido se rechaza", assertFails(setDoc(doc(as("ana"), "partidas", "abc1"), sala("ana"))));
await t("no puede crear a nombre de otro", assertFails(setDoc(doc(as("ana"), "partidas", "WXYZ"), sala("tomas"))));
await t("no puede crear con otros ya dentro", assertFails(setDoc(doc(as("ana"), "partidas", "WXYZ"), { ...sala("ana"), players: { ana: P("ana"), tomas: P("tomas") } })));
await t("campo extra se rechaza", assertFails(setDoc(doc(as("ana"), "partidas", "WXYZ"), { ...sala("ana"), x: 1 })));
await t("sin cuenta no se ve", assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "partidas", "ABCD"))));
await t("cuenta inactiva no se ve", assertFails(getDoc(doc(as("baja"), "partidas", "ABCD"))));
await t("con cuenta se ve", assertSucceeds(getDoc(doc(as("tomas"), "partidas", "ABCD"))));
await t("Tomás se suma a la sala", assertSucceeds(up("tomas", { "players.tomas": P("tomas") })));
await t("Luis no puede sumar a otro", assertFails(up("luis", { "players.coord": P("coord") })));
await t("Luis no puede cambiar la partida si no está", assertFails(up("luis", { "players.luis": P("luis"), status: "play" })));
await t("Luis no puede sacar a otro", assertFails(up("luis", { "players.luis": P("luis"), "players.ana": deleteField() })));
await t("Luis se suma", assertSucceeds(up("luis", { "players.luis": P("luis") })));
await t("quien crea empieza la partida", assertSucceeds(up("ana", { status: "play", g: { turn: 0, n: 0 } })));
await t("con la partida empezada nadie más entra", assertFails(up("coord", { "players.coord": P("coord") })));
await t("quien juega escribe la jugada", assertSucceeds(up("tomas", { g: { turn: 1, n: 1 } })));
await t("dice «¡Última!»", assertSucceeds(up("luis", { "said.luis": true })));
await t("pilla a otro", assertSucceeds(up("tomas", { "pen.ana": 2, "said.ana": true })));
await t("estado inventado se rechaza", assertFails(up("ana", { status: "trampa" })));
await t("no se puede cambiar el juego", assertFails(up("ana", { game: "otro" })));
await t("Luis sale de la sala", assertSucceeds(up("luis", { "players.luis": deleteField() })));
await t("después de salir ya no escribe", assertFails(up("luis", { "said.luis": true })));
await t("un jugador que no creó la sala no la borra", assertFails(deleteDoc(doc(as("tomas"), "partidas", "ABCD"))));
await t("el equipo puede borrar una sala", assertSucceeds(deleteDoc(doc(as("coord"), "partidas", "ABCD"))));
await t("crea otra", assertSucceeds(setDoc(doc(as("ana"), "partidas", "EFGH"), sala("ana"))));
await t("quien la creó la cierra", assertSucceeds(deleteDoc(doc(as("ana"), "partidas", "EFGH"))));
await env.withSecurityRulesDisabled(async (c) => {
  const old = new Date(Date.now() - 13 * 3600e3);
  await setDoc(doc(c.firestore(), "partidas", "VIEJ"), { ...sala("ana"), at: old, createdAt: old });
  await setDoc(doc(c.firestore(), "partidas", "LLEN"), { ...sala("ana"), players: Object.fromEntries("abcdefgh".split("").map((k) => [k, { n: k }])) });
});
await t("una sala abandonada (12 h) la borra cualquiera", assertSucceeds(deleteDoc(doc(as("luis"), "partidas", "VIEJ"))));
await t("sala llena: no entra un noveno", assertFails(updateDoc(doc(as("tomas"), "partidas", "LLEN"), { "players.tomas": P("tomas"), at: serverTimestamp() })));
await env.cleanup();
console.log(`\n${n} pruebas OK`);
