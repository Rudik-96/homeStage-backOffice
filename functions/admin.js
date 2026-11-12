const { getFirestore, FieldValue, AggregateField } = require("firebase-admin/firestore");
const crypto = require("crypto");
const { getAuth } = require("firebase-admin/auth");
const { defineSecret } = require("firebase-functions/params");
const { HttpsError } = require("firebase-functions/v2/https");
const { getPlanStatus } = require("./planStatus");

// The back office server. It has its own database ("backoffice") for its own things (log, lock).
// The people, designs and ratings are in the HomeStage database (the default one).
// You come in with one password, which is a Firebase secret that only the owner types in.

// The back office password. It is a Firebase secret that only the owner types in.
const ADMIN_PASSWORD = defineSecret("ADMIN_PASSWORD");
const MAX_WRONG_TRIES = 5;
const LOCK_MS = 15 * 60 * 1000;
const WRONG_PASSWORD_WAIT_MS = 600;

const DAYS_SHOWN = 14;
const YEREVAN_HOURS = 4;
const MAX_USERS = 500;
const MAX_GIFT = 100;
const COUNTERS = ["freeGenerationsUsed", "paidGenerationsUsed", "packGenerationsUsed"];

const db = () => getFirestore(); // HomeStage data
const officeDb = () => getFirestore("backoffice"); // back office data

function samePassword(given, real) {
  const a = crypto.createHash("sha256").update(String(given)).digest();
  const b = crypto.createHash("sha256").update(String(real)).digest();
  return crypto.timingSafeEqual(a, b);
}

// Five wrong tries in a row close the door for 15 minutes (for everybody).
async function checkPassword(given) {
  const ref = officeDb().collection("adminLock").doc("password");
  const state = (await ref.get()).data() ?? {};
  const lastFailureAt = state.lastFailureAt ?? 0;
  const recentFailures = Date.now() - lastFailureAt < LOCK_MS ? state.failures ?? 0 : 0;
  if (recentFailures >= MAX_WRONG_TRIES) {
    throw new HttpsError("resource-exhausted", "Too many wrong tries. Try again in 15 minutes.");
  }
  const real = ADMIN_PASSWORD.value();
  if (real && samePassword(given, real)) {
    if (state.failures) await ref.set({ failures: 0, lastFailureAt });
    return "password";
  }
  await ref.set({ failures: recentFailures + 1, lastFailureAt: Date.now() });
  await new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_WAIT_MS));
  throw new HttpsError("permission-denied", "Wrong password.");
}

async function requireAdmin(request) {
  if (typeof request.data?.password !== "string") throw new HttpsError("permission-denied", "Password needed.");
  return checkPassword(request.data.password);
}

const millis = (value) => (value?.toMillis ? value.toMillis() : null);

async function count(query) {
  return (await query.count().get()).data().count;
}

// One query for each field: a sum of several fields in one query needs a special index.
async function sumOf(field) {
  const result = await db().collection("users").aggregate({ total: AggregateField.sum(field) }).get();
  return result.data().total ?? 0;
}

async function sums() {
  const [free, paid, pack] = await Promise.all([
    sumOf("freeGenerationsUsed"),
    sumOf("paidGenerationsUsed"),
    sumOf("packGenerationsUsed"),
  ]);
  return { free, paid, pack };
}

// Start of a day in Yerevan time, as a Date.
function dayStart(daysAgo) {
  const shifted = new Date(Date.now() + YEREVAN_HOURS * 3600 * 1000);
  shifted.setUTCHours(0, 0, 0, 0);
  shifted.setUTCDate(shifted.getUTCDate() - daysAgo);
  return new Date(shifted.getTime() - YEREVAN_HOURS * 3600 * 1000);
}

function dayLabel(date) {
  return new Date(date.getTime() + YEREVAN_HOURS * 3600 * 1000).toISOString().slice(0, 10);
}

async function accountsByDay() {
  let total = 0;
  const perDay = {};
  let pageToken;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    for (const user of page.users) {
      total += 1;
      const created = new Date(new Date(user.metadata.creationTime).getTime() + YEREVAN_HOURS * 3600 * 1000);
      const label = created.toISOString().slice(0, 10);
      perDay[label] = (perDay[label] ?? 0) + 1;
    }
    pageToken = page.pageToken;
  } while (pageToken && total < 100000);
  return { total, perDay };
}

