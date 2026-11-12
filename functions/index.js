const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions");
const { getApps, initializeApp } = require("firebase-admin/app");
const { runAdminAction, ADMIN_PASSWORD } = require("./admin");
const { REVENUECAT_SECRET_KEY } = require("./planStatus");

if (!getApps().length) initializeApp();

setGlobalOptions({ maxInstances: 5, region: "us-central1" });

const BACK_OFFICE_WEBSITES = ["https://rudik-96.github.io", "http://localhost:5174"];

// The only door of the back office. It checks the password itself (see admin.js).
exports.backOfficeApi = onCall(
  { secrets: [ADMIN_PASSWORD, REVENUECAT_SECRET_KEY], timeoutSeconds: 60, memory: "512MiB", cors: BACK_OFFICE_WEBSITES },
  async (request) => {
    try {
      return await runAdminAction(request);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error("[backOfficeApi] failed:", error?.message ?? error);
      throw new HttpsError("internal", "Back office failed: " + (error?.message ?? "unknown error"));
    }
  }
);
