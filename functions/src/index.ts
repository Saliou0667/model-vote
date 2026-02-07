import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Transaction } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

type Role = "member" | "admin" | "superadmin";
type MemberStatus = "pending" | "active" | "suspended";

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

type AuditTarget =
  | "member"
  | "section"
  | "election"
  | "candidate"
  | "payment"
  | "policy"
  | "condition"
  | "audit"
  | "export";

type AuditPayload = {
  action: string;
  actorId: string;
  actorRole: Role | "system";
  targetType: AuditTarget;
  targetId: string;
  details?: Record<string, unknown>;
};

const db = getFirestore();
const auth = getAuth();

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

function ok<T>(data: T) {
  return { success: true as const, data };
}

function requireAuth(uid: string | undefined): asserts uid is string {
  if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `Invalid ${field}.`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireEnum<T extends string>(value: unknown, field: string, allowed: T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new HttpsError("invalid-argument", `Invalid ${field}.`);
  }
  return value as T;
}

async function getRequesterRole(uid: string): Promise<Role | null> {
  const snap = await db.collection("members").doc(uid).get();
  if (!snap.exists) return null;
  return (snap.data()?.role as Role | undefined) ?? null;
}

function requireAnyRole(role: Role | null, allowed: Role[]) {
  if (!role || !allowed.includes(role)) {
    throw new HttpsError("permission-denied", "ERROR_UNAUTHORIZED");
  }
}

async function writeAudit(payload: AuditPayload): Promise<void> {
  await db.collection("auditLogs").add({
    ...payload,
    timestamp: FieldValue.serverTimestamp(),
  });
}

function writeAuditTx(tx: Transaction, payload: AuditPayload): void {
  tx.set(db.collection("auditLogs").doc(), {
    ...payload,
    timestamp: FieldValue.serverTimestamp(),
  });
}

async function ensureSectionExists(sectionId: string): Promise<void> {
  const snap = await db.collection("sections").doc(sectionId).get();
  if (!snap.exists) throw new HttpsError("not-found", "ERROR_SECTION_NOT_FOUND");
}

function createTempPassword(): string {
  return `${randomUUID()}!Aa1`;
}

export const ensureMemberProfile = onCall(async (request) => {
  const uid = request.auth?.uid;
  const email = request.auth?.token?.email;
  requireAuth(uid);

  if (!email) {
    throw new HttpsError("failed-precondition", "Email not available on token.");
  }

  const memberRef = db.collection("members").doc(uid);
  const emailVerified = request.auth?.token?.email_verified ?? false;

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(memberRef);
    if (!snap.exists) {
      tx.set(memberRef, {
        uid,
        email,
        role: "member",
        status: "pending",
        emailVerified,
        firstName: "",
        lastName: "",
        phone: "",
        sectionId: "",
        profileCompleted: false,
        joinedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeAuditTx(tx, {
        action: "member.create",
        actorId: uid,
        actorRole: "member",
        targetType: "member",
        targetId: uid,
        details: { source: "self_registration" },
      });
      return { role: "member" as Role, status: "pending" as MemberStatus };
    }

    const current = snap.data() ?? {};
    tx.set(
      memberRef,
      {
        email,
        emailVerified,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return {
      role: (current.role as Role | undefined) ?? "member",
      status: (current.status as MemberStatus | undefined) ?? "pending",
    };
  });

  return ok(result);
});

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

  if (locked) throw new HttpsError("permission-denied", "Bootstrap is locked.");
  if (!allowedEmails.includes(email.toLowerCase())) {
    throw new HttpsError("permission-denied", "Email not allowed for bootstrap.");
  }

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
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: member.exists
          ? (member.data()?.createdAt ?? FieldValue.serverTimestamp())
          : FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    writeAuditTx(tx, {
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
    });

    writeAuditTx(tx, {
      action: "audit.access",
      actorId: uid,
      actorRole: "superadmin",
      targetType: "audit",
      targetId: "bootstrap",
      details: {
        scope: "bootstrap",
        reason: "Initial superadmin provisioning",
      },
    });
  });

  await auth.setCustomUserClaims(uid, { role: "superadmin" });
  logger.info("bootstrapRole success", { uid, email });
  return ok({ role: "superadmin" as Role });
});

