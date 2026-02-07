/* eslint-disable no-console */
const { initializeApp, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, Timestamp, getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "model-vote-fr-2026";
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
const DEFAULT_PASSWORD = "ModelVote!2026";

process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_HOST;
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;

if (getApps().length === 0) {
  initializeApp({ projectId: PROJECT_ID });
}

const auth = getAuth();
const db = getFirestore();

function tsFromNow(days) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return Timestamp.fromDate(date);
}

async function upsertUser(userConfig) {
  const {
    email,
    password = DEFAULT_PASSWORD,
    role,
    status,
    firstName,
    lastName,
    phone,
    sectionId,
    joinedDaysAgo,
    contributionUpToDate,
  } = userConfig;

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    await auth.updateUser(userRecord.uid, {
      password,
      emailVerified: true,
      displayName: `${firstName} ${lastName}`,
      disabled: false,
    });
  } catch {
    userRecord = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: `${firstName} ${lastName}`,
      disabled: false,
    });
  }

  await auth.setCustomUserClaims(userRecord.uid, { role });

  await db
    .collection("members")
    .doc(userRecord.uid)
    .set(
      {
        uid: userRecord.uid,
        email,
        emailVerified: true,
        firstName,
        lastName,
        phone,
        sectionId,
        role,
        status,
        joinedAt: tsFromNow(-joinedDaysAgo),
        profileCompleted: true,
        contributionUpToDate,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return { uid: userRecord.uid, email, role, status };
}

async function seed() {
  const sections = [
    { id: "sec-paris", name: "Paris", city: "Paris", region: "Ile-de-France" },
    { id: "sec-lyon", name: "Lyon", city: "Lyon", region: "Auvergne-Rhone-Alpes" },
    { id: "sec-marseille", name: "Marseille", city: "Marseille", region: "Provence-Alpes-Cote d'Azur" },
  ];

  for (const section of sections) {
    await db
      .collection("sections")
      .doc(section.id)
      .set(
        {
          ...section,
          memberCount: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }

  const userConfigs = [
    {
      key: "superadmin_primary",
      email: "superadmin1@model.test",
      role: "superadmin",
      status: "active",
      firstName: "Saliou",
      lastName: "Diallo",
      phone: "+33 6 11 22 33 44",
      sectionId: "sec-paris",
      joinedDaysAgo: 900,
      contributionUpToDate: true,
    },
    {
      key: "superadmin_backup",
      email: "emrysdiallo@gmail.com",
      role: "superadmin",
      status: "active",
      firstName: "Emrys",
      lastName: "Diallo",
      phone: "+33 6 55 44 33 22",
      sectionId: "sec-paris",
      joinedDaysAgo: 700,
      contributionUpToDate: true,
    },
    {
      key: "admin_1",
      email: "admin1@model.test",
      role: "admin",
      status: "active",
      firstName: "Aissatou",
      lastName: "Barry",
      phone: "+33 6 10 00 00 01",
      sectionId: "sec-lyon",
      joinedDaysAgo: 620,
      contributionUpToDate: true,
    },
    {
      key: "admin_2",
      email: "admin2@model.test",
      role: "admin",
      status: "active",
      firstName: "Moussa",
      lastName: "Camara",
      phone: "+33 6 10 00 00 02",
      sectionId: "sec-marseille",
      joinedDaysAgo: 580,
      contributionUpToDate: true,
    },
    {
      key: "member_ok",
      email: "member_ok@model.test",
      role: "member",
      status: "active",
      firstName: "Fatou",
      lastName: "Sow",
      phone: "+33 6 10 00 00 03",
      sectionId: "sec-paris",
      joinedDaysAgo: 420,
      contributionUpToDate: true,
    },
    {
      key: "member_late",
      email: "member_late@model.test",
      role: "member",
      status: "active",
      firstName: "Ibrahima",
      lastName: "Sylla",
      phone: "+33 6 10 00 00 04",
      sectionId: "sec-lyon",
      joinedDaysAgo: 400,
      contributionUpToDate: false,
    },
    {
      key: "member_new",
      email: "member_new@model.test",
      role: "member",
      status: "active",
      firstName: "Naby",
      lastName: "Balde",
      phone: "+33 6 10 00 00 05",
      sectionId: "sec-marseille",
      joinedDaysAgo: 40,
      contributionUpToDate: true,
    },
    {
      key: "member_suspended",
      email: "member_suspended@model.test",
      role: "member",
      status: "suspended",
      firstName: "Oumou",
      lastName: "Diallo",
      phone: "+33 6 10 00 00 06",
      sectionId: "sec-paris",
      joinedDaysAgo: 510,
      contributionUpToDate: true,
    },
    {
      key: "member_user_existing",
      email: "mamadousaliou52.merlin@gmail.com",
      role: "member",
      status: "active",
      firstName: "Mamadou",
      lastName: "Merlin",
      phone: "+33 6 10 00 00 07",
      sectionId: "sec-paris",
      joinedDaysAgo: 360,
      contributionUpToDate: true,
    },
  ];

  const users = {};
  for (const config of userConfigs) {
    users[config.key] = await upsertUser(config);
  }

  const sectionCounts = {
    "sec-paris": 0,
    "sec-lyon": 0,
    "sec-marseille": 0,
  };
  for (const config of userConfigs) {
    if (sectionCounts[config.sectionId] !== undefined) {
      sectionCounts[config.sectionId] += 1;
    }
  }

  for (const section of sections) {
    await db.collection("sections").doc(section.id).set(
      {
        memberCount: sectionCounts[section.id],
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await db.collection("contributionPolicies").doc("policy-2026-monthly").set(
    {
      name: "Cotisation mensuelle MODEL 2026",
      amount: 10,
      currency: "EUR",
      periodicity: "monthly",
      gracePeriodDays: 7,
      isActive: true,
      createdBy: users.superadmin_primary.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const payments = [
    {
      id: "pay-member-ok-current",
      memberKey: "member_ok",
      periodStart: tsFromNow(-20),
      periodEnd: tsFromNow(12),
      amount: 10,
      note: "A jour",
    },
    {
      id: "pay-member-late-old",
      memberKey: "member_late",
      periodStart: tsFromNow(-80),
      periodEnd: tsFromNow(-35),
      amount: 10,
      note: "En retard",
    },
    {
      id: "pay-member-new-current",
      memberKey: "member_new",
      periodStart: tsFromNow(-10),
      periodEnd: tsFromNow(20),
      amount: 10,
      note: "A jour mais anciennete insuffisante",
    },
    {
      id: "pay-admin1-current",
      memberKey: "admin_1",
      periodStart: tsFromNow(-20),
      periodEnd: tsFromNow(15),
      amount: 10,
      note: "Admin a jour",
    },
    {
      id: "pay-admin2-current",
      memberKey: "admin_2",
      periodStart: tsFromNow(-20),
      periodEnd: tsFromNow(15),
      amount: 10,
      note: "Admin a jour",
    },
  ];

  for (const payment of payments) {
    await db.collection("payments").doc(payment.id).set(
      {
        memberId: users[payment.memberKey].uid,
        policyId: "policy-2026-monthly",
        amount: payment.amount,
        currency: "EUR",
        periodStart: payment.periodStart,
        periodEnd: payment.periodEnd,
        reference: payment.id.toUpperCase(),
        recordedBy: users.admin_1.uid,
        recordedAt: FieldValue.serverTimestamp(),
        note: payment.note,
      },
      { merge: true },
    );
  }

  await db.collection("conditions").doc("cond-charte").set(
    {
      name: "Charte signee",
      description: "Le membre confirme l'acceptation de la charte federale.",
      type: "checkbox",
      validatedBy: "admin",
      validityDuration: null,
      createdBy: users.superadmin_primary.uid,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection("conditions").doc("cond-piece").set(
    {
      name: "Piece justificative validee",
      description: "Justificatif d'identite valide par un admin.",
      type: "file",
      validatedBy: "admin",
      validityDuration: 365,
      createdBy: users.superadmin_primary.uid,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const memberConditions = [
    { memberKey: "member_ok", conditionId: "cond-charte", validated: true, note: "Charte validee" },
    { memberKey: "member_ok", conditionId: "cond-piece", validated: true, note: "Piece OK" },
    { memberKey: "member_late", conditionId: "cond-charte", validated: true, note: "Charte validee" },
    { memberKey: "member_late", conditionId: "cond-piece", validated: true, note: "Piece OK" },
    { memberKey: "member_new", conditionId: "cond-charte", validated: true, note: "Charte validee" },
    { memberKey: "member_new", conditionId: "cond-piece", validated: true, note: "Piece OK" },
    { memberKey: "admin_1", conditionId: "cond-charte", validated: true, note: "Admin charte validee" },
    { memberKey: "admin_1", conditionId: "cond-piece", validated: true, note: "Admin piece validee" },
    { memberKey: "admin_2", conditionId: "cond-charte", validated: true, note: "Admin charte validee" },
    { memberKey: "admin_2", conditionId: "cond-piece", validated: true, note: "Admin piece validee" },
    { memberKey: "member_suspended", conditionId: "cond-charte", validated: false, note: "Suspendu" },
  ];

  for (const item of memberConditions) {
    const memberId = users[item.memberKey].uid;
    const id = `${memberId}_${item.conditionId}`;
    await db.collection("memberConditions").doc(id).set(
      {
        memberId,
        conditionId: item.conditionId,
        validated: item.validated,
        validatedBy: users.admin_1.uid,
        validatedAt: item.validated ? FieldValue.serverTimestamp() : null,
        expiresAt: item.validated ? tsFromNow(240) : null,
        note: item.note,
        evidence: item.validated ? `docs/${id}.pdf` : null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await db.collection("elections").doc("election-open-2026").set(
    {
      title: "Election federale 2026 (ouverte)",
      description: "Election de demonstration en cours pour tester le vote.",
      type: "federal",
      status: "open",
      startAt: tsFromNow(-2),
      endAt: tsFromNow(5),
      voterConditionIds: ["cond-charte"],
      candidateConditionIds: ["cond-charte", "cond-piece"],
      allowedSectionIds: null,
      minSeniority: 90,
      totalEligibleVoters: 5,
      totalVotesCast: 0,
      createdBy: users.superadmin_primary.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lockedAt: tsFromNow(-2),
      closedAt: null,
      publishedAt: null,
    },
    { merge: true },
  );

  await db.collection("elections").doc("election-open-2026").collection("candidates").doc("cand-open-1").set(
    {
      memberId: users.member_ok.uid,
      displayName: "Fatou Sow",
      sectionName: "Paris",
      bio: "Programme de modernisation des sections.",
      photoUrl: null,
      status: "validated",
      displayOrder: 1,
      addedBy: users.admin_1.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection("elections").doc("election-open-2026").collection("candidates").doc("cand-open-2").set(
    {
      memberId: users.admin_2.uid,
      displayName: "Moussa Camara",
      sectionName: "Marseille",
      bio: "Programme de structuration federale.",
      photoUrl: null,
      status: "validated",
      displayOrder: 2,
      addedBy: users.admin_1.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection("elections").doc("election-open-2026").collection("candidates").doc("cand-open-3").set(
    {
      memberId: users.member_late.uid,
      displayName: "Ibrahima Sylla",
      sectionName: "Lyon",
      bio: "Candidat en attente de validation.",
      photoUrl: null,
      status: "proposed",
      displayOrder: 3,
      addedBy: users.admin_2.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection("elections").doc("election-published-2025").set(
    {
      title: "Election federale 2025 (publiee)",
      description: "Election de reference avec resultats publies.",
      type: "federal",
      status: "published",
      startAt: tsFromNow(-120),
      endAt: tsFromNow(-90),
      voterConditionIds: ["cond-charte"],
      candidateConditionIds: ["cond-charte", "cond-piece"],
      allowedSectionIds: null,
      minSeniority: 60,
      totalEligibleVoters: 6,
      totalVotesCast: 5,
      createdBy: users.superadmin_primary.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lockedAt: tsFromNow(-120),
      closedAt: tsFromNow(-90),
      publishedAt: tsFromNow(-89),
    },
    { merge: true },
  );

  await db.collection("elections").doc("election-published-2025").collection("candidates").doc("cand-pub-1").set(
    {
      memberId: users.member_ok.uid,
      displayName: "Fatou Sow",
      sectionName: "Paris",
      bio: "Candidate principale.",
      photoUrl: null,
      status: "validated",
      displayOrder: 1,
      addedBy: users.admin_1.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection("elections").doc("election-published-2025").collection("candidates").doc("cand-pub-2").set(
    {
      memberId: users.admin_2.uid,
      displayName: "Moussa Camara",
      sectionName: "Marseille",
      bio: "Candidat challenger.",
      photoUrl: null,
      status: "validated",
      displayOrder: 2,
      addedBy: users.admin_1.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection("elections").doc("election-published-2025").collection("results").doc("cand-pub-1").set(
    {
      candidateId: "cand-pub-1",
      displayName: "Fatou Sow",
      voteCount: 3,
      percentage: 60,
      rank: 1,
      computedAt: tsFromNow(-89),
    },
    { merge: true },
  );

  await db.collection("elections").doc("election-published-2025").collection("results").doc("cand-pub-2").set(
    {
      candidateId: "cand-pub-2",
      displayName: "Moussa Camara",
      voteCount: 2,
      percentage: 40,
      rank: 2,
      computedAt: tsFromNow(-89),
    },
    { merge: true },
  );

  await db.collection("elections").doc("election-published-2025").collection("tokenIndex").doc(users.member_ok.uid).set(
    {
      voteToken: "tok_member_ok_2025",
      issuedAt: tsFromNow(-100),
      hasVoted: true,
      votedAt: tsFromNow(-95),
    },
    { merge: true },
  );

  await db
    .collection("elections")
    .doc("election-published-2025")
    .collection("ballots")
    .doc("tok_member_ok_2025")
    .set(
      {
        voteToken: "tok_member_ok_2025",
        candidateId: "cand-pub-1",
        castAt: tsFromNow(-95),
      },
      { merge: true },
    );

  await db.collection("auditLogs").doc("seed-log-1").set(
    {
      action: "seed.run",
      actorId: "system",
      actorRole: "system",
      targetType: "election",
      targetId: "election-open-2026",
      details: { note: "Jeu de donnees de demonstration initialise." },
      timestamp: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection("auditLogs").doc("seed-log-2").set(
    {
      action: "election.publish",
      actorId: users.superadmin_primary.uid,
      actorRole: "superadmin",
      targetType: "election",
      targetId: "election-published-2025",
      details: { source: "seed" },
      timestamp: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const summary = Object.values(users).map((user) => ({
    email: user.email,
    uid: user.uid,
    role: user.role,
    status: user.status,
    password: DEFAULT_PASSWORD,
  }));

  console.log("\nSeed termine.");
  console.log(`Projet: ${PROJECT_ID}`);
  console.log(`Auth emulator: ${AUTH_EMULATOR_HOST}`);
  console.table(summary);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erreur seed:", error);
    process.exit(1);
  });
