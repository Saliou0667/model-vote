import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Transaction } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

type Role = "member" | "admin" | "superadmin";
type MemberStatus = "pending" | "active" | "suspended";
type ContributionPeriodicity = "monthly" | "quarterly" | "yearly";
type ActiveContributionPolicy = {
  id: string;
  gracePeriodDays?: number;
};
type ConditionType = "checkbox" | "date" | "amount" | "file" | "text";

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

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new HttpsError("invalid-argument", `Invalid ${field}.`);
  }
  return value;
}

function requireDate(value: unknown, field: string): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  throw new HttpsError("invalid-argument", `Invalid ${field}.`);
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

async function getActiveContributionPolicy(): Promise<ActiveContributionPolicy | null> {
  const snap = await db.collection("contributionPolicies").where("isActive", "==", true).limit(1).get();
  if (snap.empty) return null;
  const data = snap.docs[0].data() as { gracePeriodDays?: number };
  return { id: snap.docs[0].id, gracePeriodDays: data.gracePeriodDays };
}

async function isContributionUpToDate(memberId: string): Promise<boolean> {
  const policy = await getActiveContributionPolicy();
  if (!policy) return false;

  const latestPayment = await db
    .collection("payments")
    .where("memberId", "==", memberId)
    .orderBy("periodEnd", "desc")
    .limit(1)
    .get();

  if (latestPayment.empty) return false;
  const periodEnd = latestPayment.docs[0].data().periodEnd?.toDate?.() as Date | undefined;
  if (!periodEnd) return false;

  const graceDays = Number(policy.gracePeriodDays ?? 0);
  const due = new Date(periodEnd);
  due.setDate(due.getDate() + graceDays);
  return new Date().getTime() <= due.getTime();
}