async function designsPerDay() {
  try {
    const days = [];
    for (let i = DAYS_SHOWN - 1; i >= 0; i--) days.push(dayStart(i));
    const jobs = db().collectionGroup("jobs");
    return await Promise.all(
      days.map(async (start, index) => {
        const end = index === days.length - 1 ? new Date() : days[index + 1];
        const done = await count(
          jobs.where("status", "==", "done").where("updatedAt", ">=", start).where("updatedAt", "<", end)
        );
        return { day: dayLabel(start), designs: done };
      })
    );
  } catch (error) {
    console.warn("[admin] designs per day failed (index not ready?):", error?.message);
    return null;
  }
}

async function stats() {
  const users = db().collection("users");
  const feedback = db().collection("feedback");
  const [accounts, usersWithDoc, paying, testers, blocked, sum, designsDone, up, down, toCheck, perDay] =
    await Promise.all([
      accountsByDay(),
      count(users),
      count(users.where("hasPaidBefore", "==", true)),
      count(users.where("plan", "==", "paid")),
      count(users.where("blocked", "==", true)),
      sums(),
      count(db().collectionGroup("jobs").where("status", "==", "done")).catch(() => null),
      count(feedback.where("rating", "==", "up")),
      count(feedback.where("rating", "==", "down")),
      count(feedback.where("status", "==", "new")),
      designsPerDay(),
    ]);
  const signups = [];
  for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
    const label = dayLabel(dayStart(i));
    signups.push({ day: label, accounts: accounts.perDay[label] ?? 0 });
  }
  return {
    accounts: accounts.total,
    madeDesigns: usersWithDoc,
    paying,
    testers,
    free: Math.max(0, usersWithDoc - paying - testers),
    blocked,
    designsDone,
    spent: sum,
    feedback: { up, down, toCheck },
    perDay,
    signups,
  };
}

function userRow(doc) {
  const data = doc.data();
  return {
    uid: doc.id,
    plan: data.plan ?? null,
    hasPaidBefore: data.hasPaidBefore === true,
    blocked: data.blocked === true,
    free: data.freeGenerationsUsed ?? 0,
    paid: data.paidGenerationsUsed ?? 0,
    pack: data.packGenerationsUsed ?? 0,
    gift: data.giftGenerations ?? 0,
    createdAt: millis(data.createdAt),
    lastGenerationAt: millis(data.lastGenerationAt),
  };
}

async function users() {
  const snapshot = await db().collection("users").limit(MAX_USERS).get();
  return snapshot.docs.map(userRow).sort((a, b) => (b.lastGenerationAt ?? 0) - (a.lastGenerationAt ?? 0));
}

function projectRow(doc, uid) {
  const data = doc.data();
  return {
    id: doc.id,
    uid: uid ?? doc.ref.parent.parent.id,
    name: data.name ?? "Room",
    styleId: data.styleId ?? null,
    roomType: data.roomType ?? null,
    palette: data.palette ?? null,
    notes: data.notes ?? "",
    roomSize: data.roomSize ?? null,
    inputUri: data.inputUri ?? null,
    outputUri: data.outputUri ?? null,
    rating: data.rating ?? null,
    products: (data.catalogUsed ?? []).length,
    createdAt: millis(data.createdAt),
  };
}

function feedbackFields(data) {
  return {
    uid: data.uid,
    jobId: data.jobId,
    projectId: data.projectId ?? null,
    rating: data.rating,
    status: data.status,
    reason: data.reason ?? null,
    note: data.note ?? "",
    plan: data.plan ?? null,
    counter: data.counter ?? null,
    outputUrl: data.outputUrl ?? null,
    createdAt: millis(data.createdAt),
    resolvedAt: millis(data.resolvedAt),
    resolvedBy: data.resolvedBy ?? null,
  };
}

async function userDetail(uid) {
  if (typeof uid !== "string" || !uid) throw new HttpsError("invalid-argument", "uid required");
  const [userSnap, projectsSnap, feedbackSnap, authUser, plan] = await Promise.all([
    db().collection("users").doc(uid).get(),
    db().collection("users").doc(uid).collection("projects").orderBy("createdAt", "desc").limit(40).get(),
    db().collection("feedback").where("uid", "==", uid).limit(50).get(),
    getAuth().getUser(uid).catch(() => null),
    getPlanStatus(uid).catch(() => null),
  ]);
  return {
    user: userSnap.exists ? userRow(userSnap) : { uid },
    account: authUser
      ? {
          createdAt: Date.parse(authUser.metadata.creationTime),
          lastSignInAt: Date.parse(authUser.metadata.lastSignInTime),
        }
      : null,
    plan,
    projects: projectsSnap.docs.map((doc) => projectRow(doc, uid)),
    feedback: feedbackSnap.docs.map((doc) => ({ id: doc.id, ...feedbackFields(doc.data()) })),
  };
}

