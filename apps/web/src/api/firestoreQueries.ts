import { collection, getDocs, orderBy, query, type DocumentData } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Member, Section } from "../types/models";

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