export const changeRole = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  requireAuth(actorUid);

  const actorRole = await getRequesterRole(actorUid);
  requireAnyRole(actorRole, ["superadmin"]);

  const memberId = requireString(request.data?.memberId, "memberId");
  const newRole = requireEnum<Role>(request.data?.newRole, "newRole", ["member", "admin", "superadmin"]);

  if (memberId === actorUid) {
    throw new HttpsError("failed-precondition", "ERROR_CANNOT_CHANGE_OWN_ROLE");
  }

  const memberRef = db.collection("members").doc(memberId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(memberRef);
    if (!snap.exists) throw new HttpsError("not-found", "ERROR_MEMBER_NOT_FOUND");

    const previousRole = (snap.data()?.role as Role | undefined) ?? "member";
    tx.update(memberRef, {
      role: newRole,
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeAuditTx(tx, {
      action: "member.role_change",
      actorId: actorUid,
      actorRole: "superadmin",
      targetType: "member",
      targetId: memberId,
      details: { previousRole, newRole },
    });
  });

  await auth.setCustomUserClaims(memberId, { role: newRole });
  return ok({ memberId, role: newRole });
});

export const createSection = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  requireAuth(actorUid);
  const actorRole = await getRequesterRole(actorUid);
  requireAnyRole(actorRole, ["admin", "superadmin"]);

  const name = requireString(request.data?.name, "name");
  const city = requireString(request.data?.city, "city");
  const region = optionalString(request.data?.region);

  const ref = db.collection("sections").doc();
  await ref.set({
    name,
    city,
    region: region ?? "",
    memberCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAudit({
    action: "section.create",
    actorId: actorUid,
    actorRole: actorRole ?? "admin",
    targetType: "section",
    targetId: ref.id,
    details: { name, city },
  });

  return ok({ sectionId: ref.id });
});

export const updateSection = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  requireAuth(actorUid);
  const actorRole = await getRequesterRole(actorUid);
  requireAnyRole(actorRole, ["admin", "superadmin"]);

  const sectionId = requireString(request.data?.sectionId, "sectionId");
  const updatesInput = request.data?.updates as Record<string, unknown> | undefined;
  if (!updatesInput) throw new HttpsError("invalid-argument", "Invalid updates.");

  const updates: Record<string, unknown> = {};
  if (typeof updatesInput.name === "string") updates.name = updatesInput.name.trim();
  if (typeof updatesInput.city === "string") updates.city = updatesInput.city.trim();
  if (typeof updatesInput.region === "string") updates.region = updatesInput.region.trim();
  if (Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "Invalid updates.");
  }

  const sectionRef = db.collection("sections").doc(sectionId);
  const snap = await sectionRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "ERROR_SECTION_NOT_FOUND");

  await sectionRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAudit({
    action: "section.update",
    actorId: actorUid,
    actorRole: actorRole ?? "admin",
    targetType: "section",
    targetId: sectionId,
    details: { fields: Object.keys(updates) },
  });

  return ok({ sectionId });
});

export const deleteSection = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  requireAuth(actorUid);
  const actorRole = await getRequesterRole(actorUid);
  requireAnyRole(actorRole, ["superadmin"]);

  const sectionId = requireString(request.data?.sectionId, "sectionId");
  const sectionRef = db.collection("sections").doc(sectionId);
  const sectionSnap = await sectionRef.get();
  if (!sectionSnap.exists) throw new HttpsError("not-found", "ERROR_SECTION_NOT_FOUND");

  const membersSnap = await db.collection("members").where("sectionId", "==", sectionId).limit(1).get();
  if (!membersSnap.empty) {
    throw new HttpsError("failed-precondition", "ERROR_SECTION_NOT_EMPTY");
  }

  await sectionRef.delete();
  await writeAudit({
    action: "section.delete",
    actorId: actorUid,
    actorRole: "superadmin",
    targetType: "section",
    targetId: sectionId,
  });

  return ok({ sectionId });
});

