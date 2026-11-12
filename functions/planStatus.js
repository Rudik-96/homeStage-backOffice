const { getFirestore } = require("firebase-admin/firestore");
const { defineSecret } = require("firebase-functions/params");

// How many designs a person has left. This is a copy of the rules of the HomeStage server
// (functions/helpers/subscription.js and plans.js there). Keep the numbers the same.
const REVENUECAT_SECRET_KEY = defineSecret("REVENUECAT_SECRET_KEY");
const REVENUECAT_API = "https://api.revenuecat.com/v1";
const ENTITLEMENT_ID = "pro";
const WAIT_LIMIT_MS = 8000;
const FREE_GENERATIONS = 1;
const GENERATIONS_PER_PLAN = { homestage_weekly: 10, homestage_monthly: 30 };
const GENERATIONS_PER_PACK = { homestage_3_designs: 3 };

function isStillActive(entitlement) {
  const endDate = entitlement.grace_period_expires_date ?? entitlement.expires_date;
  if (!endDate) return true;
  return Date.parse(endDate) > Date.now();
}

function readSubscription(subscriber) {
  const entitlement = subscriber?.entitlements?.[ENTITLEMENT_ID];
  if (!entitlement || !isStillActive(entitlement)) return null;
  const generations = GENERATIONS_PER_PLAN[entitlement.product_identifier];
  if (!generations) return null;
  return {
    productId: entitlement.product_identifier,
    generations,
    periodStart: entitlement.purchase_date ?? "",
  };
}

function countPackGenerations(subscriber) {
  let total = 0;
  for (const [productId, list] of Object.entries(subscriber?.non_subscriptions ?? {})) {
    const perPack = GENERATIONS_PER_PACK[productId];
    if (perPack && Array.isArray(list)) total += perPack * list.length;
  }
  return total;
}

async function readPurchases(uid) {
  const response = await fetch(REVENUECAT_API + "/subscribers/" + encodeURIComponent(uid), {
    headers: { Authorization: "Bearer " + REVENUECAT_SECRET_KEY.value() },
    signal: AbortSignal.timeout(WAIT_LIMIT_MS),
  });
  if (!response.ok) throw new Error("RevenueCat: HTTP " + response.status);
  const subscriber = (await response.json()).subscriber;
  return { subscription: readSubscription(subscriber), packGenerations: countPackGenerations(subscriber) };
}

async function getPlanStatus(uid) {
  const user = (await getFirestore().collection("users").doc(uid).get()).data() ?? {};
  const freeLeft = Math.max(0, FREE_GENERATIONS - (user.freeGenerationsUsed ?? 0));
  if (user.plan === "paid") return { tester: true, subscription: null, packLeft: 0, freeLeft };

  let purchases = null;
  try {
    purchases = await readPurchases(uid);
  } catch (error) {
    console.warn("[planStatus] could not check purchases:", error?.message ?? error);
  }
  const gifts = user.giftGenerations ?? 0;
  const packUsed = user.packGenerationsUsed ?? 0;
  if (!purchases) {
    return { unknown: true, subscription: null, packLeft: Math.max(0, gifts - packUsed), freeLeft };
  }

  const { subscription, packGenerations } = purchases;
  const isSamePeriod = subscription && user.paidPeriodStart === subscription.periodStart;
  const used = isSamePeriod ? user.paidGenerationsUsed ?? 0 : 0;
  return {
    subscription: subscription
      ? {
          productId: subscription.productId,
          total: subscription.generations,
          left: Math.max(0, subscription.generations - used),
        }
      : null,
    packLeft: Math.max(0, packGenerations + gifts - packUsed),
    freeLeft,
  };
}

module.exports = { getPlanStatus, REVENUECAT_SECRET_KEY };