function memberConditionDocId(memberId: string, conditionId: string): string {
  return `${memberId}_${conditionId}`;
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

export const setContributionPolicy = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  requireAuth(actorUid);
  const actorRole = await getRequesterRole(actorUid);
  requireAnyRole(actorRole, ["superadmin"]);

  const name = requireString(request.data?.name, "name");
  const amount = requireNumber(request.data?.amount, "amount");
  const currency = requireString(request.data?.currency, "currency").toUpperCase();
  const periodicity = requireEnum<ContributionPeriodicity>(request.data?.periodicity, "periodicity", [
    "monthly",
    "quarterly",
    "yearly",
  ]);
  const gracePeriodDays = requireNumber(request.data?.gracePeriodDays, "gracePeriodDays");

  if (amount <= 0) throw new HttpsError("invalid-argument", "ERROR_INVALID_AMOUNT");
  if (gracePeriodDays < 0) {
    throw new HttpsError("invalid-argument", "ERROR_INVALID_GRACE_PERIOD");
  }

  const activePolicies = await db.collection("contributionPolicies").where("isActive", "==", true).get();
  const policyRef = db.collection("contributionPolicies").doc();
  const batch = db.batch();

  activePolicies.docs.forEach((doc) => {
    batch.update(doc.ref, {
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  batch.set(policyRef, {
    name,
    amount,
    currency,
    periodicity,
    gracePeriodDays,
    isActive: true,
    createdBy: actorUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(db.collection("auditLogs").doc(), {
    action: "policy.create",
    actorId: actorUid,
    actorRole: "superadmin",
    targetType: "policy",
    targetId: policyRef.id,
    details: {
      amount,
      currency,
      periodicity,
      gracePeriodDays,
    },
    timestamp: FieldValue.serverTimestamp(),
  });

  if (!activePolicies.empty) {
    batch.set(db.collection("auditLogs").doc(), {
      action: "policy.update",
      actorId: actorUid,
      actorRole: "superadmin",
      targetType: "policy",
      targetId: policyRef.id,
      details: { previousActiveCount: activePolicies.size },
      timestamp: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  return ok({ policyId: policyRef.id });
});

export const recordPayment = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  requireAuth(actorUid);
  const actorRole = await getRequesterRole(actorUid);
  requireAnyRole(actorRole, ["admin", "superadmin"]);

  const memberId = requireString(request.data?.memberId, "memberId");
  const amount = requireNumber(request.data?.amount, "amount");
  const currency = requireString(request.data?.currency, "currency").toUpperCase();
  const periodStart = requireDate(request.data?.periodStart, "periodStart");
  const periodEnd = requireDate(request.data?.periodEnd, "periodEnd");
  const reference = optionalString(request.data?.reference) ?? "";
  const note = optionalString(request.data?.note) ?? "";

  if (amount <= 0) throw new HttpsError("invalid-argument", "ERROR_INVALID_AMOUNT");
  if (periodEnd.getTime() < periodStart.getTime()) {
    throw new HttpsError("invalid-argument", "ERROR_INVALID_PERIOD");
  }

  const memberSnap = await db.collection("members").doc(memberId).get();
  if (!memberSnap.exists) throw new HttpsError("not-found", "ERROR_MEMBER_NOT_FOUND");

  const activePolicy = await getActiveContributionPolicy();
  if (!activePolicy) {
    throw new HttpsError("failed-precondition", "ERROR_POLICY_NOT_FOUND");
  }

  const paymentRef = db.collection("payments").doc();
  await paymentRef.set({
    memberId,
    policyId: activePolicy.id,
    amount,
    currency,
    periodStart,
    periodEnd,
    reference,
    note,
    recordedBy: actorUid,
    recordedAt: FieldValue.serverTimestamp(),
  });

  const upToDate = await isContributionUpToDate(memberId);
  await db.collection("members").doc(memberId).set(
    {
      contributionUpToDate: upToDate,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeAudit({
    action: "payment.record",
    actorId: actorUid,
    actorRole: actorRole ?? "admin",
    targetType: "payment",
    targetId: paymentRef.id,
    details: { memberId, amount, currency, periodEnd: periodEnd.toISOString() },
  });

  return ok({ paymentId: paymentRef.id });
});

export const createCondition = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  requireAuth(actorUid);
  const actorRole = await getRequesterRole(actorUid);
  requireAnyRole(actorRole, ["superadmin"]);

  const name = requireString(request.data?.name, "name");
  const description = requireString(request.data?.description, "description");
  const type = requireEnum<ConditionType>(request.data?.type, "type", ["checkbox", "date", "amount", "file", "text"]);
  const validityDuration = request.data?.validityDuration;
  const validityDays =
    typeof validityDuration === "number" && validityDuration > 0 ? Math.floor(validityDuration) : null;

  const ref = db.collection("conditions").doc();
  await ref.set({
    name,
    description,
    type,
    validatedBy: "admin",
    validityDuration: validityDays,
    isActive: true,
    createdBy: actorUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAudit({
    action: "condition.create",
    actorId: actorUid,
    actorRole: "superadmin",
    targetType: "condition",
    targetId: ref.id,
    details: { name, type, validityDuration: validityDays },
  });

  return ok({ conditionId: ref.id });
});

export const updateCondition = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  requireAuth(actorUid);
  const actorRole = await getRequesterRole(actorUid);
  requireAnyRole(actorRole, ["superadmin"]);

  const conditionId = requireString(request.data?.conditionId, "conditionId");
  const updatesInput = request.data?.updates as Record<string, unknown> | undefined;
  if (!updatesInput) throw new HttpsError("invalid-argument", "Invalid updates.");

  const updates: Record<string, unknown> = {};
  if (typeof updatesInput.name === "string") updates.name = updatesInput.name.trim();
  if (typeof updatesInput.description === "string") {
    updates.description = updatesInput.description.trim();
  }
  if (typeof updatesInput.isActive === "boolean") updates.isActive = updatesInput.isActive;
  if (typeof updatesInput.validityDuration === "number") {
    updates.validityDuration = Math.floor(updatesInput.validityDuration);
  }

  if (Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "Invalid updates.");
  }

  const ref = db.collection("conditions").doc(conditionId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "ERROR_CONDITION_NOT_FOUND");

  await ref.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAudit({
    action: "condition.update",
    actorId: actorUid,
    actorRole: "superadmin",
    targetType: "condition",
    targetId: conditionId,
    details: { fields: Object.keys(updates) },
  });

  return ok({ conditionId });
});

export const validateCondition = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  requireAuth(actorUid);
  const actorRole = await getRequesterRole(actorUid);
  requireAnyRole(actorRole, ["admin", "superadmin"]);

  const memberId = requireString(request.data?.memberId, "memberId");
  const conditionId = requireString(request.data?.conditionId, "conditionId");
  const validated = Boolean(request.data?.validated);
  const note = optionalString(request.data?.note) ?? "";
  const evidence = optionalString(request.data?.evidence) ?? "";

  const memberSnap = await db.collection("members").doc(memberId).get();
  if (!memberSnap.exists) throw new HttpsError("not-found", "ERROR_MEMBER_NOT_FOUND");
  const conditionRef = db.collection("conditions").doc(conditionId);
  const conditionSnap = await conditionRef.get();
  if (!conditionSnap.exists) {
    throw new HttpsError("not-found", "ERROR_CONDITION_NOT_FOUND");
  }

  const condition = conditionSnap.data() as { validityDuration?: number };
  let expiresAt: Date | null = null;
  if (validated && typeof condition.validityDuration === "number") {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + condition.validityDuration);
  }

  const docId = memberConditionDocId(memberId, conditionId);
  await db.collection("memberConditions").doc(docId).set(
    {
      memberId,
      conditionId,
      validated,
      validatedBy: actorUid,
      validatedAt: FieldValue.serverTimestamp(),
      expiresAt,
      note,
      evidence,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeAudit({
    action: validated ? "condition.validate" : "condition.invalidate",
    actorId: actorUid,
    actorRole: actorRole ?? "admin",
    targetType: "condition",
    targetId: conditionId,
    details: { memberId, note },
  });

  return ok({ memberId, conditionId, validated });
});

export const computeEligibility = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  requireAuth(actorUid);
  const actorRole = await getRequesterRole(actorUid);

  const memberId = requireString(request.data?.memberId, "memberId");
  const electionId = optionalString(request.data?.electionId);

  const isSelf = actorUid === memberId;
  if (!isSelf) requireAnyRole(actorRole, ["admin", "superadmin"]);

  const memberSnap = await db.collection("members").doc(memberId).get();
  if (!memberSnap.exists) throw new HttpsError("not-found", "ERROR_MEMBER_NOT_FOUND");
  const member = memberSnap.data() as {
    status?: MemberStatus;
    joinedAt?: { toDate?: () => Date };
    sectionId?: string;
  };

  const reasons: Array<{
    condition: string;
    met: boolean;
    detail: string;
  }> = [];

  const statusOk = member.status === "active";
  reasons.push({
    condition: "member_status",
    met: statusOk,
    detail: statusOk ? "Statut actif" : "Le membre doit etre actif",
  });

  const contributionOk = await isContributionUpToDate(memberId);
  reasons.push({
    condition: "contribution",
    met: contributionOk,
    detail: contributionOk ? "Cotisation a jour" : "Cotisation en retard",
  });

  let requiredConditionIds: string[] = [];
  if (electionId) {
    const electionSnap = await db.collection("elections").doc(electionId).get();
    if (!electionSnap.exists) {
      throw new HttpsError("not-found", "ERROR_ELECTION_NOT_FOUND");
    }
    const election = electionSnap.data() as {
      minSeniority?: number;
      allowedSectionIds?: string[] | null;
      voterConditionIds?: string[];
    };

    const joinedAtDate = member.joinedAt?.toDate?.();
    const minSeniorityDays = Number(election.minSeniority ?? 0);
    const seniorityOk =
      minSeniorityDays <= 0 ||
      Boolean(joinedAtDate && (Date.now() - joinedAtDate.getTime()) / 86400000 >= minSeniorityDays);
    reasons.push({
      condition: "seniority",
      met: seniorityOk,
      detail: seniorityOk ? "Anciennete conforme" : `Anciennete insuffisante (minimum ${minSeniorityDays} jours)`,
    });

    const allowedSections = election.allowedSectionIds ?? null;
    const sectionOk =
      !allowedSections || allowedSections.length === 0 ? true : allowedSections.includes(member.sectionId ?? "");
    reasons.push({
      condition: "section",
      met: sectionOk,
      detail: sectionOk ? "Section autorisee" : "Section non autorisee",
    });

    requiredConditionIds = election.voterConditionIds ?? [];
  } else {
    const activeConditions = await db.collection("conditions").where("isActive", "==", true).get();
    requiredConditionIds = activeConditions.docs.map((doc) => doc.id);
  }

  for (const conditionId of requiredConditionIds) {
    const docId = memberConditionDocId(memberId, conditionId);
    const mcSnap = await db.collection("memberConditions").doc(docId).get();
    const mc = mcSnap.data() as {
      validated?: boolean;
      expiresAt?: { toDate?: () => Date };
    };
    const expiresAt = mc?.expiresAt?.toDate?.();
    const notExpired = !expiresAt || expiresAt.getTime() >= Date.now();
    const met = Boolean(mcSnap.exists && mc.validated && notExpired);
    reasons.push({
      condition: `condition_${conditionId}`,
      met,
      detail: met ? "Condition validee" : "Condition non validee ou expiree",
    });
  }

  const eligible = reasons.every((reason) => reason.met);
  return ok({ eligible, reasons });
});
