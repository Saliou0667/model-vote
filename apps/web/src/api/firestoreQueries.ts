import { collection, getDocs, orderBy, query, where, type DocumentData } from "firebase/firestore";
import { db } from "../config/firebase";
import type {
  Candidate,
  Condition,
  ContributionPolicy,
  Election,
  Member,
  MemberCondition,
  PaymentRecord,
  Section,
} from "../types/models";

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
    city: String(data.city ?? ""),
    phone: String(data.phone ?? ""),
    sectionId: String(data.sectionId ?? ""),
    role: (data.role ?? "member") as Member["role"],
    status: (data.status ?? "pending") as Member["status"],
    registrationSource: (data.registrationSource ?? "self_registration") as Member["registrationSource"],
    votingApprovedByAdmin: Boolean(data.votingApprovedByAdmin),
    emailVerified: Boolean(data.emailVerified),
    passwordChangeRequired: Boolean(data.passwordChangeRequired),
    passwordUpdatedAt: data.passwordUpdatedAt ?? null,
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

export async function fetchMembers(options?: { includeSuperAdmins?: boolean }): Promise<Member[]> {
  const includeSuperAdmins = options?.includeSuperAdmins === true;
  const membersCollection = collection(db, "members");
  const q = includeSuperAdmins
    ? query(membersCollection, orderBy("createdAt", "desc"))
    : query(membersCollection, where("role", "in", ["member", "admin"]));
  const snap = await getDocs(q);
  const members = snap.docs.map((doc) => toMember(doc.id, doc.data()));

  // Keep a stable recent-first ordering even for filtered queries.
  members.sort((a, b) => {
    const aTime = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
    const bTime = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
    return bTime - aTime;
  });
  return members;
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

export async function fetchElections(): Promise<Election[]> {
  const q = query(collection(db, "elections"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: String(data.title ?? ""),
      description: String(data.description ?? ""),
      type: (data.type ?? "federal") as Election["type"],
      status: (data.status ?? "draft") as Election["status"],
      startAt: data.startAt,
      endAt: data.endAt,
      voterConditionIds: Array.isArray(data.voterConditionIds) ? data.voterConditionIds : [],
      candidateConditionIds: Array.isArray(data.candidateConditionIds) ? data.candidateConditionIds : [],
      allowedSectionIds: Array.isArray(data.allowedSectionIds) ? data.allowedSectionIds : null,
      minSeniority: Number(data.minSeniority ?? 0),
      totalEligibleVoters: Number(data.totalEligibleVoters ?? 0),
      totalVotesCast: Number(data.totalVotesCast ?? 0),
    };
  });
}

export async function fetchMemberVisibleElections(): Promise<Election[]> {
  const q = query(collection(db, "elections"), where("status", "in", ["open", "published"]));
  const snap = await getDocs(q);
  const elections = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: String(data.title ?? ""),
      description: String(data.description ?? ""),
      type: (data.type ?? "federal") as Election["type"],
      status: (data.status ?? "draft") as Election["status"],
      startAt: data.startAt,
      endAt: data.endAt,
      voterConditionIds: Array.isArray(data.voterConditionIds) ? data.voterConditionIds : [],
      candidateConditionIds: Array.isArray(data.candidateConditionIds) ? data.candidateConditionIds : [],
      allowedSectionIds: Array.isArray(data.allowedSectionIds) ? data.allowedSectionIds : null,
      minSeniority: Number(data.minSeniority ?? 0),
      totalEligibleVoters: Number(data.totalEligibleVoters ?? 0),
      totalVotesCast: Number(data.totalVotesCast ?? 0),
    };
  });

  return elections.sort((a, b) => {
    const aDate = a.startAt?.toDate?.();
    const bDate = b.startAt?.toDate?.();
    const aTime = aDate ? aDate.getTime() : 0;
    const bTime = bDate ? bDate.getTime() : 0;
    return bTime - aTime;
  });
}

export async function fetchCandidates(electionId: string): Promise<Candidate[]> {
  if (!electionId) return [];
  const q = query(collection(db, `elections/${electionId}/candidates`), orderBy("displayOrder", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      memberId: String(data.memberId ?? ""),
      displayName: String(data.displayName ?? ""),
      sectionName: String(data.sectionName ?? ""),
      bio: String(data.bio ?? ""),
      projectSummary: String(data.projectSummary ?? ""),
      videoUrl: String(data.videoUrl ?? ""),
      photoUrl: String(data.photoUrl ?? ""),
      status: (data.status ?? "proposed") as Candidate["status"],
      displayOrder: Number(data.displayOrder ?? 0),
    };
  });
}
