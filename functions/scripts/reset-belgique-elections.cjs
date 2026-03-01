/* eslint-disable no-console */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "model-vote-fr-2026";
const FEDERATION_ID = "belgique";
const DRY_RUN = process.env.DRY_RUN === "1";
const OPEN_AT_ISO = process.env.OPEN_AT_ISO || "2026-03-01T08:00:00+01:00";
const CLOSE_AT_ISO = process.env.CLOSE_AT_ISO || "2026-03-01T22:00:00+01:00";

function readFirebaseToolsConfig() {
  const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`firebase-tools config not found: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function getFirebaseToolsOAuthClient() {
  const candidates = [];
  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, "npm", "node_modules"));
  }
  try {
    candidates.push(execFileSync("npm.cmd", ["root", "-g"], { encoding: "utf8" }).trim());
  } catch {
    // ignore and fall back to APPDATA path
  }

  const apiModule = candidates
    .map((root) => path.join(root, "firebase-tools", "lib", "api.js"))
    .find((modulePath) => fs.existsSync(modulePath));

  if (!apiModule) {
    throw new Error("firebase-tools API module not found in global npm directories.");
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const api = require(apiModule);
  return { clientId: api.clientId(), clientSecret: api.clientSecret() };
}

function ensureAdc() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return () => {};
  }

  const cfg = readFirebaseToolsConfig();
  const refreshToken = cfg?.tokens?.refresh_token;
  if (!refreshToken) {
    throw new Error("refresh_token not found in firebase-tools config.");
  }

  const { clientId, clientSecret } = getFirebaseToolsOAuthClient();
  const adcPath = path.join(os.tmpdir(), `adc-${crypto.randomUUID()}.json`);
  const adcPayload = {
    type: "authorized_user",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  };
  fs.writeFileSync(adcPath, JSON.stringify(adcPayload), "utf8");
  process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;
  return () => {
    try {
      fs.unlinkSync(adcPath);
    } catch {
      // ignore cleanup errors
    }
  };
}

async function clearElectionSubcollections(db, electionRef) {
  const children = await electionRef.listCollections();
  for (const collectionRef of children) {
    await db.recursiveDelete(collectionRef);
  }
}

async function main() {
  const cleanupAdc = ensureAdc();
  try {
    const openAt = new Date(OPEN_AT_ISO);
    const closeAt = new Date(CLOSE_AT_ISO);
    if (Number.isNaN(openAt.getTime())) throw new Error(`Invalid OPEN_AT_ISO: ${OPEN_AT_ISO}`);
    if (Number.isNaN(closeAt.getTime())) throw new Error(`Invalid CLOSE_AT_ISO: ${CLOSE_AT_ISO}`);
    if (closeAt.getTime() <= openAt.getTime()) throw new Error("closeAt must be after openAt");

    initializeApp({ projectId: PROJECT_ID });
    const db = getFirestore();

    const electionsSnap = await db.collection("elections").where("federationId", "==", FEDERATION_ID).get();
    const membersSnap = await db
      .collection("members")
      .where("federationId", "==", FEDERATION_ID)
      .where("status", "==", "active")
      .get();
    const activeVotersCount = membersSnap.docs.filter((doc) => String(doc.data()?.role ?? "") === "member").length;

    const updates = [];
    for (const doc of electionsSnap.docs) {
      const data = doc.data();
      const mergedIntoElectionId = String(data.mergedIntoElectionId ?? "");
      const shouldKeepArchived = Boolean(mergedIntoElectionId) || String(data.status ?? "") === "archived";
      const nextStatus = shouldKeepArchived ? "archived" : "draft";
      const updatePayload = {
        totalVotesCast: 0,
        totalEligibleVoters: shouldKeepArchived ? Number(data.totalEligibleVoters ?? 0) : activeVotersCount,
        validVotesCount: 0,
        blankVotesCount: 0,
        status: nextStatus,
        startAt: shouldKeepArchived ? data.startAt ?? null : openAt,
        endAt: shouldKeepArchived ? data.endAt ?? null : closeAt,
        lockedAt: null,
        closedAt: null,
        publishedAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      };

      updates.push({
        electionId: doc.id,
        title: String(data.title ?? ""),
        previousStatus: String(data.status ?? ""),
        nextStatus,
        mergedIntoElectionId,
      });

      if (DRY_RUN) continue;
      await clearElectionSubcollections(db, doc.ref);
      await doc.ref.set(updatePayload, { merge: true });
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          projectId: PROJECT_ID,
          federationId: FEDERATION_ID,
          dryRun: DRY_RUN,
          openAtIso: openAt.toISOString(),
          closeAtIso: closeAt.toISOString(),
          activeVotersCount,
          electionsResetCount: updates.length,
          elections: updates,
        },
        null,
        2,
      ),
    );
  } finally {
    cleanupAdc();
  }
}

main().catch((error) => {
  console.error("Failed to reset Belgique elections:", error);
  process.exitCode = 1;
});
