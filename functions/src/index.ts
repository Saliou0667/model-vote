import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

initializeApp();

type Role = "member" | "admin" | "superadmin";

type RuntimeConfig = {
  app?: {
    timezone?: string;
    locale?: string;
  };
  auth?: {
    superadmin_emails?: string;
  };
  bootstrap?: {
    locked?: string;
  };
};

function getRuntimeConfig(): RuntimeConfig {
  const raw = process.env.CLOUD_RUNTIME_CONFIG;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as RuntimeConfig;
  } catch (error) {
    logger.error("Invalid CLOUD_RUNTIME_CONFIG", error);
    return {};
  }
}

function requireAuth(uid: string | undefined): asserts uid is string {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
}

async function getRequesterRole(uid: string): Promise<Role | null> {
  const db = getFirestore();
  const snap = await db.collection("members").doc(uid).get();
  if (!snap.exists) return null;
  return (snap.data()?.role as Role | undefined) ?? null;
}

export const bootstrapRole = onCall(async (request) => {
  const uid = request.auth?.uid;
  const email = request.auth?.token?.email;
  requireAuth(uid);

  if (!email) {
    throw new HttpsError("failed-precondition", "Email not available on token.");
  }

  const cfg = getRuntimeConfig();
  const locked = cfg.bootstrap?.locked === "true";
  const rawAllowed = cfg.auth?.superadmin_emails ?? "";
  const allowedEmails = rawAllowed
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  if (locked) {
    throw new HttpsError("permission-denied", "Bootstrap is locked.");
  }

  if (!allowedEmails.includes(email.toLowerCase())) {
    throw new HttpsError("permission-denied", "Email not allowed for bootstrap.");
  }

  const db = getFirestore();
  const now = FieldValue.serverTimestamp();
  const memberRef = db.collection("members").doc(uid);

  await db.runTransaction(async (tx) => {
    const member = await tx.get(memberRef);
    const previousRole = (member.data()?.role as Role | undefined) ?? "member";

    tx.set(
      memberRef,
      {
        uid,
        email,
        role: "superadmin",
        status: "active",
        emailVerified: request.auth?.token?.email_verified ?? false,
        updatedAt: now,
        createdAt: member.exists ? (member.data()?.createdAt ?? now) : now,
      },
      { merge: true },
    );

    tx.set(db.collection("auditLogs").doc(), {
      action: "member.role_change",
      actorId: uid,
      actorRole: "superadmin",
      targetType: "member",
      targetId: uid,
      details: {
        previousRole,
        newRole: "superadmin",
        reason: "bootstrap",
      },
      timestamp: now,
    });

    tx.set(db.collection("auditLogs").doc(), {
      action: "audit.access",
      actorId: uid,
      actorRole: "superadmin",
      targetType: "audit",
      targetId: "bootstrap",
      details: {
        scope: "bootstrap",
        reason: "Initial superadmin provisioning",
      },
      timestamp: now,
    });
  });

  await getAuth().setCustomUserClaims(uid, { role: "superadmin" });
  logger.info("bootstrapRole success", { uid, email });
  return { success: true, data: { role: "superadmin" } };
});

export const changeRole = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  requireAuth(actorUid);

  const actorRole = await getRequesterRole(actorUid);
  if (actorRole !== "superadmin") {
    throw new HttpsError("permission-denied", "SuperAdmin required.");
  }

  const { memberId, newRole } = request.data as {
    memberId?: string;
    newRole?: Role;
  };
  if (!memberId || !newRole || !["member", "admin", "superadmin"].includes(newRole)) {
    throw new HttpsError("invalid-argument", "Invalid payload.");
  }

  if (memberId === actorUid) {
    throw new HttpsError("failed-precondition", "Cannot change your own role.");
  }

  const db = getFirestore();
  const memberRef = db.collection("members").doc(memberId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(memberRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Member not found.");
    }
    const previousRole = (snap.data()?.role as Role | undefined) ?? "member";
    tx.update(memberRef, {
      role: newRole,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection("auditLogs").doc(), {
      action: "member.role_change",
      actorId: actorUid,
      actorRole: "superadmin",
      targetType: "member",
      targetId: memberId,
      details: { previousRole, newRole },
      timestamp: FieldValue.serverTimestamp(),
    });
  });

  await getAuth().setCustomUserClaims(memberId, { role: newRole });
  return { success: true, data: { memberId, role: newRole } };
});