async function recent() {
  const snapshot = await db().collectionGroup("projects").orderBy("createdAt", "desc").limit(40).get();
  return snapshot.docs.map((doc) => projectRow(doc));
}

async function feedbackList() {
  const snapshot = await db().collection("feedback").orderBy("createdAt", "desc").limit(100).get();
  return Promise.all(
    snapshot.docs
      .filter((doc) => doc.data().rating === "down")
      .map(async (doc) => {
        const data = doc.data();
        let inputUri = null;
        if (data.projectId) {
          const project = await db().collection("users").doc(data.uid).collection("projects").doc(data.projectId).get();
          inputUri = project.data()?.inputUri ?? null;
        }
        return { id: doc.id, ...feedbackFields(data), inputUri };
      })
  );
}

async function log(admin, action, uid, details) {
  await officeDb()
    .collection("adminLog")
    .add({ admin, action, uid: uid ?? null, details: details ?? null, at: FieldValue.serverTimestamp() })
    .catch((error) => console.warn("[admin] could not write the log:", error?.message));
}

async function resolveFeedback(admin, id, decision) {
  if (typeof id !== "string" || !id) throw new HttpsError("invalid-argument", "id required");
  if (!["refund", "reject"].includes(decision)) {
    throw new HttpsError("invalid-argument", "decision must be refund or reject");
  }
  const ref = db().collection("feedback").doc(id);
  const result = await db().runTransaction(async (transaction) => {
    const feedback = (await transaction.get(ref)).data();
    if (!feedback) throw new HttpsError("not-found", "Feedback not found.");
    if (["refunded", "rejected"].includes(feedback.status)) return { status: feedback.status, alreadyDone: true };
    let gaveBack = false;
    if (decision === "refund" && COUNTERS.includes(feedback.counter)) {
      const userRef = db().collection("users").doc(feedback.uid);
      const user = (await transaction.get(userRef)).data() ?? {};
      const used = user[feedback.counter] ?? 0;
      if (used > 0) {
        transaction.set(userRef, { [feedback.counter]: used - 1 }, { merge: true });
        gaveBack = true;
      }
    }
    const status = decision === "refund" ? "refunded" : "rejected";
    transaction.set(
      ref,
      { status, gaveBack, resolvedAt: FieldValue.serverTimestamp(), resolvedBy: admin },
      { merge: true }
    );
    return { status, gaveBack };
  });
  await log(admin, "feedback-" + decision, null, { id, ...result });
  return result;
}

async function gift(admin, uid, howMany) {
  const number = Math.floor(Number(howMany));
  if (typeof uid !== "string" || !uid) throw new HttpsError("invalid-argument", "uid required");
  if (!(number >= 1 && number <= MAX_GIFT)) throw new HttpsError("invalid-argument", "count must be 1 to " + MAX_GIFT);
  await db().collection("users").doc(uid).set({ giftGenerations: FieldValue.increment(number) }, { merge: true });
  await log(admin, "gift", uid, { count: number });
  return { ok: true };
}

async function block(admin, uid, isBlocked) {
  if (typeof uid !== "string" || !uid) throw new HttpsError("invalid-argument", "uid required");
  await db().collection("users").doc(uid).set({ blocked: isBlocked === true }, { merge: true });
  await log(admin, isBlocked === true ? "block" : "unblock", uid);
  return { ok: true };
}

async function runAdminAction(request) {
  const admin = await requireAdmin(request);
  const { action, uid, id, decision, count: howMany, blocked } = request.data ?? {};
  switch (action) {
    case "me":
      return { email: admin };
    case "stats":
      return stats();
    case "users":
      return { users: await users() };
    case "user":
      return userDetail(uid);
    case "recent":
      return { projects: await recent() };
    case "feedback":
      return { items: await feedbackList() };
    case "resolveFeedback":
      return resolveFeedback(admin, id, decision);
    case "gift":
      return gift(admin, uid, howMany);
    case "block":
      return block(admin, uid, blocked);
    default:
      throw new HttpsError("invalid-argument", "Unknown action");
  }
}

module.exports = { runAdminAction, ADMIN_PASSWORD };
