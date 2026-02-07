import { collection, getDocs, orderBy, query, where, type DocumentData } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Condition, ContributionPolicy, Member, MemberCondition, PaymentRecord, Section } from "../types/models";

function toSection(id: string, data: DocumentData): Section {
  return {
    id,
    name: String(data.name ?? ""),
    city: String(data.city ?? ""),
    region: String(data.region ?? ""),
    memberCount: Number(data.memberCount ?? 0),
  };
}

function toMember(id: string, data: DocumentData): Member {
  return {
    id,
    uid: String(data.uid ?? id),
    email: String(data.email ?? ""),
    firstName: String(data.firstName ?? ""),
    lastName: String(data.lastName ?? ""),
    phone: String(data.phone ?? ""),
    sectionId: String(data.sectionId ?? ""),
    role: (data.role ?? "member") as Member["role"],
    status: (data.status ?? "pending") as Member["status"],
    emailVerified: Boolean(data.emailVerified),
    contributionUpToDate: Boolean(data.contributionUpToDate),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function fetchSections(): Promise<Section[]> {
  const q = query(collection(db, "sections"), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => toSection(doc.id, doc.data()));
}

export async function fetchMembers(): Promise<Member[]> {
  const q = query(collection(db, "members"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => toMember(doc.id, doc.data()));
}

export async function fetchActiveContributionPolicy(): Promise<ContributionPolicy | null> {
  const q = query(collection(db, "contributionPolicies"), where("isActive", "==", true));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    name: String(data.name ?? ""),
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? "EUR"),
    periodicity: (data.periodicity ?? "monthly") as ContributionPolicy["periodicity"],
    gracePeriodDays: Number(data.gracePeriodDays ?? 0),
    isActive: Boolean(data.isActive),
  };
}

export async function fetchPayments(limit = 100): Promise<PaymentRecord[]> {
  const q = query(collection(db, "payments"), orderBy("recordedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.slice(0, limit).map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      memberId: String(data.memberId ?? ""),
      policyId: String(data.policyId ?? ""),
      amount: Number(data.amount ?? 0),
      currency: String(data.currency ?? "EUR"),
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      reference: String(data.reference ?? ""),
      note: String(data.note ?? ""),
      recordedBy: String(data.recordedBy ?? ""),
      recordedAt: data.recordedAt,
    };
  });
}

export async function fetchConditions(): Promise<Condition[]> {
  const q = query(collection(db, "conditions"), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: String(data.name ?? ""),
      description: String(data.description ?? ""),
      type: (data.type ?? "checkbox") as Condition["type"],
      validityDuration: typeof data.validityDuration === "number" ? data.validityDuration : null,
      isActive: Boolean(data.isActive),
    };
  });
}

export async function fetchMemberConditions(memberId: string): Promise<MemberCondition[]> {
  if (!memberId) return [];
  const q = query(collection(db, "memberConditions"), where("memberId", "==", memberId), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      memberId: String(data.memberId ?? ""),
      conditionId: String(data.conditionId ?? ""),
      validated: Boolean(data.validated),
      validatedBy: String(data.validatedBy ?? ""),
      validatedAt: data.validatedAt,
      expiresAt: data.expiresAt ?? null,
      note: String(data.note ?? ""),
      evidence: String(data.evidence ?? ""),
    };
  });
}