export const createMember = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  requireAuth(actorUid);
  const actorRole = await getRequesterRole(actorUid);
  requireAnyRole(actorRole, ["admin", "superadmin"]);

  const email = requireString(request.data?.email, "email").toLowerCase();
  const firstName = requireString(request.data?.firstName, "firstName");
  const lastName = requireString(request.data?.lastName, "lastName");
  const sectionId = requireString(request.data?.sectionId, "sectionId");
  const phone = optionalString(request.data?.phone) ?? "";
  const status = requireEnum<MemberStatus>(request.data?.status ?? "pending", "status", [
    "pending",
    "active",
    "suspended",
  ]);

  await ensureSectionExists(sectionId);

  const temporaryPassword = createTempPassword();
  let createdUid = "";
  try {
    const user = await auth.createUser({
      email,
      password: temporaryPassword,
      emailVerified: false,
      displayName: `${firstName} ${lastName}`,
      disabled: false,
    });
    createdUid = user.uid;

    await db.runTransaction(async (tx) => {
      const memberRef = db.collection("members").doc(user.uid);
      const sectionRef = db.collection("sections").doc(sectionId);
      const sectionSnap = await tx.get(sectionRef);
      if (!sectionSnap.exists) {
        throw new HttpsError("not-found", "ERROR_SECTION_NOT_FOUND");
      }

      tx.set(memberRef, {
        uid: user.uid,
        email,
        firstName,
        lastName,
        phone,
        sectionId,
        role: "member",
        status,
        emailVerified: false,
        profileCompleted: Boolean(firstName && lastName && sectionId),
        joinedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(sectionRef, {
        memberCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeAuditTx(tx, {
        action: "member.create",
        actorId: actorUid,
        actorRole: actorRole ?? "admin",
        targetType: "member",
        targetId: user.uid,
        details: { email, status },
      });
    });

    await auth.setCustomUserClaims(user.uid, { role: "member" });
    return ok({ memberId: user.uid, temporaryPassword });
  } catch (error) {
    if (createdUid) {
      try {
        await auth.deleteUser(createdUid);
      } catch (cleanupError) {
        logger.error("cleanup createMember failed", cleanupError);
      }
    }

    const code = (error as { code?: string }).code ?? "";
    if (code.includes("email-already-exists")) {
      throw new HttpsError("already-exists", "ERROR_EMAIL_EXISTS");
    }
    if (error instanceof HttpsError) throw error;
    logger.error("createMember failed", error);
    throw new HttpsError("internal", "createMember failed");
  }
});

export const updateMember = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  requireAuth(actorUid);
  const actorRole = await getRequesterRole(actorUid);

  const memberId = requireString(request.data?.memberId, "memberId");
  const updatesInput = request.data?.updates as Record<string, unknown> | undefined;
  if (!updatesInput) throw new HttpsError("invalid-argument", "Invalid updates.");

  const isSelf = actorUid === memberId;
  if (!isSelf) requireAnyRole(actorRole, ["admin", "superadmin"]);

  const updates: Record<string, unknown> = {};
  if (typeof updatesInput.firstName === "string") {
    updates.firstName = updatesInput.firstName.trim();
  }
  if (typeof updatesInput.lastName === "string") {
    updates.lastName = updatesInput.lastName.trim();
  }
  if (typeof updatesInput.phone === "string") updates.phone = updatesInput.phone.trim();

  if (!isSelf) {
    if (typeof updatesInput.sectionId === "string") {
      updates.sectionId = updatesInput.sectionId.trim();
    }
    if (typeof updatesInput.status === "string") {
      updates.status = requireEnum<MemberStatus>(updatesInput.status, "status", ["pending", "active", "suspended"]);
    }
  } else {
    const forbidden = ["sectionId", "status", "role"];
    if (forbidden.some((f) => updatesInput[f] !== undefined)) {
      throw new HttpsError("permission-denied", "ERROR_UNAUTHORIZED");
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "Invalid updates.");
  }

  const memberRef = db.collection("members").doc(memberId);
  await db.runTransaction(async (tx) => {
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists) {
      throw new HttpsError("not-found", "ERROR_MEMBER_NOT_FOUND");
    }

    const previous = memberSnap.data() as { sectionId?: string };
    const nextSectionId = updates.sectionId as string | undefined;
    if (nextSectionId && nextSectionId !== previous.sectionId) {
      const nextSectionRef = db.collection("sections").doc(nextSectionId);
      const currentSectionRef = previous.sectionId ? db.collection("sections").doc(previous.sectionId) : null;
      const nextSectionSnap = await tx.get(nextSectionRef);
      if (!nextSectionSnap.exists) {
        throw new HttpsError("not-found", "ERROR_SECTION_NOT_FOUND");
      }
      tx.update(nextSectionRef, {
        memberCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (currentSectionRef) {
        tx.update(currentSectionRef, {
          memberCount: FieldValue.increment(-1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    tx.update(memberRef, {
      ...updates,
      profileCompleted: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeAuditTx(tx, {
      action: "member.update",
      actorId: actorUid,
      actorRole: actorRole ?? "member",
      targetType: "member",
      targetId: memberId,
      details: { fields: Object.keys(updates) },
    });
  });

  return ok({ memberId });
});
