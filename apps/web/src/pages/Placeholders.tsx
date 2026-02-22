import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { useTheme } from "@mui/material/styles";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { callFunction, getErrorMessage } from "../api/callables";
import {
  fetchActiveContributionPolicy,
  fetchCandidates,
  fetchConditions,
  fetchElections,
  fetchMemberVisibleElections,
  fetchMemberConditions,
  fetchMembers,
  fetchPayments,
  fetchSections,
} from "../api/firestoreQueries";
import { useAuth } from "../hooks/useAuth";
import type { Candidate, Condition, Election, Member, MemberCondition, PaymentRecord, Section } from "../types/models";

type PlaceholderPageProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  loading?: boolean;
};

const queryKeys = {
  sections: ["sections"] as const,
  members: ["members"] as const,
  policy: ["policy"] as const,
  payments: ["payments"] as const,
  conditions: ["conditions"] as const,
  elections: ["elections"] as const,
  memberElections: ["memberElections"] as const,
};

const ADMIN_SCORES_DISPLAY_ORDER: string[] = [
  "election-bureau-federal",
  "election-bureau-secretaire",
  "election-bureau-tresorier",
  "election-bureau-conseiller-charge-de-la-formation",
  "election-bureau-conseiller-charge-de-l-encadrement-des-str",
  "election-bureau-conseiller-charge-de-la-sensibilisation-co",
  "election-bureau-conseiller-charge-des-questions-sociales",
  "election-bureau-secretaire-a-la-securite",
  "election-bureau-secretaire-au-sport",
];

const candidatePhotoFallbacks: Array<{ requiredTokens: string[]; forbiddenTokens?: string[]; photoUrl: string }> = [
  { requiredTokens: ["mamoudou", "kourdiou", "diallo"], photoUrl: "/candidates/mamoudou-kourdiou-diallo.png" },
  { requiredTokens: ["saikou", "diallo"], photoUrl: "/candidates/mamadou-saikou-diallo.png" },
  { requiredTokens: ["dan", "daniel", "lama"], photoUrl: "/candidates/dan-daniel-lama.png" },
  { requiredTokens: ["alseny", "camara"], photoUrl: "/candidates/alseny-camara.png" },
  {
    requiredTokens: ["thierno", "mamadou", "bobo", "fofana"],
    photoUrl: "/candidates/thierno-mamadou-bobo-fofana.png",
  },
  { requiredTokens: ["mamadou", "samba", "barry"], photoUrl: "/candidates/mamadou-samba-barry.png" },
  { requiredTokens: ["mamadou", "saliou", "barry"], photoUrl: "/candidates/mamadou-saliou-barry.png" },
  { requiredTokens: ["hasmiou", "barry"], photoUrl: "/candidates/mamadou-hasmiou-barry.png" },
  {
    requiredTokens: ["boubacar", "diallo"],
    forbiddenTokens: ["ibrahim"],
    photoUrl: "/candidates/boubacar-diallo.png",
  },
  { requiredTokens: ["bailo", "diallo"], photoUrl: "/candidates/bailo-diallo.png" },
  { requiredTokens: ["ibrahima", "sory", "sow"], photoUrl: "/candidates/ibrahima-sory-sow.png" },
  {
    requiredTokens: ["ibrahima", "sory", "nguilla", "diallo"],
    photoUrl: "/candidates/ibrahima-sory-nguilla-diallo.png",
  },
];

function normalizeCandidateName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function resolveCandidatePhotoUrl(candidateName: string, candidatePhotoUrl?: string): string | undefined {
  const explicitPhotoUrl = candidatePhotoUrl?.trim();
  if (explicitPhotoUrl) return explicitPhotoUrl;
  const normalizedName = normalizeCandidateName(candidateName);
  const fallback = candidatePhotoFallbacks.find((entry) => {
    const hasRequiredTokens = entry.requiredTokens.every((token) => normalizedName.includes(token));
    if (!hasRequiredTokens) return false;
    const hasForbiddenToken = (entry.forbiddenTokens ?? []).some((token) => normalizedName.includes(token));
    return !hasForbiddenToken;
  });
  return fallback?.photoUrl;
}

function splitElectionTitleForDisplay(title: string): { scrutinTitle: string; posteTitle: string } {
  const normalized = title.trim();
  if (!normalized) {
    return { scrutinTitle: "Election", posteTitle: "Poste non renseigne" };
  }

  const parts = normalized
    .split(/\s[-–—]\s/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      scrutinTitle: parts[0],
      posteTitle: parts.slice(1).join(" - "),
    };
  }

  return { scrutinTitle: "Scrutin", posteTitle: normalized };
}

function memberStatusChipColor(status: Member["status"]): "warning" | "success" | "error" {
  if (status === "active") return "success";
  if (status === "suspended") return "error";
  return "warning";
}

function electionStatusChipColor(status: Election["status"]): "warning" | "success" | "error" | "info" | "default" {
  if (status === "open") return "success";
  if (status === "closed") return "warning";
  if (status === "published") return "info";
  if (status === "archived") return "default";
  return "default";
}

function electionParticipationRate(election: Election): number {
  const totalEligible = Number(election.totalEligibleVoters ?? 0);
  const totalVotes = Number(election.totalVotesCast ?? 0);
  if (totalEligible <= 0) return 0;
  return (totalVotes / totalEligible) * 100;
}

function adminScoresOrderIndex(electionId: string): number {
  const index = ADMIN_SCORES_DISPLAY_ORDER.indexOf(electionId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function toDateTimeLocalInput(value: Date | null | undefined): string {
  if (!value || Number.isNaN(value.getTime())) return "";
  const pad = (v: number) => String(v).padStart(2, "0");
  const year = value.getFullYear();
  const month = pad(value.getMonth() + 1);
  const day = pad(value.getDate());
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function PlaceholderPage({ title, subtitle, actionLabel, loading = false }: PlaceholderPageProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          {loading ? (
            <Skeleton variant="text" width={220} height={36} />
          ) : (
            <Typography variant="h5">{title}</Typography>
          )}
          {loading ? (
            <>
              <Skeleton variant="text" width="90%" />
              <Skeleton variant="text" width="70%" />
            </>
          ) : (
            <Typography color="text.secondary">{subtitle}</Typography>
          )}
          {actionLabel ? <Button variant="contained">{actionLabel}</Button> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ResponsiveTable({
  children,
  minWidth = 680,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <TableContainer
      sx={{
        width: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        "& table": { minWidth },
      }}
    >
      {children}
    </TableContainer>
  );
}

export function MemberDashboardPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Bienvenue</Typography>
      <PlaceholderPage
        title="Espace membre"
        subtitle="Votre espace est actif. Completez votre profil, puis consultez votre eligibilite."
      />
    </Stack>
  );
}

export function MemberProfilePage() {
  const queryClient = useQueryClient();
  const { user, profile, refreshAuthState } = useAuth();
  const [firstName, setFirstName] = useState<string | undefined>(undefined);
  const [lastName, setLastName] = useState<string | undefined>(undefined);
  const [city, setCity] = useState<string | undefined>(undefined);
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const sectionsQuery = useQuery({ queryKey: queryKeys.sections, queryFn: fetchSections });
  const firstNameValue = firstName ?? profile?.firstName ?? "";
  const lastNameValue = lastName ?? profile?.lastName ?? "";
  const cityValue = city ?? profile?.city ?? "";
  const phoneValue = phone ?? profile?.phone ?? "";
  const sectionValue = profile?.sectionId ?? "";
  const sectionLabel = sectionsQuery.data?.find((section) => section.id === sectionValue)?.name ?? sectionValue;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Utilisateur non connecte.");
      await callFunction("updateMember", {
        memberId: user.uid,
        updates: {
          firstName: firstNameValue,
          lastName: lastNameValue,
          city: cityValue,
          phone: phoneValue,
        },
      });
    },
    onSuccess: async () => {
      setError(null);
      setFeedback("Profil mis a jour.");
      setFirstName(undefined);
      setLastName(undefined);
      setCity(undefined);
      setPhone(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.members });
      await queryClient.invalidateQueries({ queryKey: queryKeys.sections });
      await refreshAuthState();
    },
    onError: (mutationError) => {
      setFeedback(null);
      setError(getErrorMessage(mutationError));
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Utilisateur non connecte.");
      if (newPassword.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caracteres.");
      if (newPassword !== confirmPassword) throw new Error("La confirmation du mot de passe ne correspond pas.");
      await callFunction("setMyPassword", { newPassword });
    },
    onSuccess: async () => {
      setPasswordError(null);
      setPasswordFeedback("Mot de passe mis a jour.");
      setNewPassword("");
      setConfirmPassword("");
      await refreshAuthState();
    },
    onError: (mutationError) => {
      setPasswordFeedback(null);
      setPasswordError(getErrorMessage(mutationError));
    },
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Mon profil</Typography>
      {profile?.passwordChangeRequired ? (
        <Alert severity="info">
          Vous pouvez changer votre mot de passe des maintenant (recommande), mais ce n&apos;est plus obligatoire pour voter.
        </Alert>
      ) : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField label="Prenom" value={firstNameValue} onChange={(event) => setFirstName(event.target.value)} />
            <TextField label="Nom" value={lastNameValue} onChange={(event) => setLastName(event.target.value)} />
            <TextField label="Ville" value={cityValue} onChange={(event) => setCity(event.target.value)} />
            <TextField label="Telephone" value={phoneValue} onChange={(event) => setPhone(event.target.value)} />
            <TextField label="Section (geree par admin)" value={sectionLabel || "-"} InputProps={{ readOnly: true }} />
            <Button variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending || !user}>
              Mettre a jour
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Changer mon mot de passe</Typography>
            {passwordFeedback ? <Alert severity="success">{passwordFeedback}</Alert> : null}
            {passwordError ? <Alert severity="error">{passwordError}</Alert> : null}
            <TextField
              label="Nouveau mot de passe"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              fullWidth
            />
            <TextField
              label="Confirmer le mot de passe"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              fullWidth
            />
            <Box>
              <Button
                variant="contained"
                onClick={() => passwordMutation.mutate()}
                disabled={!user || passwordMutation.isPending || !newPassword || !confirmPassword}
              >
                Enregistrer le nouveau mot de passe
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export function MemberCandidateSpacePage() {
  const queryClient = useQueryClient();
  const [selectedCandidateKey, setSelectedCandidateKey] = useState("");
  const [bio, setBio] = useState<string | undefined>(undefined);
  const [projectSummary, setProjectSummary] = useState<string | undefined>(undefined);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidaciesQuery = useQuery({
    queryKey: ["myCandidateSpaces"],
    queryFn: () =>
      callFunction<Record<string, never>, {
        candidacies: Array<{
          electionId: string;
          electionTitle: string;
          electionStatus: string;
          candidateId: string;
          displayName: string;
          sectionName: string;
          status: string;
          bio: string;
          projectSummary: string;
          videoUrl: string;
          photoUrl: string;
        }>;
      }>("getMyCandidateSpaces", {}),
  });

  const candidacies = candidaciesQuery.data?.candidacies ?? [];
  const activeKey = selectedCandidateKey || (candidacies[0] ? `${candidacies[0].electionId}:${candidacies[0].candidateId}` : "");
  const activeCandidacy = candidacies.find((entry) => `${entry.electionId}:${entry.candidateId}` === activeKey) ?? null;
  const canEdit = Boolean(activeCandidacy && ["draft", "open"].includes(activeCandidacy.electionStatus));

  const updatePresentationMutation = useMutation({
    mutationFn: async () => {
      if (!activeCandidacy) throw new Error("Candidature introuvable");
      await callFunction("updateCandidatePresentation", {
        electionId: activeCandidacy.electionId,
        candidateId: activeCandidacy.candidateId,
        bio: (bio ?? activeCandidacy.bio ?? "").trim(),
        projectSummary: (projectSummary ?? activeCandidacy.projectSummary ?? "").trim(),
        videoUrl: (videoUrl ?? activeCandidacy.videoUrl ?? "").trim(),
        photoUrl: (photoUrl ?? activeCandidacy.photoUrl ?? "").trim(),
      });
    },
    onSuccess: async () => {
      setError(null);
      setMessage("Presentation du candidat enregistree.");
      setBio(undefined);
      setProjectSummary(undefined);
      setVideoUrl(undefined);
      setPhotoUrl(undefined);
      await queryClient.invalidateQueries({ queryKey: ["myCandidateSpaces"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.memberElections });
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(getErrorMessage(mutationError));
    },
  });

  const bioValue = bio ?? activeCandidacy?.bio ?? "";
  const projectSummaryValue = projectSummary ?? activeCandidacy?.projectSummary ?? "";
  const videoUrlValue = videoUrl ?? activeCandidacy?.videoUrl ?? "";
  const photoUrlValue = photoUrl ?? activeCandidacy?.photoUrl ?? "";

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Mon espace candidat</Typography>
      <Typography color="text.secondary">
        Ajoutez votre projet et votre video pour aider les membres a faire un choix eclaire avant le vote.
      </Typography>
      {message ? <Alert severity="success">{message}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {candidaciesQuery.error ? <Alert severity="error">{getErrorMessage(candidaciesQuery.error)}</Alert> : null}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            {candidaciesQuery.isLoading ? <Skeleton height={120} /> : null}
            {candidacies.length === 0 && !candidaciesQuery.isLoading ? (
              <Alert severity="info">Aucune candidature trouvee pour votre compte.</Alert>
            ) : null}

            {candidacies.length > 0 ? (
              <FormControl fullWidth>
                <InputLabel id="candidate-space-selector">Candidature</InputLabel>
                <Select
                  labelId="candidate-space-selector"
                  label="Candidature"
                  value={activeKey}
                  onChange={(event) => {
                    setSelectedCandidateKey(event.target.value);
                    setBio(undefined);
                    setProjectSummary(undefined);
                    setVideoUrl(undefined);
                    setPhotoUrl(undefined);
                    setMessage(null);
                    setError(null);
                  }}
                >
                  {candidacies.map((entry) => {
                    const key = `${entry.electionId}:${entry.candidateId}`;
                    return (
                      <MenuItem key={key} value={key}>
                        {`${entry.electionTitle} - ${entry.displayName} (${entry.status})`}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            ) : null}

            {activeCandidacy ? (
              <>
                <Alert severity={canEdit ? "info" : "warning"}>
                  {canEdit
                    ? `Election ${activeCandidacy.electionStatus}: vous pouvez modifier votre presentation.`
                    : `Election ${activeCandidacy.electionStatus}: edition verrouillee.`}
                </Alert>
                <TextField
                  label="Presentation"
                  value={bioValue}
                  onChange={(event) => setBio(event.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
                  disabled={!canEdit}
                />
                <TextField
                  label="Projet"
                  value={projectSummaryValue}
                  onChange={(event) => setProjectSummary(event.target.value)}
                  fullWidth
                  multiline
                  minRows={5}
                  disabled={!canEdit}
                />
                <TextField
                  label="Video de presentation (URL)"
                  value={videoUrlValue}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="https://..."
                  fullWidth
                  disabled={!canEdit}
                />
                <TextField
                  label="Photo du candidat (URL)"
                  value={photoUrlValue}
                  onChange={(event) => setPhotoUrl(event.target.value)}
                  placeholder="https://..."
                  fullWidth
                  disabled={!canEdit}
                />
                {photoUrlValue ? (
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={photoUrlValue}
                      alt={activeCandidacy.displayName}
                      sx={{ width: 88, height: 88, bgcolor: "primary.light" }}
                    >
                      {activeCandidacy.displayName.slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Button variant="outlined" href={photoUrlValue} target="_blank" rel="noreferrer">
                      Ouvrir la photo
                    </Button>
                  </Stack>
                ) : null}
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                  <Button
                    variant="contained"
                    onClick={() => updatePresentationMutation.mutate()}
                    disabled={!canEdit || updatePresentationMutation.isPending}
                  >
                    Enregistrer ma presentation
                  </Button>
                  {videoUrlValue ? (
                    <Button variant="outlined" href={videoUrlValue} target="_blank" rel="noreferrer">
                      Ouvrir la video
                    </Button>
                  ) : null}
                </Stack>
              </>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export function MemberEligibilityPage() {
  const { user } = useAuth();
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const electionsQuery = useQuery({
    queryKey: queryKeys.memberElections,
    queryFn: fetchMemberVisibleElections,
  });
  const conditionsQuery = useQuery({
    queryKey: queryKeys.conditions,
    queryFn: fetchConditions,
  });
  const openElections = useMemo(
    () => (electionsQuery.data ?? []).filter((election) => election.status === "open"),
    [electionsQuery.data],
  );
  const activeElectionId = selectedElectionId || openElections[0]?.id || "";
  const activeElection = openElections.find((election) => election.id === activeElectionId) ?? null;

  const eligibilityQuery = useQuery({
    queryKey: ["eligibility", user?.uid, activeElectionId || "general"],
    queryFn: async () => {
      if (!user) return null;
      const payload: { memberId: string; electionId?: string } = { memberId: user.uid };
      if (activeElectionId) payload.electionId = activeElectionId;
      return callFunction("computeEligibility", payload) as Promise<{
        eligible: boolean;
        reasons: Array<{ condition: string; met: boolean; detail: string }>;
      }>;
    },
    enabled: Boolean(user),
  });

  const activeConditions = useMemo(
    () => (conditionsQuery.data ?? []).filter((condition) => condition.isActive),
    [conditionsQuery.data],
  );

  const conditionLabel = useMemo(() => {
    const map = new Map<string, string>();
    activeConditions.forEach((condition) => map.set(condition.id, condition.name));
    return map;
  }, [activeConditions]);

  const requiredConditionIds = useMemo(() => {
    if (activeElection) {
      const required = activeElection.voterConditionIds ?? [];
      return required.filter((conditionId) => conditionLabel.has(conditionId));
    }
    return activeConditions.map((condition) => condition.id);
  }, [activeConditions, activeElection, conditionLabel]);

  const activeConditionIds = useMemo(() => activeConditions.map((condition) => condition.id), [activeConditions]);

  const conditionReasons = useMemo(() => {
    const map = new Map<string, { met: boolean; detail: string }>();
    for (const reason of eligibilityQuery.data?.reasons ?? []) {
      if (!reason.condition.startsWith("condition_")) continue;
      const normalized = reason.condition.replace(/^condition_/, "").replace(/_missing$/, "");
      map.set(normalized, { met: reason.met, detail: reason.detail });
    }
    return map;
  }, [eligibilityQuery.data?.reasons]);

  const systemReasons = useMemo(
    () => (eligibilityQuery.data?.reasons ?? []).filter((reason) => !reason.condition.startsWith("condition_")),
    [eligibilityQuery.data?.reasons],
  );

  const systemReasonLabels: Record<string, string> = {
    member_status: "Statut membre",
    contribution: "Cotisation",
    seniority: "Anciennete",
    section: "Section",
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Mon eligibilite</Typography>
      {electionsQuery.error ? <Alert severity="error">{getErrorMessage(electionsQuery.error)}</Alert> : null}
      {conditionsQuery.error ? <Alert severity="error">{getErrorMessage(conditionsQuery.error)}</Alert> : null}
      {openElections.length > 0 ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Elections en cours</Typography>
              <Stack spacing={1}>
                {openElections.map((election) => (
                  <Card
                    key={election.id}
                    variant="outlined"
                    sx={{ borderColor: activeElectionId === election.id ? "primary.main" : undefined }}
                  >
                    <CardContent sx={{ py: 1.4, "&:last-child": { pb: 1.4 } }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
                        <Box>
                          <Typography variant="subtitle2">{election.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {`Cloture: ${election.endAt?.toDate?.()?.toLocaleString("fr-FR") ?? "-"}`}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant={activeElectionId === election.id ? "contained" : "outlined"}
                          onClick={() => setSelectedElectionId(election.id)}
                        >
                          {activeElectionId === election.id ? "Selectionnee" : "Selectionner"}
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info">Aucune election ouverte. Affichage de l'eligibilite generale.</Alert>
      )}
      {eligibilityQuery.isLoading ? <Skeleton height={120} /> : null}
      {eligibilityQuery.error ? <Alert severity="error">{getErrorMessage(eligibilityQuery.error)}</Alert> : null}
      {eligibilityQuery.data ? (
        <Alert severity={eligibilityQuery.data.eligible ? "success" : "warning"}>
          {eligibilityQuery.data.eligible
            ? activeElectionId
              ? "Vous etes eligible pour cette election."
              : "Vous etes eligible."
            : activeElectionId
              ? "Vous n'etes pas encore eligible pour cette election."
              : "Vous n'etes pas encore eligible."}
        </Alert>
      ) : null}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Conditions du catalogue (actives)</Typography>
            {activeConditionIds.length === 0 ? (
              <Alert severity="info">Aucune condition active dans le catalogue.</Alert>
            ) : (
              activeConditionIds.map((conditionId) => {
                const result = conditionReasons.get(conditionId);
                const required = requiredConditionIds.includes(conditionId);
                const met = required ? (result?.met ?? false) : (result?.met ?? false);
                const detail =
                  result?.detail ??
                  (required ? "Condition non validee ou expiree" : "Condition active mais non requise pour cette election");
                const label = conditionLabel.get(conditionId) ?? conditionId;
                return (
                  <Alert key={conditionId} severity={met ? "success" : required ? "warning" : "info"}>
                    {required ? `${label}: ${detail}` : `${label}: ${detail} (optionnelle ici)`}
                  </Alert>
                );
              })
            )}
            {systemReasons.length > 0 ? (
              <>
                <Typography variant="h6">Criteres automatiques</Typography>
                {systemReasons.map((reason) => (
                  <Alert key={reason.condition} severity={reason.met ? "success" : "warning"}>
                    {`${systemReasonLabels[reason.condition] ?? reason.condition}: ${reason.detail}`}
                  </Alert>
                ))}
              </>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export function MemberVotePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pendingVote, setPendingVote] = useState<{ electionId: string; candidate: Candidate } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const electionsQuery = useQuery({
    queryKey: queryKeys.memberElections,
    queryFn: fetchMemberVisibleElections,
  });
  const openElections = useMemo(
    () => (electionsQuery.data ?? []).filter((election) => election.status === "open"),
    [electionsQuery.data],
  );

  const candidatesQueries = useQueries({
    queries: openElections.map((election) => ({
      queryKey: ["candidates", election.id],
      queryFn: () => fetchCandidates(election.id),
      enabled: Boolean(election.id),
    })),
  });

  const eligibilityQueries = useQueries({
    queries: openElections.map((election) => ({
      queryKey: ["eligibility", user?.uid, election.id],
      queryFn: async () =>
        (callFunction("computeEligibility", {
          memberId: user?.uid,
          electionId: election.id,
        }) as Promise<{ eligible: boolean; reasons: Array<{ condition: string; detail: string; met: boolean }> }>),
      enabled: Boolean(user?.uid && election.id),
    })),
  });

  const voteStatusQueries = useQueries({
    queries: openElections.map((election) => ({
      queryKey: ["myVoteStatus", user?.uid, election.id],
      queryFn: async () =>
        (callFunction("getMyVoteStatus", { electionId: election.id }) as Promise<{
          electionId: string;
          hasVoted: boolean;
          candidateId: string;
          candidateDisplayName: string;
          votedAtIso: string | null;
        }>),
      enabled: Boolean(user?.uid && election.id),
    })),
  });

  const candidatesByElectionId = useMemo(() => {
    const map = new Map<string, Candidate[]>();
    openElections.forEach((election, index) => {
      const data = candidatesQueries[index]?.data ?? [];
      map.set(election.id, data.filter((candidate) => candidate.status === "validated"));
    });
    return map;
  }, [openElections, candidatesQueries]);

  const eligibilityByElectionId = useMemo(() => {
    const map = new Map<string, { eligible: boolean; reasons: Array<{ condition: string; detail: string; met: boolean }> }>();
    openElections.forEach((election, index) => {
      const data = eligibilityQueries[index]?.data;
      if (data) map.set(election.id, data);
    });
    return map;
  }, [openElections, eligibilityQueries]);

  const voteStatusByElectionId = useMemo(() => {
    const map = new Map<
      string,
      {
        electionId: string;
        hasVoted: boolean;
        candidateId: string;
        candidateDisplayName: string;
        votedAtIso: string | null;
      }
    >();
    openElections.forEach((election, index) => {
      const data = voteStatusQueries[index]?.data;
      if (data) map.set(election.id, data);
    });
    return map;
  }, [openElections, voteStatusQueries]);

  const electionTitleById = useMemo(() => {
    const map = new Map<string, string>();
    openElections.forEach((election) => map.set(election.id, election.title));
    return map;
  }, [openElections]);

  const pendingElectionId = pendingVote?.electionId ?? "";
  const pendingCandidate = pendingVote?.candidate ?? null;

  const voteMutation = useMutation({
    mutationFn: async () => {
      if (!pendingVote) throw new Error("Selection invalide");
      return callFunction("castVote", {
        electionId: pendingVote.electionId,
        candidateId: pendingVote.candidate.id,
      });
    },
    onSuccess: async () => {
      const votedElectionId = pendingVote?.electionId ?? "";
      const votedElectionTitle = electionTitleById.get(votedElectionId) ?? votedElectionId;
      const votedCandidateName = pendingVote?.candidate.displayName ?? "";
      setError(null);
      setFeedback(
        votedCandidateName
          ? `Vote enregistre pour ${votedCandidateName} (${votedElectionTitle}).`
          : `Vote enregistre (${votedElectionTitle}).`,
      );
      setPendingVote(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.memberElections });
      await queryClient.invalidateQueries({ queryKey: ["myVoteStatus", user?.uid, votedElectionId] });
      await queryClient.invalidateQueries({ queryKey: ["electionScores", votedElectionId] });
    },
    onError: (mutationError) => {
      setFeedback(null);
      setError(getErrorMessage(mutationError));
    },
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Vote</Typography>
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {electionsQuery.error ? <Alert severity="error">{getErrorMessage(electionsQuery.error)}</Alert> : null}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Elections ouvertes et candidats</Typography>
            {openElections.length === 0 ? <Alert severity="info">Aucune election ouverte pour le moment.</Alert> : null}
            <Stack spacing={2}>
              {openElections.map((election, index) => {
                const candidatesQuery = candidatesQueries[index];
                const electionCandidates = candidatesByElectionId.get(election.id) ?? [];
                const eligibility = eligibilityByElectionId.get(election.id);
                const voteStatus = voteStatusByElectionId.get(election.id);
                const hasAlreadyVoted = Boolean(voteStatus?.hasVoted);
                const votedCandidateName =
                  voteStatus?.candidateDisplayName || voteStatus?.candidateId || "candidat inconnu";
                const { scrutinTitle, posteTitle } = splitElectionTitleForDisplay(election.title);

                return (
                  <Card
                    key={election.id}
                    variant="outlined"
                    sx={{
                      borderColor: "rgba(25, 118, 210, 0.45)",
                      borderWidth: 1,
                      borderRadius: 2.5,
                      backgroundColor: "rgba(25, 118, 210, 0.02)",
                    }}
                  >
                    <CardContent>
                      <Stack spacing={1.6}>
                        <Box
                          sx={{
                            position: "relative",
                            overflow: "hidden",
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            background: "linear-gradient(135deg, rgba(25, 118, 210, 0.20) 0%, rgba(25, 118, 210, 0.08) 100%)",
                            px: { xs: 1.5, sm: 2 },
                            py: { xs: 1.3, sm: 1.7 },
                          }}
                        >
                          <Box
                            aria-hidden
                            sx={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: { xs: 10, sm: 12 },
                              bgcolor: "primary.main",
                            }}
                          />
                          <Box
                            aria-hidden
                            sx={{
                              position: "absolute",
                              right: 0,
                              top: 0,
                              bottom: 0,
                              width: { xs: 10, sm: 12 },
                              bgcolor: "primary.main",
                            }}
                          />
                          <Stack spacing={0.55} sx={{ px: { xs: 2, sm: 2.6 }, alignItems: "center" }}>
                            <Typography
                              variant="overline"
                              sx={{ color: "primary.main", fontWeight: 700, lineHeight: 1.15, textAlign: "center" }}
                            >
                              Scrutin
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textAlign: "center" }}>
                              {scrutinTitle}
                            </Typography>
                            <Typography
                              variant="overline"
                              sx={{ color: "primary.main", fontWeight: 700, lineHeight: 1.15, mt: 0.4, textAlign: "center" }}
                            >
                              Poste a pourvoir
                            </Typography>
                            <Typography variant="h6" sx={{ lineHeight: 1.28, textAlign: "center" }}>
                              {posteTitle}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, textAlign: "center" }}>
                              {`Cloture le ${election.endAt?.toDate?.()?.toLocaleString("fr-FR") ?? "-"}`}
                            </Typography>
                          </Stack>
                        </Box>

                        {voteStatus?.hasVoted ? (
                          <Alert severity="success">
                            {`Vote deja enregistre pour ${votedCandidateName}${
                              voteStatus.votedAtIso ? ` le ${new Date(voteStatus.votedAtIso).toLocaleString("fr-FR")}` : ""
                            }.`}
                          </Alert>
                        ) : null}
                        {eligibility && !eligibility.eligible ? (
                          <Alert severity="warning">Vous n'etes pas eligible pour cette election.</Alert>
                        ) : null}
                        {candidatesQuery.error ? <Alert severity="error">{getErrorMessage(candidatesQuery.error)}</Alert> : null}
                        {candidatesQuery.isLoading ? <Skeleton height={120} /> : null}
                        {!candidatesQuery.isLoading && electionCandidates.length === 0 ? (
                          <Alert severity="info">Aucun candidat valide disponible pour cette election.</Alert>
                        ) : null}

                        <Stack spacing={1.2}>
                          {electionCandidates.map((candidate) => {
                            const effectivePhotoUrl = resolveCandidatePhotoUrl(candidate.displayName, candidate.photoUrl);
                            return (
                              <Card key={candidate.id} variant="outlined">
                                <CardContent>
                                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
                                    <Box
                                      sx={{
                                        width: { xs: "100%", md: 220 },
                                        minWidth: { md: 220 },
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "flex-start",
                                      }}
                                    >
                                      {effectivePhotoUrl ? (
                                        <Box
                                          component="img"
                                          src={effectivePhotoUrl}
                                          alt={candidate.displayName}
                                          loading="lazy"
                                          sx={{
                                            width: { xs: "100%", sm: 260, md: 220 },
                                            maxWidth: "100%",
                                            aspectRatio: "1 / 1",
                                            objectFit: "cover",
                                            borderRadius: 2,
                                            border: "1px solid",
                                            borderColor: "divider",
                                          }}
                                        />
                                      ) : (
                                        <Avatar
                                          alt={candidate.displayName}
                                          variant="rounded"
                                          sx={{
                                            width: { xs: 96, md: 116 },
                                            height: { xs: 96, md: 116 },
                                            bgcolor: "primary.light",
                                          }}
                                        >
                                          {candidate.displayName.slice(0, 1).toUpperCase()}
                                        </Avatar>
                                      )}
                                    </Box>
                                    <Stack spacing={1.1} sx={{ maxWidth: 760 }}>
                                      <Box>
                                        <Typography variant="subtitle1">{candidate.displayName}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          {candidate.sectionName || "-"}
                                        </Typography>
                                      </Box>
                                      <Box>
                                        <Typography variant="subtitle2">Presentation</Typography>
                                        <Typography variant="body2">{candidate.bio || "Aucune presentation."}</Typography>
                                      </Box>
                                      <Box>
                                        <Typography variant="subtitle2">Projet</Typography>
                                        <Typography variant="body2">
                                          {candidate.projectSummary || "Aucun projet detaille pour le moment."}
                                        </Typography>
                                      </Box>
                                      {candidate.videoUrl ? (
                                        <Button variant="text" href={candidate.videoUrl} target="_blank" rel="noreferrer">
                                          Voir la video de presentation
                                        </Button>
                                      ) : null}
                                    </Stack>
                                    <Box sx={{ alignSelf: { xs: "stretch", md: "center" }, width: { xs: "100%", md: "auto" } }}>
                                      <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                                        {hasAlreadyVoted && voteStatus?.candidateId === candidate.id ? (
                                          <Chip label="Votre vote" color="success" />
                                        ) : null}
                                        <Button
                                          variant="contained"
                                          onClick={() => {
                                            if (hasAlreadyVoted) return;
                                            setPendingVote({ electionId: election.id, candidate });
                                          }}
                                          disabled={!eligibility?.eligible || hasAlreadyVoted}
                                          sx={{ width: { xs: "100%", sm: "auto" } }}
                                        >
                                          {hasAlreadyVoted ? "Vote deja enregistre" : "Voter pour ce candidat"}
                                        </Button>
                                      </Stack>
                                    </Box>
                                  </Stack>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(pendingVote)}
        onClose={() => setPendingVote(null)}
      >
        <DialogTitle>Confirmer le vote</DialogTitle>
        <DialogContent>
          <Typography>
            {`Poste: ${electionTitleById.get(pendingElectionId) ?? pendingElectionId}`}
          </Typography>
          <Typography mt={1}>
            {`Vous allez voter pour ${pendingCandidate?.displayName}. Cette action est definitive.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingVote(null)}>Annuler</Button>
          <Button variant="contained" onClick={() => voteMutation.mutate()} disabled={voteMutation.isPending}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export function MemberResultsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const electionsQuery = useQuery({
    queryKey: queryKeys.memberElections,
    queryFn: fetchMemberVisibleElections,
  });
  const publishedElections = useMemo(
    () => (electionsQuery.data ?? []).filter((election) => election.status === "published"),
    [electionsQuery.data],
  );
  const activeElectionId = selectedElectionId || publishedElections[0]?.id || "";
  const resultsQuery = useQuery({
    queryKey: ["results", activeElectionId],
    queryFn: async () => {
      if (!activeElectionId) return null;
      return callFunction("getResults", { electionId: activeElectionId }) as Promise<{
        election: {
          title: string;
          participationRate: number;
          totalVotesCast: number;
        };
        results: Array<{
          rank: number;
          displayName: string;
          voteCount: number;
          percentage: number;
        }>;
      }>;
    },
    enabled: Boolean(activeElectionId),
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Resultats</Typography>
      {electionsQuery.error ? <Alert severity="error">{getErrorMessage(electionsQuery.error)}</Alert> : null}
      {publishedElections.length === 0 ? (
        <Alert severity="info">Aucun resultat publie.</Alert>
      ) : (
        <Card>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="h6">Elections publiees</Typography>
              {publishedElections.map((election) => (
                <Card
                  key={election.id}
                  variant="outlined"
                  sx={{ borderColor: activeElectionId === election.id ? "primary.main" : undefined }}
                >
                  <CardContent sx={{ py: 1.4, "&:last-child": { pb: 1.4 } }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
                      <Box>
                        <Typography variant="subtitle2">{election.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {`Periode: ${election.startAt?.toDate?.()?.toLocaleString("fr-FR") ?? "-"} -> ${
                            election.endAt?.toDate?.()?.toLocaleString("fr-FR") ?? "-"
                          }`}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant={activeElectionId === election.id ? "contained" : "outlined"}
                        onClick={() => setSelectedElectionId(election.id)}
                      >
                        {activeElectionId === election.id ? "Selectionnee" : "Voir"}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {resultsQuery.isLoading ? <Skeleton height={120} /> : null}
      {resultsQuery.data ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Alert severity="info">
                {`Participation: ${resultsQuery.data.election.participationRate.toFixed(2)}% (${resultsQuery.data.election.totalVotesCast} votes)`}
              </Alert>
              {isMobile ? (
                <Stack spacing={1.2}>
                  {resultsQuery.data.results.map((row) => (
                    <Card key={`${row.rank}-${row.displayName}`} variant="outlined">
                      <CardContent sx={{ py: 1.5 }}>
                        <Stack spacing={0.6}>
                          <Typography variant="subtitle2">{`#${row.rank} - ${row.displayName}`}</Typography>
                          <Typography variant="body2">{`Votes: ${row.voteCount}`}</Typography>
                          <Typography variant="body2">{`Pourcentage: ${row.percentage.toFixed(2)}%`}</Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <ResponsiveTable minWidth={520}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Rang</TableCell>
                        <TableCell>Candidat</TableCell>
                        <TableCell>Votes</TableCell>
                        <TableCell>%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resultsQuery.data.results.map((row) => (
                        <TableRow key={`${row.rank}-${row.displayName}`}>
                          <TableCell>{row.rank}</TableCell>
                          <TableCell>{row.displayName}</TableCell>
                          <TableCell>{row.voteCount}</TableCell>
                          <TableCell>{row.percentage.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveTable>
              )}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
      {resultsQuery.error ? <Alert severity="error">{getErrorMessage(resultsQuery.error)}</Alert> : null}
    </Stack>
  );
}

export function AdminDashboardPage() {
  const { role } = useAuth();
  const sectionsQuery = useQuery({
    queryKey: queryKeys.sections,
    queryFn: fetchSections,
  });
  const membersQuery = useQuery({
    queryKey: [...queryKeys.members, role],
    queryFn: () => fetchMembers({ includeSuperAdmins: role === "superadmin" }),
  });
  const visibleMembersCount = useMemo(() => {
    const members = membersQuery.data ?? [];
    if (role === "superadmin") return members.length;
    return members.filter((member) => member.role !== "superadmin").length;
  }, [membersQuery.data, role]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Dashboard admin</Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Sections
            </Typography>
            <Typography variant="h4">{sectionsQuery.isLoading ? "..." : (sectionsQuery.data?.length ?? 0)}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Membres
            </Typography>
            <Typography variant="h4">{membersQuery.isLoading ? "..." : visibleMembersCount}</Typography>
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}

export function AdminSectionsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Section | null>(null);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editRegion, setEditRegion] = useState("");

  const sectionsQuery = useQuery({
    queryKey: queryKeys.sections,
    queryFn: fetchSections,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      callFunction("createSection", {
        name,
        city,
        region,
      }),
    onSuccess: async () => {
      setName("");
      setCity("");
      setRegion("");
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sections });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error("Section introuvable.");
      return callFunction("updateSection", {
        sectionId: editing.id,
        updates: {
          name: editName,
          city: editCity,
          region: editRegion,
        },
      });
    },
    onSuccess: async () => {
      setEditing(null);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sections });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const deleteMutation = useMutation({
    mutationFn: (sectionId: string) =>
      callFunction("deleteSection", {
        sectionId,
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sections });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Sections</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Creer une section</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="Nom" value={name} onChange={(event) => setName(event.target.value)} fullWidth />
              <TextField label="Ville" value={city} onChange={(event) => setCity(event.target.value)} fullWidth />
              <TextField label="Region" value={region} onChange={(event) => setRegion(event.target.value)} fullWidth />
            </Stack>
            <Box>
              <Button
                variant="contained"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !name || !city}
              >
                Creer la section
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Liste des sections
          </Typography>
          {sectionsQuery.isLoading ? <Skeleton height={120} /> : null}
          {!sectionsQuery.isLoading && (sectionsQuery.data?.length ?? 0) === 0 ? (
            <Alert severity="info">Aucune section disponible.</Alert>
          ) : null}
          {sectionsQuery.data && sectionsQuery.data.length > 0 ? (
            isMobile ? (
              <Stack spacing={1.3}>
                {sectionsQuery.data.map((section) => (
                  <Card key={section.id} variant="outlined">
                    <CardContent>
                      <Stack spacing={0.8}>
                        <Typography variant="subtitle2">{section.name}</Typography>
                        <Typography variant="body2">{`Ville: ${section.city}`}</Typography>
                        <Typography variant="body2">{`Region: ${section.region || "-"}`}</Typography>
                        <Typography variant="body2">{`Membres: ${section.memberCount ?? 0}`}</Typography>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setEditing(section);
                              setEditName(section.name);
                              setEditCity(section.city);
                              setEditRegion(section.region ?? "");
                            }}
                          >
                            Modifier
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => deleteMutation.mutate(section.id)}
                            disabled={role !== "superadmin" || deleteMutation.isPending}
                          >
                            Supprimer
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <ResponsiveTable minWidth={720}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom</TableCell>
                      <TableCell>Ville</TableCell>
                      <TableCell>Region</TableCell>
                      <TableCell>Membres</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sectionsQuery.data.map((section) => (
                      <TableRow key={section.id}>
                        <TableCell>{section.name}</TableCell>
                        <TableCell>{section.city}</TableCell>
                        <TableCell>{section.region || "-"}</TableCell>
                        <TableCell>{section.memberCount ?? 0}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setEditing(section);
                                setEditName(section.name);
                                setEditCity(section.city);
                                setEditRegion(section.region ?? "");
                              }}
                            >
                              Modifier
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => deleteMutation.mutate(section.id)}
                              disabled={role !== "superadmin" || deleteMutation.isPending}
                            >
                              Supprimer
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ResponsiveTable>
            )
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Modifier la section</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Nom" value={editName} onChange={(event) => setEditName(event.target.value)} />
            <TextField label="Ville" value={editCity} onChange={(event) => setEditCity(event.target.value)} />
            <TextField label="Region" value={editRegion} onChange={(event) => setEditRegion(event.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !editName || !editCity}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export function AdminMembersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const membersQuery = useQuery({
    queryKey: [...queryKeys.members, role],
    queryFn: () => fetchMembers({ includeSuperAdmins: role === "superadmin" }),
  });
  const sectionsQuery = useQuery({ queryKey: queryKeys.sections, queryFn: fetchSections });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Member["status"]>("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      callFunction("createMember", {
        email,
        firstName,
        lastName,
        city,
        phone,
        password,
        sectionId,
      }),
    onSuccess: async () => {
      setError(null);
      setEmail("");
      setFirstName("");
      setLastName("");
      setCity("");
      setPhone("");
      setPassword("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.members });
      await queryClient.invalidateQueries({ queryKey: queryKeys.sections });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingMember) throw new Error("Membre introuvable.");
      return callFunction("updateMember", {
        memberId: editingMember.id,
        updates: {
          firstName: editingMember.firstName,
          lastName: editingMember.lastName,
          city: editingMember.city ?? "",
          phone: editingMember.phone ?? "",
          sectionId: editingMember.sectionId ?? "",
          status: editingMember.status,
        },
      });
    },
    onSuccess: async () => {
      setError(null);
      setEditingMember(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.members });
      await queryClient.invalidateQueries({ queryKey: queryKeys.sections });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const reviewRegistrationMutation = useMutation({
    mutationFn: ({ memberId, status }: { memberId: string; status: Member["status"] }) =>
      callFunction("updateMember", {
        memberId,
        updates: { status },
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const sectionLabel = useMemo(() => {
    const map = new Map<string, string>();
    sectionsQuery.data?.forEach((section) => map.set(section.id, section.name));
    return map;
  }, [sectionsQuery.data]);

  const membersForAdminView = useMemo(
    () => (membersQuery.data ?? []).filter((member) => member.role !== "superadmin"),
    [membersQuery.data],
  );

  const filteredMembers = useMemo(() => {
    const list = membersForAdminView;
    return list.filter((member) => {
      const text = `${member.firstName} ${member.lastName} ${member.email}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" ? true : member.status === statusFilter;
      const matchesSection = sectionFilter === "all" ? true : member.sectionId === sectionFilter;
      return matchesSearch && matchesStatus && matchesSection;
    });
  }, [membersForAdminView, search, statusFilter, sectionFilter]);

  const pendingMembers = useMemo(
    () => membersForAdminView.filter((member) => member.role === "member" && member.status === "pending"),
    [membersForAdminView],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Membres</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Creer un membre</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="Email" value={email} onChange={(event) => setEmail(event.target.value)} fullWidth />
              <TextField
                label="Prenom"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                fullWidth
              />
              <TextField label="Nom" value={lastName} onChange={(event) => setLastName(event.target.value)} fullWidth />
              <TextField label="Ville" value={city} onChange={(event) => setCity(event.target.value)} fullWidth />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="Telephone" value={phone} onChange={(event) => setPhone(event.target.value)} fullWidth />
              <TextField
                label="Mot de passe initial"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                helperText="Minimum 8 caracteres"
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel id="member-section">Section</InputLabel>
                <Select
                  labelId="member-section"
                  label="Section"
                  value={sectionId}
                  onChange={(event) => setSectionId(event.target.value)}
                >
                  {sectionsQuery.data?.map((section) => (
                    <MenuItem value={section.id} key={section.id}>
                      {section.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Alert severity="info">
              Les comptes crees par admin sont actives automatiquement et consideres eligibles au vote.
            </Alert>
            <Box>
              <Button
                variant="contained"
                onClick={() => createMutation.mutate()}
                disabled={
                  !email ||
                  !firstName ||
                  !lastName ||
                  !city ||
                  !sectionId ||
                  !password ||
                  password.length < 8 ||
                  createMutation.isPending
                }
              >
                Ajouter un membre
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Recherche et filtres</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Rechercher (nom, email)"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                fullWidth
              />
              <FormControl sx={{ minWidth: 180 }}>
                <InputLabel id="status-filter">Statut</InputLabel>
                <Select
                  labelId="status-filter"
                  label="Statut"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "all" | Member["status"])}
                >
                  <MenuItem value="all">Tous</MenuItem>
                  <MenuItem value="pending">pending</MenuItem>
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="suspended">suspended</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 220 }}>
                <InputLabel id="section-filter">Section</InputLabel>
                <Select
                  labelId="section-filter"
                  label="Section"
                  value={sectionFilter}
                  onChange={(event) => setSectionFilter(event.target.value)}
                >
                  <MenuItem value="all">Toutes</MenuItem>
                  {sectionsQuery.data?.map((section) => (
                    <MenuItem key={section.id} value={section.id}>
                      {section.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Inscriptions en attente
          </Typography>
          {pendingMembers.length === 0 ? (
            <Alert severity="info">Aucune inscription en attente.</Alert>
          ) : isMobile ? (
            <Stack spacing={1.5}>
              {pendingMembers.map((member) => (
                <Card key={member.id} variant="outlined">
                  <CardContent>
                    <Stack spacing={0.9}>
                      <Typography variant="subtitle2">{`${member.firstName} ${member.lastName}`}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {member.email}
                      </Typography>
                      <Typography variant="body2">{`Ville: ${member.city || "-"}`}</Typography>
                      <Typography variant="body2">{`Section: ${sectionLabel.get(member.sectionId ?? "") ?? "-"}`}</Typography>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => reviewRegistrationMutation.mutate({ memberId: member.id, status: "active" })}
                          disabled={reviewRegistrationMutation.isPending}
                        >
                          Accepter
                        </Button>
                        <Button
                          size="small"
                          color="warning"
                          variant="outlined"
                          onClick={() => reviewRegistrationMutation.mutate({ memberId: member.id, status: "suspended" })}
                          disabled={reviewRegistrationMutation.isPending}
                        >
                          Refuser
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <ResponsiveTable minWidth={780}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Prenom</TableCell>
                    <TableCell>Nom</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Ville</TableCell>
                    <TableCell>Section</TableCell>
                    <TableCell align="right">Decision</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.firstName}</TableCell>
                      <TableCell>{member.lastName}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.city || "-"}</TableCell>
                      <TableCell>{sectionLabel.get(member.sectionId ?? "") ?? "-"}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => reviewRegistrationMutation.mutate({ memberId: member.id, status: "active" })}
                            disabled={reviewRegistrationMutation.isPending}
                          >
                            Accepter
                          </Button>
                          <Button
                            size="small"
                            color="warning"
                            variant="outlined"
                            onClick={() => reviewRegistrationMutation.mutate({ memberId: member.id, status: "suspended" })}
                            disabled={reviewRegistrationMutation.isPending}
                          >
                            Refuser
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Liste des membres
          </Typography>
          {membersQuery.isLoading ? <Skeleton height={120} /> : null}
          {!membersQuery.isLoading && filteredMembers.length === 0 ? (
            <Alert severity="info">Aucun membre trouve.</Alert>
          ) : null}
          {filteredMembers.length > 0 && isMobile ? (
            <Stack spacing={1.5}>
              {filteredMembers.map((member) => (
                <Card key={member.id} variant="outlined">
                  <CardContent>
                    <Stack spacing={0.9}>
                      <Typography variant="subtitle2">{`${member.firstName} ${member.lastName}`}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {member.email}
                      </Typography>
                      <Typography variant="body2">{`Ville: ${member.city || "-"}`}</Typography>
                      <Typography variant="body2">{`Section: ${sectionLabel.get(member.sectionId ?? "") ?? "-"}`}</Typography>
                      <Typography variant="body2">{`Cotisation: ${member.contributionUpToDate ? "A jour" : "En retard"}`}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={member.role === "superadmin" ? "secondary" : member.role === "admin" ? "info" : "default"}
                          label={member.role}
                        />
                        <Chip size="small" color={memberStatusChipColor(member.status)} label={member.status} />
                      </Stack>
                      <Box display="flex" justifyContent="flex-end">
                        <Button size="small" variant="outlined" onClick={() => setEditingMember({ ...member })}>
                          Editer
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : null}
          {filteredMembers.length > 0 && !isMobile ? (
            <ResponsiveTable minWidth={1020}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Prenom</TableCell>
                    <TableCell>Nom</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Ville</TableCell>
                    <TableCell>Section</TableCell>
                    <TableCell>Cotisation</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.firstName}</TableCell>
                      <TableCell>{member.lastName}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.city || "-"}</TableCell>
                      <TableCell>{sectionLabel.get(member.sectionId ?? "") ?? "-"}</TableCell>
                      <TableCell>{member.contributionUpToDate ? "A jour" : "En retard"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={member.role === "superadmin" ? "secondary" : member.role === "admin" ? "info" : "default"}
                          label={member.role}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={memberStatusChipColor(member.status)} label={member.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="outlined" onClick={() => setEditingMember({ ...member })}>
                          Editer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTable>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingMember)} onClose={() => setEditingMember(null)} fullWidth maxWidth="sm">
        <DialogTitle>Modifier le membre</DialogTitle>
        <DialogContent>
          {editingMember ? (
            <Stack spacing={2} mt={1}>
              <TextField
                label="Prenom"
                value={editingMember.firstName}
                onChange={(event) => setEditingMember({ ...editingMember, firstName: event.target.value })}
              />
              <TextField
                label="Nom"
                value={editingMember.lastName}
                onChange={(event) => setEditingMember({ ...editingMember, lastName: event.target.value })}
              />
              <TextField
                label="Telephone"
                value={editingMember.phone ?? ""}
                onChange={(event) => setEditingMember({ ...editingMember, phone: event.target.value })}
              />
              <TextField
                label="Ville"
                value={editingMember.city ?? ""}
                onChange={(event) => setEditingMember({ ...editingMember, city: event.target.value })}
              />
              <FormControl fullWidth>
                <InputLabel id="edit-section">Section</InputLabel>
                <Select
                  labelId="edit-section"
                  label="Section"
                  value={editingMember.sectionId ?? ""}
                  onChange={(event) =>
                    setEditingMember({
                      ...editingMember,
                      sectionId: event.target.value,
                    })
                  }
                >
                  {sectionsQuery.data?.map((section) => (
                    <MenuItem key={section.id} value={section.id}>
                      {section.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="edit-status">Statut</InputLabel>
                <Select
                  labelId="edit-status"
                  label="Statut"
                  value={editingMember.status}
                  onChange={(event) =>
                    setEditingMember({
                      ...editingMember,
                      status: event.target.value as Member["status"],
                    })
                  }
                >
                  <MenuItem value="pending">pending</MenuItem>
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="suspended">suspended</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingMember(null)}>Annuler</Button>
          <Button variant="contained" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export function AdminConditionsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { role } = useAuth();
  const canManageConditionCatalog = role === "admin" || role === "superadmin";
  const queryClient = useQueryClient();
  const conditionsQuery = useQuery({
    queryKey: queryKeys.conditions,
    queryFn: fetchConditions,
  });
  const membersQuery = useQuery({
    queryKey: [...queryKeys.members, role],
    queryFn: () => fetchMembers({ includeSuperAdmins: role === "superadmin" }),
  });
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Condition["type"]>("checkbox");
  const [validityDuration, setValidityDuration] = useState("0");
  const [selectedMember, setSelectedMember] = useState("");
  const [note, setNote] = useState("");

  const memberConditionsQuery = useQuery({
    queryKey: ["memberConditions", selectedMember],
    queryFn: () => fetchMemberConditions(selectedMember),
    enabled: Boolean(selectedMember),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      callFunction("createCondition", {
        name,
        description,
        type,
        validityDuration: Number(validityDuration),
      }),
    onSuccess: async () => {
      setError(null);
      setName("");
      setDescription("");
      setType("checkbox");
      setValidityDuration("0");
      await queryClient.invalidateQueries({ queryKey: queryKeys.conditions });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ conditionId, updates }: { conditionId: string; updates: Record<string, unknown> }) =>
      callFunction("updateCondition", {
        conditionId,
        updates,
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.conditions });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const deleteMutation = useMutation({
    mutationFn: (conditionId: string) =>
      callFunction("deleteCondition", {
        conditionId,
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.conditions });
      await queryClient.invalidateQueries({ queryKey: queryKeys.elections });
      await queryClient.invalidateQueries({ queryKey: queryKeys.memberElections });
      await queryClient.invalidateQueries({ queryKey: ["memberConditions"] });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const validateMutation = useMutation({
    mutationFn: ({ conditionId, validated }: { conditionId: string; validated: boolean }) =>
      callFunction("validateCondition", {
        memberId: selectedMember,
        conditionId,
        validated,
        note,
      }),
    onSuccess: async () => {
      setError(null);
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["memberConditions", selectedMember] });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const selectableMembers = useMemo(
    () =>
      (membersQuery.data ?? []).filter((member) => {
        if (role === "superadmin") return true;
        return member.role !== "superadmin";
      }),
    [membersQuery.data, role],
  );
  const activeConditions = useMemo(
    () => (conditionsQuery.data ?? []).filter((condition) => condition.isActive),
    [conditionsQuery.data],
  );
  const memberConditionByConditionId = useMemo(() => {
    const map = new Map<string, MemberCondition>();
    (memberConditionsQuery.data ?? []).forEach((item) => map.set(item.conditionId, item));
    return map;
  }, [memberConditionsQuery.data]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Conditions d'eligibilite</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Catalogue conditions</Typography>
            {canManageConditionCatalog ? (
              <>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField label="Nom" value={name} onChange={(event) => setName(event.target.value)} fullWidth />
                  <TextField
                    label="Description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    fullWidth
                  />
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel id="condition-type">Type</InputLabel>
                    <Select
                      labelId="condition-type"
                      label="Type"
                      value={type}
                      onChange={(event) => setType(event.target.value as Condition["type"])}
                    >
                      <MenuItem value="checkbox">checkbox</MenuItem>
                      <MenuItem value="date">date</MenuItem>
                      <MenuItem value="amount">amount</MenuItem>
                      <MenuItem value="file">file</MenuItem>
                      <MenuItem value="text">text</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Duree validite (jours, 0=illimite)"
                    type="number"
                    value={validityDuration}
                    onChange={(event) => setValidityDuration(event.target.value)}
                    fullWidth
                  />
                </Stack>
                <Box>
                  <Button
                    variant="contained"
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !name || !description}
                  >
                    Creer la condition
                  </Button>
                </Box>
              </>
            ) : (
              <Alert severity="info">Seul un admin ou superadmin peut creer/modifier le catalogue.</Alert>
            )}

            {conditionsQuery.isLoading ? <Skeleton height={120} /> : null}
            {(conditionsQuery.data?.length ?? 0) > 0 ? (
              isMobile ? (
                <Stack spacing={1.2}>
                  {conditionsQuery.data?.map((condition) => (
                    <Card key={condition.id} variant="outlined">
                      <CardContent>
                        <Stack spacing={0.7}>
                          <Typography variant="subtitle2">{condition.name}</Typography>
                          <Typography variant="body2">{`Type: ${condition.type}`}</Typography>
                          <Typography variant="body2">{`Validite: ${condition.validityDuration ?? "illimite"}`}</Typography>
                          <Typography variant="body2">{`Active: ${condition.isActive ? "oui" : "non"}`}</Typography>
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={!canManageConditionCatalog || updateMutation.isPending}
                              onClick={() =>
                                updateMutation.mutate({
                                  conditionId: condition.id,
                                  updates: { isActive: !condition.isActive },
                                })
                              }
                            >
                              {condition.isActive ? "Desactiver" : "Activer"}
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              disabled={!canManageConditionCatalog || deleteMutation.isPending}
                              onClick={() => {
                                if (!window.confirm("Supprimer cette condition partout ? Cette action est irreversible.")) {
                                  return;
                                }
                                deleteMutation.mutate(condition.id);
                              }}
                            >
                              Supprimer
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <ResponsiveTable minWidth={820}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nom</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Validite</TableCell>
                        <TableCell>Active</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {conditionsQuery.data?.map((condition) => (
                        <TableRow key={condition.id}>
                          <TableCell>{condition.name}</TableCell>
                          <TableCell>{condition.type}</TableCell>
                          <TableCell>{condition.validityDuration ?? "illimite"}</TableCell>
                          <TableCell>{condition.isActive ? "oui" : "non"}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={!canManageConditionCatalog || updateMutation.isPending}
                                onClick={() =>
                                  updateMutation.mutate({
                                    conditionId: condition.id,
                                    updates: { isActive: !condition.isActive },
                                  })
                                }
                              >
                                {condition.isActive ? "Desactiver" : "Activer"}
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                disabled={!canManageConditionCatalog || deleteMutation.isPending}
                                onClick={() => {
                                  if (!window.confirm("Supprimer cette condition partout ? Cette action est irreversible.")) {
                                    return;
                                  }
                                  deleteMutation.mutate(condition.id);
                                }}
                              >
                                Supprimer
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveTable>
              )
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Validation des conditions membre</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="cond-member">Membre</InputLabel>
                <Select
                  labelId="cond-member"
                  label="Membre"
                  value={selectedMember}
                  onChange={(event) => setSelectedMember(event.target.value)}
                >
                  {selectableMembers.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {`${member.firstName} ${member.lastName} - ${member.email}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Note (optionnelle)"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                fullWidth
              />
            </Stack>
            {!selectedMember ? (
              <Alert severity="info">Selectionnez un membre pour afficher la checklist des conditions actives.</Alert>
            ) : activeConditions.length === 0 ? (
              <Alert severity="info">Aucune condition active dans le catalogue.</Alert>
            ) : isMobile ? (
              <Stack spacing={1.2}>
                {activeConditions.map((condition) => {
                  const item = memberConditionByConditionId.get(condition.id);
                  const isValid = Boolean(item?.validated);
                  return (
                    <Card key={condition.id} variant="outlined">
                      <CardContent>
                        <Stack spacing={0.7}>
                          <Typography variant="subtitle2">{condition.name}</Typography>
                          <Typography variant="body2">{`Type: ${condition.type}`}</Typography>
                          <Typography variant="body2">{`Etat: ${isValid ? "Validee" : "Non validee"}`}</Typography>
                          <Typography variant="body2">
                            {`Expire le: ${item?.expiresAt ? item.expiresAt.toDate().toLocaleDateString("fr-FR") : "-"}`}
                          </Typography>
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => validateMutation.mutate({ conditionId: condition.id, validated: true })}
                              disabled={validateMutation.isPending}
                            >
                              Valider
                            </Button>
                            <Button
                              size="small"
                              color="warning"
                              variant="outlined"
                              onClick={() => validateMutation.mutate({ conditionId: condition.id, validated: false })}
                              disabled={validateMutation.isPending}
                            >
                              Invalider
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            ) : (
              <ResponsiveTable minWidth={860}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Condition</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Etat</TableCell>
                      <TableCell>Expire le</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeConditions.map((condition) => {
                      const item = memberConditionByConditionId.get(condition.id);
                      const isValid = Boolean(item?.validated);
                      return (
                        <TableRow key={condition.id}>
                          <TableCell>{condition.name}</TableCell>
                          <TableCell>{condition.type}</TableCell>
                          <TableCell>{isValid ? "Validee" : "Non validee"}</TableCell>
                          <TableCell>
                            {item?.expiresAt ? item.expiresAt.toDate().toLocaleDateString("fr-FR") : "-"}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => validateMutation.mutate({ conditionId: condition.id, validated: true })}
                                disabled={validateMutation.isPending}
                              >
                                Valider
                              </Button>
                              <Button
                                size="small"
                                color="warning"
                                variant="outlined"
                                onClick={() => validateMutation.mutate({ conditionId: condition.id, validated: false })}
                                disabled={validateMutation.isPending}
                              >
                                Invalider
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ResponsiveTable>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export function AdminContributionsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const membersQuery = useQuery({
    queryKey: [...queryKeys.members, role],
    queryFn: () => fetchMembers({ includeSuperAdmins: role === "superadmin" }),
  });
  const policyQuery = useQuery({
    queryKey: queryKeys.policy,
    queryFn: fetchActiveContributionPolicy,
  });
  const paymentsQuery = useQuery({
    queryKey: queryKeys.payments,
    queryFn: () => fetchPayments(),
  });
  const [error, setError] = useState<string | null>(null);

  const [policyName, setPolicyName] = useState("Politique cotisation");
  const [policyAmount, setPolicyAmount] = useState("10");
  const [policyCurrency, setPolicyCurrency] = useState("EUR");
  const [policyPeriodicity, setPolicyPeriodicity] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [policyGraceDays, setPolicyGraceDays] = useState("7");

  const [memberId, setMemberId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("10");
  const [paymentCurrency, setPaymentCurrency] = useState("EUR");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const setPolicyMutation = useMutation({
    mutationFn: () =>
      callFunction("setContributionPolicy", {
        name: policyName,
        amount: Number(policyAmount),
        currency: policyCurrency,
        periodicity: policyPeriodicity,
        gracePeriodDays: Number(policyGraceDays),
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.policy });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: () =>
      callFunction("recordPayment", {
        memberId,
        amount: Number(paymentAmount),
        currency: paymentCurrency,
        periodStart: new Date(`${periodStart}T00:00:00.000Z`).toISOString(),
        periodEnd: new Date(`${periodEnd}T23:59:59.999Z`).toISOString(),
        reference,
        note,
      }),
    onSuccess: async () => {
      setError(null);
      setReference("");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.payments });
      await queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const memberLabel = useMemo(() => {
    const map = new Map<string, string>();
    membersQuery.data?.forEach((member) => {
      map.set(member.id, `${member.firstName} ${member.lastName}`.trim());
    });
    return map;
  }, [membersQuery.data]);
  const selectableMembers = useMemo(
    () =>
      (membersQuery.data ?? []).filter((member) => {
        if (role === "superadmin") return true;
        return member.role !== "superadmin";
      }),
    [membersQuery.data, role],
  );

  const canSavePolicy =
    role === "superadmin" && policyName.length > 0 && Number(policyAmount) > 0 && Number(policyGraceDays) >= 0;
  const canRecordPayment =
    memberId.length > 0 && periodStart.length > 0 && periodEnd.length > 0 && Number(paymentAmount) > 0;

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Cotisations</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Politique active</Typography>
            {policyQuery.data ? (
              <Alert severity="info">
                {`${policyQuery.data.name}: ${policyQuery.data.amount} ${policyQuery.data.currency} (${policyQuery.data.periodicity}, grace ${policyQuery.data.gracePeriodDays} jours)`}
              </Alert>
            ) : (
              <Alert severity="warning">Aucune politique active.</Alert>
            )}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Nom politique"
                value={policyName}
                onChange={(event) => setPolicyName(event.target.value)}
                fullWidth
              />
              <TextField
                label="Montant"
                type="number"
                value={policyAmount}
                onChange={(event) => setPolicyAmount(event.target.value)}
                fullWidth
              />
              <TextField
                label="Devise"
                value={policyCurrency}
                onChange={(event) => setPolicyCurrency(event.target.value.toUpperCase())}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="policy-periodicity">Periodicite</InputLabel>
                <Select
                  labelId="policy-periodicity"
                  label="Periodicite"
                  value={policyPeriodicity}
                  onChange={(event) => setPolicyPeriodicity(event.target.value as "monthly" | "quarterly" | "yearly")}
                >
                  <MenuItem value="monthly">Mensuelle</MenuItem>
                  <MenuItem value="quarterly">Trimestrielle</MenuItem>
                  <MenuItem value="yearly">Annuelle</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Tolerance (jours)"
                type="number"
                value={policyGraceDays}
                onChange={(event) => setPolicyGraceDays(event.target.value)}
                fullWidth
              />
            </Stack>
            <Box>
              <Button
                variant="contained"
                onClick={() => setPolicyMutation.mutate()}
                disabled={!canSavePolicy || setPolicyMutation.isPending}
              >
                Enregistrer la politique
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Enregistrer un paiement</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="payment-member">Membre</InputLabel>
                <Select
                  labelId="payment-member"
                  label="Membre"
                  value={memberId}
                  onChange={(event) => setMemberId(event.target.value)}
                >
                  {selectableMembers.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {`${member.firstName} ${member.lastName} - ${member.email}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Montant"
                type="number"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                fullWidth
              />
              <TextField
                label="Devise"
                value={paymentCurrency}
                onChange={(event) => setPaymentCurrency(event.target.value.toUpperCase())}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Debut periode"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                fullWidth
              />
              <TextField
                label="Fin periode"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                fullWidth
              />
              <TextField label="Note" value={note} onChange={(event) => setNote(event.target.value)} fullWidth />
            </Stack>
            <Box>
              <Button
                variant="contained"
                onClick={() => recordPaymentMutation.mutate()}
                disabled={!canRecordPayment || recordPaymentMutation.isPending}
              >
                Enregistrer le paiement
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Historique paiements
          </Typography>
          {paymentsQuery.isLoading ? <Skeleton height={120} /> : null}
          {!paymentsQuery.isLoading && (paymentsQuery.data?.length ?? 0) === 0 ? (
            <Alert severity="info">Aucun paiement enregistre.</Alert>
          ) : null}
          {(paymentsQuery.data?.length ?? 0) > 0 ? (
            isMobile ? (
              <Stack spacing={1.2}>
                {paymentsQuery.data?.map((payment: PaymentRecord) => (
                  <Card key={payment.id} variant="outlined">
                    <CardContent>
                      <Stack spacing={0.6}>
                        <Typography variant="subtitle2">{memberLabel.get(payment.memberId) ?? payment.memberId}</Typography>
                        <Typography variant="body2">{`Montant: ${payment.amount} ${payment.currency}`}</Typography>
                        <Typography variant="body2">
                          {`Periode: ${payment.periodStart?.toDate().toLocaleDateString("fr-FR")} - ${payment.periodEnd?.toDate().toLocaleDateString("fr-FR")}`}
                        </Typography>
                        <Typography variant="body2">{`Reference: ${payment.reference || "-"}`}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <ResponsiveTable minWidth={760}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Membre</TableCell>
                      <TableCell>Montant</TableCell>
                      <TableCell>Periode</TableCell>
                      <TableCell>Reference</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paymentsQuery.data?.map((payment: PaymentRecord) => (
                      <TableRow key={payment.id}>
                        <TableCell>{memberLabel.get(payment.memberId) ?? payment.memberId}</TableCell>
                        <TableCell>{`${payment.amount} ${payment.currency}`}</TableCell>
                        <TableCell>
                          {`${payment.periodStart?.toDate().toLocaleDateString("fr-FR")} - ${payment.periodEnd?.toDate().toLocaleDateString("fr-FR")}`}
                        </TableCell>
                        <TableCell>{payment.reference || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ResponsiveTable>
            )
          ) : null}
        </CardContent>
      </Card>
    </Stack>
  );
}

export function AdminElectionsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const location = useLocation();
  const candidateMode = location.pathname.startsWith("/admin/candidates");
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const electionsQuery = useQuery({
    queryKey: queryKeys.elections,
    queryFn: fetchElections,
    refetchInterval: candidateMode ? false : 5000,
  });
  const membersQuery = useQuery({
    queryKey: [...queryKeys.members, role],
    queryFn: () => fetchMembers({ includeSuperAdmins: role === "superadmin" }),
  });
  const conditionsQuery = useQuery({
    queryKey: queryKeys.conditions,
    queryFn: fetchConditions,
  });
  const sectionsQuery = useQuery({ queryKey: queryKeys.sections, queryFn: fetchSections });
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Election["type"]>("federal");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [minSeniority, setMinSeniority] = useState("90");
  const [allowedSectionIds, setAllowedSectionIds] = useState<string[]>([]);
  const [voterConditionIds, setVoterConditionIds] = useState<string[]>([]);
  const [candidateConditionIds, setCandidateConditionIds] = useState<string[]>([]);

  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [managedVoterConditionIdsByElectionId, setManagedVoterConditionIdsByElectionId] = useState<
    Record<string, string[]>
  >({});
  const [managedCandidateConditionIdsByElectionId, setManagedCandidateConditionIdsByElectionId] = useState<
    Record<string, string[]>
  >({});
  const [managedStartAtByElectionId, setManagedStartAtByElectionId] = useState<Record<string, string>>({});
  const [managedEndAtByElectionId, setManagedEndAtByElectionId] = useState<Record<string, string>>({});
  const [candidateMemberId, setCandidateMemberId] = useState("");
  const [candidateBio, setCandidateBio] = useState("");
  const [candidateProjectSummary, setCandidateProjectSummary] = useState("");
  const [candidateVideoUrl, setCandidateVideoUrl] = useState("");
  const [candidatePhotoUrl, setCandidatePhotoUrl] = useState("");
  const [exportContent, setExportContent] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const fallbackSelectedElectionId = useMemo(() => {
    if (candidateMode) {
      return electionsQuery.data?.[0]?.id ?? "";
    }
    const openFirst = (electionsQuery.data ?? []).find((election) => election.status === "open");
    return openFirst?.id ?? electionsQuery.data?.[0]?.id ?? "";
  }, [candidateMode, electionsQuery.data]);
  const activeSelectedElectionId = selectedElectionId || fallbackSelectedElectionId;
  const selectedElection = useMemo(
    () => (electionsQuery.data ?? []).find((election) => election.id === activeSelectedElectionId) ?? null,
    [electionsQuery.data, activeSelectedElectionId],
  );
  const managedVoterConditionIds = useMemo(
    () => managedVoterConditionIdsByElectionId[activeSelectedElectionId] ?? selectedElection?.voterConditionIds ?? [],
    [activeSelectedElectionId, managedVoterConditionIdsByElectionId, selectedElection?.voterConditionIds],
  );
  const managedCandidateConditionIds = useMemo(
    () =>
      managedCandidateConditionIdsByElectionId[activeSelectedElectionId] ?? selectedElection?.candidateConditionIds ?? [],
    [activeSelectedElectionId, managedCandidateConditionIdsByElectionId, selectedElection?.candidateConditionIds],
  );
  const managedStartAt = useMemo(
    () =>
      managedStartAtByElectionId[activeSelectedElectionId] ??
      toDateTimeLocalInput(selectedElection?.startAt?.toDate?.()),
    [activeSelectedElectionId, managedStartAtByElectionId, selectedElection?.startAt],
  );
  const managedEndAt = useMemo(
    () =>
      managedEndAtByElectionId[activeSelectedElectionId] ??
      toDateTimeLocalInput(selectedElection?.endAt?.toDate?.()),
    [activeSelectedElectionId, managedEndAtByElectionId, selectedElection?.endAt],
  );
  const canEditSelectedElectionConditions = Boolean(
    selectedElection &&
      (role === "superadmin" || selectedElection.status === "draft" || selectedElection.status === "open"),
  );
  const selectableMembers = useMemo(
    () =>
      (membersQuery.data ?? []).filter((member) => {
        if (role === "superadmin") return true;
        return member.role !== "superadmin";
      }),
    [membersQuery.data, role],
  );

  const candidatesQuery = useQuery({
    queryKey: ["candidates", activeSelectedElectionId],
    queryFn: () => fetchCandidates(activeSelectedElectionId),
    enabled: Boolean(activeSelectedElectionId),
  });
  const electionScoresQuery = useQuery({
    queryKey: ["electionScores", activeSelectedElectionId],
    queryFn: () =>
      callFunction("getElectionScores", { electionId: activeSelectedElectionId }) as Promise<{
        election: {
          electionId: string;
          title: string;
          status: string;
          totalEligibleVoters: number;
          totalVotesCast: number;
          participationRate: number;
        };
        scores: Array<{
          candidateId: string;
          displayName: string;
          sectionName: string;
          status: string;
          voteCount: number;
          percentage: number;
        }>;
      }>,
    enabled: Boolean(!candidateMode && activeSelectedElectionId),
    refetchInterval: ({ state }) => {
      const status = (state.data as { election?: { status?: string } } | undefined)?.election?.status;
      return status === "open" ? 5000 : false;
    },
  });
  const electionIntegrityQuery = useQuery({
    queryKey: ["electionIntegrity", activeSelectedElectionId],
    queryFn: () =>
      callFunction("verifyElectionVoteIntegrity", { electionId: activeSelectedElectionId }) as Promise<{
        election: { electionId: string; title: string; status: string };
        healthy: boolean;
        issues: string[];
        stats: {
          ballotsCount: number;
          tokenIndexVotedCount: number;
          totalVotesCastDoc: number;
          missingBallotForTokenIndexCount: number;
          missingCandidateInTokenIndexCount: number;
        };
      }>,
    enabled: Boolean(!candidateMode && activeSelectedElectionId),
    refetchInterval: selectedElection?.status === "open" ? 15000 : false,
  });

  const createElectionMutation = useMutation({
    mutationFn: () =>
      callFunction("createElection", {
        title,
        description,
        type,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        minSeniority: Number(minSeniority),
        voterConditionIds,
        candidateConditionIds,
        allowedSectionIds,
      }),
    onSuccess: async () => {
      setError(null);
      setTitle("");
      setDescription("");
      setAllowedSectionIds([]);
      setVoterConditionIds([]);
      setCandidateConditionIds([]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.elections });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const addCandidateMutation = useMutation({
    mutationFn: () =>
      callFunction("addCandidate", {
        electionId: activeSelectedElectionId,
        memberId: candidateMemberId,
        bio: candidateBio,
        projectSummary: candidateProjectSummary,
        videoUrl: candidateVideoUrl,
        photoUrl: candidatePhotoUrl,
      }),
    onSuccess: async () => {
      setError(null);
      setCandidateMemberId("");
      setCandidateBio("");
      setCandidateProjectSummary("");
      setCandidateVideoUrl("");
      setCandidatePhotoUrl("");
      await queryClient.invalidateQueries({ queryKey: ["candidates", activeSelectedElectionId] });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const updateElectionDatesMutation = useMutation({
    mutationFn: () =>
      callFunction("updateElection", {
        electionId: activeSelectedElectionId,
        updates: {
          startAt: new Date(managedStartAt).toISOString(),
          endAt: new Date(managedEndAt).toISOString(),
        },
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.elections });
      await queryClient.invalidateQueries({ queryKey: queryKeys.memberElections });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const updateElectionConditionsMutation = useMutation({
    mutationFn: () =>
      callFunction("updateElection", {
        electionId: activeSelectedElectionId,
        updates: {
          voterConditionIds: managedVoterConditionIds,
          candidateConditionIds: managedCandidateConditionIds,
        },
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.elections });
      await queryClient.invalidateQueries({ queryKey: queryKeys.memberElections });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const openElectionMutation = useMutation({
    mutationFn: (electionId: string) => callFunction("openElection", { electionId }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.elections });
      await queryClient.invalidateQueries({ queryKey: ["candidates", activeSelectedElectionId] });
      await queryClient.invalidateQueries({ queryKey: ["electionScores", activeSelectedElectionId] });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const closeElectionMutation = useMutation({
    mutationFn: (electionId: string) => callFunction("closeElection", { electionId }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.elections });
      await queryClient.invalidateQueries({ queryKey: ["electionScores", activeSelectedElectionId] });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const publishElectionMutation = useMutation({
    mutationFn: (electionId: string) => callFunction("publishResults", { electionId }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.elections });
      await queryClient.invalidateQueries({ queryKey: ["electionScores", activeSelectedElectionId] });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const exportResultsMutation = useMutation({
    mutationFn: ({ electionId, format }: { electionId: string; format: "csv" | "pdf" }) =>
      callFunction("exportResults", {
        electionId,
        format,
      }) as Promise<{ format: string; content: string }>,
    onSuccess: (data) => {
      setError(null);
      setExportContent(data.content);
      setExportDialogOpen(true);
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const validateCandidateMutation = useMutation({
    mutationFn: ({
      electionId,
      candidateId,
      status,
    }: {
      electionId: string;
      candidateId: string;
      status: "validated" | "rejected";
    }) => callFunction("validateCandidate", { electionId, candidateId, status }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["candidates", activeSelectedElectionId] });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const removeCandidateMutation = useMutation({
    mutationFn: ({ electionId, candidateId }: { electionId: string; candidateId: string }) =>
      callFunction("removeCandidate", { electionId, candidateId }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["candidates", activeSelectedElectionId] });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{candidateMode ? "Candidats" : "Elections"}</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      {!candidateMode ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Creer une election</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="Titre" value={title} onChange={(event) => setTitle(event.target.value)} fullWidth />
                <FormControl fullWidth>
                  <InputLabel id="election-type">Type</InputLabel>
                  <Select
                    labelId="election-type"
                    label="Type"
                    value={type}
                    onChange={(event) => setType(event.target.value as Election["type"])}
                  >
                    <MenuItem value="federal">federal</MenuItem>
                    <MenuItem value="section">section</MenuItem>
                    <MenuItem value="other">other</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <TextField
                label="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                fullWidth
              />
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  type="datetime-local"
                  label="Ouverture"
                  InputLabelProps={{ shrink: true }}
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                  fullWidth
                />
                <TextField
                  type="datetime-local"
                  label="Cloture"
                  InputLabelProps={{ shrink: true }}
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Anciennete min (jours)"
                  type="number"
                  value={minSeniority}
                  onChange={(event) => setMinSeniority(event.target.value)}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="allowed-sections">Sections autorisees</InputLabel>
                  <Select
                    labelId="allowed-sections"
                    label="Sections autorisees"
                    multiple
                    value={allowedSectionIds}
                    onChange={(event) =>
                      setAllowedSectionIds(
                        typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value,
                      )
                    }
                  >
                    {sectionsQuery.data?.map((section) => (
                      <MenuItem key={section.id} value={section.id}>
                        {section.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id="voter-conditions">Conditions vote</InputLabel>
                  <Select
                    labelId="voter-conditions"
                    label="Conditions vote"
                    multiple
                    value={voterConditionIds}
                    onChange={(event) =>
                      setVoterConditionIds(
                        typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value,
                      )
                    }
                  >
                    {conditionsQuery.data?.map((condition) => (
                      <MenuItem key={condition.id} value={condition.id}>
                        {condition.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id="candidate-conditions">Conditions candidat</InputLabel>
                  <Select
                    labelId="candidate-conditions"
                    label="Conditions candidat"
                    multiple
                    value={candidateConditionIds}
                    onChange={(event) =>
                      setCandidateConditionIds(
                        typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value,
                      )
                    }
                  >
                    {conditionsQuery.data?.map((condition) => (
                      <MenuItem key={condition.id} value={condition.id}>
                        {condition.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Box>
                <Button
                  variant="contained"
                  onClick={() => createElectionMutation.mutate()}
                  disabled={!title || !startAt || !endAt || createElectionMutation.isPending}
                >
                  Creer l'election
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Liste des elections
          </Typography>
          {electionsQuery.isLoading ? <Skeleton height={120} /> : null}
          {(electionsQuery.data?.length ?? 0) > 0 ? (
            isMobile ? (
              <Stack spacing={1.3}>
                {electionsQuery.data?.map((election) => (
                  <Card key={election.id} variant="outlined">
                    <CardContent>
                      <Stack spacing={0.9}>
                        <Typography variant="subtitle2">{election.title}</Typography>
                        <Box>
                          <Chip size="small" color={electionStatusChipColor(election.status)} label={election.status} />
                        </Box>
                        <Typography variant="body2">{`Ouverture: ${election.startAt?.toDate().toLocaleString("fr-FR")}`}</Typography>
                        <Typography variant="body2">{`Cloture: ${election.endAt?.toDate().toLocaleString("fr-FR")}`}</Typography>
                        <Typography variant="body2">{`Votes: ${Number(election.totalVotesCast ?? 0)} / ${Number(
                          election.totalEligibleVoters ?? 0,
                        )}`}</Typography>
                        <Typography variant="body2">{`Participation: ${electionParticipationRate(election).toFixed(2)}%`}</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              setSelectedElectionId(election.id);
                            }}
                          >
                            Scores
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setSelectedElectionId(election.id);
                              setManagedVoterConditionIdsByElectionId((previous) => ({
                                ...previous,
                                [election.id]: election.voterConditionIds ?? [],
                              }));
                              setManagedCandidateConditionIdsByElectionId((previous) => ({
                                ...previous,
                                [election.id]: election.candidateConditionIds ?? [],
                              }));
                              setManagedStartAtByElectionId((previous) => ({
                                ...previous,
                                [election.id]: toDateTimeLocalInput(election.startAt?.toDate?.()),
                              }));
                              setManagedEndAtByElectionId((previous) => ({
                                ...previous,
                                [election.id]: toDateTimeLocalInput(election.endAt?.toDate?.()),
                              }));
                            }}
                          >
                            Gerer
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openElectionMutation.mutate(election.id)}
                            disabled={
                              (election.status !== "draft" && election.status !== "closed") || openElectionMutation.isPending
                            }
                          >
                            {election.status === "closed" ? "Reouvrir" : "Ouvrir"}
                          </Button>
                          <Button
                            size="small"
                            color="warning"
                            variant="outlined"
                            onClick={() => closeElectionMutation.mutate(election.id)}
                            disabled={election.status !== "open" || closeElectionMutation.isPending}
                          >
                            Fermer
                          </Button>
                          <Button
                            size="small"
                            color="success"
                            variant="outlined"
                            onClick={() => publishElectionMutation.mutate(election.id)}
                            disabled={election.status !== "closed" || publishElectionMutation.isPending}
                          >
                            Publier
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => exportResultsMutation.mutate({ electionId: election.id, format: "csv" })}
                            disabled={
                              (election.status !== "published" && election.status !== "closed") ||
                              exportResultsMutation.isPending
                            }
                          >
                            Export CSV
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <ResponsiveTable minWidth={1080}>
                <Table size="small">
                  <TableHead>
                      <TableRow>
                        <TableCell>Titre</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell>Ouverture</TableCell>
                        <TableCell>Cloture</TableCell>
                        <TableCell>Votes</TableCell>
                        <TableCell>Participation</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                  </TableHead>
                  <TableBody>
                    {electionsQuery.data?.map((election) => (
                      <TableRow key={election.id} selected={activeSelectedElectionId === election.id}>
                        <TableCell>{election.title}</TableCell>
                        <TableCell>
                          <Chip size="small" color={electionStatusChipColor(election.status)} label={election.status} />
                        </TableCell>
                        <TableCell>{election.startAt?.toDate().toLocaleString("fr-FR")}</TableCell>
                        <TableCell>{election.endAt?.toDate().toLocaleString("fr-FR")}</TableCell>
                        <TableCell>{`${Number(election.totalVotesCast ?? 0)} / ${Number(
                          election.totalEligibleVoters ?? 0,
                        )}`}</TableCell>
                        <TableCell>{`${electionParticipationRate(election).toFixed(2)}%`}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => {
                                setSelectedElectionId(election.id);
                              }}
                            >
                              Scores
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setSelectedElectionId(election.id);
                                setManagedVoterConditionIdsByElectionId((previous) => ({
                                  ...previous,
                                  [election.id]: election.voterConditionIds ?? [],
                                }));
                                setManagedCandidateConditionIdsByElectionId((previous) => ({
                                  ...previous,
                                  [election.id]: election.candidateConditionIds ?? [],
                                }));
                                setManagedStartAtByElectionId((previous) => ({
                                  ...previous,
                                  [election.id]: toDateTimeLocalInput(election.startAt?.toDate?.()),
                                }));
                                setManagedEndAtByElectionId((previous) => ({
                                  ...previous,
                                  [election.id]: toDateTimeLocalInput(election.endAt?.toDate?.()),
                                }));
                              }}
                            >
                              Gerer
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openElectionMutation.mutate(election.id)}
                              disabled={
                                (election.status !== "draft" && election.status !== "closed") || openElectionMutation.isPending
                              }
                            >
                              {election.status === "closed" ? "Reouvrir" : "Ouvrir"}
                            </Button>
                            <Button
                              size="small"
                              color="warning"
                              variant="outlined"
                              onClick={() => closeElectionMutation.mutate(election.id)}
                              disabled={election.status !== "open" || closeElectionMutation.isPending}
                            >
                              Fermer
                            </Button>
                            <Button
                              size="small"
                              color="success"
                              variant="outlined"
                              onClick={() => publishElectionMutation.mutate(election.id)}
                              disabled={election.status !== "closed" || publishElectionMutation.isPending}
                            >
                              Publier
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => exportResultsMutation.mutate({ electionId: election.id, format: "csv" })}
                              disabled={
                                (election.status !== "published" && election.status !== "closed") ||
                                exportResultsMutation.isPending
                              }
                            >
                              Export CSV
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ResponsiveTable>
            )
          ) : (
            <Alert severity="info">Aucune election configuree.</Alert>
          )}
        </CardContent>
      </Card>

      {!candidateMode ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
                <Typography variant="h6">Scores des votes</Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => electionScoresQuery.refetch()}
                      disabled={!activeSelectedElectionId || electionScoresQuery.isFetching}
                    >
                      Actualiser scores
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={() => electionIntegrityQuery.refetch()}
                      disabled={!activeSelectedElectionId || electionIntegrityQuery.isFetching}
                    >
                      Verifier l'integrite
                    </Button>
                  </Stack>
              </Stack>

              {!activeSelectedElectionId ? (
                <Alert severity="info">Selectionnez une election via "Gerer" pour voir les scores.</Alert>
              ) : null}
              {activeSelectedElectionId && electionScoresQuery.isLoading ? <Skeleton height={120} /> : null}
              {activeSelectedElectionId && electionScoresQuery.error ? (
                <Alert severity="error">{getErrorMessage(electionScoresQuery.error)}</Alert>
              ) : null}
              {activeSelectedElectionId && electionIntegrityQuery.error ? (
                <Alert severity="error">{getErrorMessage(electionIntegrityQuery.error)}</Alert>
              ) : null}
              {activeSelectedElectionId && electionIntegrityQuery.data ? (
                <Alert severity={electionIntegrityQuery.data.healthy ? "success" : "error"}>
                  {electionIntegrityQuery.data.healthy
                    ? `Integrite OK: ${electionIntegrityQuery.data.stats.ballotsCount} bulletins, ${electionIntegrityQuery.data.stats.tokenIndexVotedCount} index votants, totalVotesCast=${electionIntegrityQuery.data.stats.totalVotesCastDoc}.`
                    : `Incoherence detectee (${electionIntegrityQuery.data.issues.join(", ")}). Bulletins=${electionIntegrityQuery.data.stats.ballotsCount}, index votants=${electionIntegrityQuery.data.stats.tokenIndexVotedCount}, totalVotesCast=${electionIntegrityQuery.data.stats.totalVotesCastDoc}.`}
                </Alert>
              ) : null}

              {activeSelectedElectionId && electionScoresQuery.data ? (
                <>
                  <Alert severity="info">
                    {`${electionScoresQuery.data.election.title} - ${electionScoresQuery.data.election.totalVotesCast} votes / ${
                      electionScoresQuery.data.election.totalEligibleVoters
                    } eligibles (${electionScoresQuery.data.election.participationRate.toFixed(2)}%)`}
                  </Alert>
                  {electionScoresQuery.data.scores.length === 0 ? (
                    <Alert severity="info">Aucun score disponible pour cette election.</Alert>
                  ) : isMobile ? (
                    <Stack spacing={1.1}>
                      {electionScoresQuery.data.scores.map((row, index) => (
                        <Card key={row.candidateId} variant="outlined">
                          <CardContent>
                            <Stack spacing={0.6}>
                              <Typography variant="subtitle2">{row.displayName}</Typography>
                              <Typography variant="body2">{`Section: ${row.sectionName || "-"}`}</Typography>
                              <Typography variant="body2">{`Votes: ${row.voteCount}`}</Typography>
                              <Typography variant="body2">{`Score: ${row.percentage.toFixed(2)}%`}</Typography>
                              <Typography variant="body2">{`Statut candidat: ${row.status}`}</Typography>
                              {index === 0 ? <Chip size="small" color="success" label="En tete" sx={{ alignSelf: "flex-start" }} /> : null}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <ResponsiveTable minWidth={900}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Rang</TableCell>
                            <TableCell>Candidat</TableCell>
                            <TableCell>Section</TableCell>
                            <TableCell>Statut</TableCell>
                            <TableCell>Votes</TableCell>
                            <TableCell>Pourcentage</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {electionScoresQuery.data.scores.map((row, index) => (
                            <TableRow key={row.candidateId}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{row.displayName}</TableCell>
                              <TableCell>{row.sectionName || "-"}</TableCell>
                              <TableCell>{row.status}</TableCell>
                              <TableCell>{row.voteCount}</TableCell>
                              <TableCell>{`${row.percentage.toFixed(2)}%`}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ResponsiveTable>
                  )}
                </>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {activeSelectedElectionId ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Parametres de l'election</Typography>
              <Alert severity="info">
                {selectedElection?.status === "open"
                  ? "Election ouverte: vous pouvez ajuster les dates et les conditions."
                  : "Utilisez ce panneau pour modifier les dates et les conditions de cette election."}
              </Alert>
              {!canEditSelectedElectionConditions ? (
                <Alert severity="warning">Cette election est verrouillee pour les modifications.</Alert>
              ) : null}
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Ouverture"
                  type="datetime-local"
                  fullWidth
                  value={managedStartAt}
                  onChange={(event) =>
                    setManagedStartAtByElectionId((previous) => ({
                      ...previous,
                      [activeSelectedElectionId]: event.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                  disabled={!canEditSelectedElectionConditions || updateElectionDatesMutation.isPending}
                />
                <TextField
                  label="Cloture"
                  type="datetime-local"
                  fullWidth
                  value={managedEndAt}
                  onChange={(event) =>
                    setManagedEndAtByElectionId((previous) => ({
                      ...previous,
                      [activeSelectedElectionId]: event.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                  disabled={!canEditSelectedElectionConditions || updateElectionDatesMutation.isPending}
                />
              </Stack>
              <Box>
                <Button
                  variant="contained"
                  onClick={() => updateElectionDatesMutation.mutate()}
                  disabled={
                    !canEditSelectedElectionConditions ||
                    !managedStartAt ||
                    !managedEndAt ||
                    updateElectionDatesMutation.isPending
                  }
                >
                  Enregistrer les dates
                </Button>
              </Box>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="manage-voter-conditions">Conditions vote</InputLabel>
                  <Select
                    labelId="manage-voter-conditions"
                    label="Conditions vote"
                    multiple
                    value={managedVoterConditionIds}
                    onChange={(event) =>
                      setManagedVoterConditionIdsByElectionId((previous) => ({
                        ...previous,
                        [activeSelectedElectionId]:
                          typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value,
                      }))
                    }
                    disabled={!canEditSelectedElectionConditions || updateElectionConditionsMutation.isPending}
                  >
                    {conditionsQuery.data?.map((condition) => (
                      <MenuItem key={condition.id} value={condition.id}>
                        {condition.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id="manage-candidate-conditions">Conditions candidat</InputLabel>
                  <Select
                    labelId="manage-candidate-conditions"
                    label="Conditions candidat"
                    multiple
                    value={managedCandidateConditionIds}
                    onChange={(event) =>
                      setManagedCandidateConditionIdsByElectionId((previous) => ({
                        ...previous,
                        [activeSelectedElectionId]:
                          typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value,
                      }))
                    }
                    disabled={!canEditSelectedElectionConditions || updateElectionConditionsMutation.isPending}
                  >
                    {conditionsQuery.data?.map((condition) => (
                      <MenuItem key={condition.id} value={condition.id}>
                        {condition.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Box>
                <Button
                  variant="contained"
                  onClick={() => updateElectionConditionsMutation.mutate()}
                  disabled={!canEditSelectedElectionConditions || updateElectionConditionsMutation.isPending}
                >
                  Enregistrer les conditions
                </Button>
              </Box>

              <Typography variant="h6">Gestion des candidats</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="candidate-member">Membre</InputLabel>
                  <Select
                    labelId="candidate-member"
                    label="Membre"
                    value={candidateMemberId}
                    onChange={(event) => setCandidateMemberId(event.target.value)}
                  >
                    {selectableMembers.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        {`${member.firstName} ${member.lastName} - ${member.email}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Bio"
                  value={candidateBio}
                  onChange={(event) => setCandidateBio(event.target.value)}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Projet du candidat"
                  value={candidateProjectSummary}
                  onChange={(event) => setCandidateProjectSummary(event.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
                />
                <TextField
                  label="Video de presentation (URL)"
                  value={candidateVideoUrl}
                  onChange={(event) => setCandidateVideoUrl(event.target.value)}
                  placeholder="https://..."
                  fullWidth
                />
                <TextField
                  label="Photo du candidat (URL)"
                  value={candidatePhotoUrl}
                  onChange={(event) => setCandidatePhotoUrl(event.target.value)}
                  placeholder="https://..."
                  fullWidth
                />
                <Button
                  variant="contained"
                  onClick={() => addCandidateMutation.mutate()}
                  disabled={!candidateMemberId || addCandidateMutation.isPending}
                >
                  Ajouter
                </Button>
              </Stack>

              {(candidatesQuery.data?.length ?? 0) > 0 ? (
                isMobile ? (
                  <Stack spacing={1.2}>
                    {candidatesQuery.data?.map((candidate: Candidate) => (
                      <Card key={candidate.id} variant="outlined">
                        <CardContent>
                          <Stack spacing={0.7}>
                            <Typography variant="subtitle2">{candidate.displayName}</Typography>
                            <Typography variant="body2">{`Section: ${candidate.sectionName || "-"}`}</Typography>
                            <Typography variant="body2">{`Statut: ${candidate.status}`}</Typography>
                            <Typography variant="body2">{`Projet: ${candidate.projectSummary ? "Oui" : "Non"}`}</Typography>
                            <Stack direction="row" spacing={1}>
                              {candidate.photoUrl ? (
                                <Button size="small" variant="text" href={candidate.photoUrl} target="_blank" rel="noreferrer">
                                  Photo
                                </Button>
                              ) : null}
                              {candidate.videoUrl ? (
                                <Button size="small" variant="text" href={candidate.videoUrl} target="_blank" rel="noreferrer">
                                  Video
                                </Button>
                              ) : null}
                            </Stack>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  validateCandidateMutation.mutate({
                                    electionId: activeSelectedElectionId,
                                    candidateId: candidate.id,
                                    status: "validated",
                                  })
                                }
                                disabled={validateCandidateMutation.isPending}
                              >
                                Valider
                              </Button>
                              <Button
                                size="small"
                                color="warning"
                                variant="outlined"
                                onClick={() =>
                                  validateCandidateMutation.mutate({
                                    electionId: activeSelectedElectionId,
                                    candidateId: candidate.id,
                                    status: "rejected",
                                  })
                                }
                                disabled={validateCandidateMutation.isPending}
                              >
                                Rejeter
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                onClick={() =>
                                  removeCandidateMutation.mutate({
                                    electionId: activeSelectedElectionId,
                                    candidateId: candidate.id,
                                  })
                                }
                                disabled={removeCandidateMutation.isPending}
                              >
                                Retirer
                              </Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                <ResponsiveTable minWidth={1120}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Candidat</TableCell>
                        <TableCell>Section</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell>Projet</TableCell>
                        <TableCell>Photo</TableCell>
                        <TableCell>Video</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {candidatesQuery.data?.map((candidate: Candidate) => (
                        <TableRow key={candidate.id}>
                          <TableCell>{candidate.displayName}</TableCell>
                          <TableCell>{candidate.sectionName || "-"}</TableCell>
                          <TableCell>{candidate.status}</TableCell>
                          <TableCell>{candidate.projectSummary ? "Oui" : "Non"}</TableCell>
                          <TableCell>
                            {candidate.photoUrl ? (
                              <Button size="small" variant="text" href={candidate.photoUrl} target="_blank" rel="noreferrer">
                                Voir
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {candidate.videoUrl ? (
                              <Button size="small" variant="text" href={candidate.videoUrl} target="_blank" rel="noreferrer">
                                Ouvrir
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  validateCandidateMutation.mutate({
                                    electionId: activeSelectedElectionId,
                                    candidateId: candidate.id,
                                    status: "validated",
                                  })
                                }
                                disabled={validateCandidateMutation.isPending}
                              >
                                Valider
                              </Button>
                              <Button
                                size="small"
                                color="warning"
                                variant="outlined"
                                onClick={() =>
                                  validateCandidateMutation.mutate({
                                    electionId: activeSelectedElectionId,
                                    candidateId: candidate.id,
                                    status: "rejected",
                                  })
                                }
                                disabled={validateCandidateMutation.isPending}
                              >
                                Rejeter
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                onClick={() =>
                                  removeCandidateMutation.mutate({
                                    electionId: activeSelectedElectionId,
                                    candidateId: candidate.id,
                                  })
                                }
                                disabled={removeCandidateMutation.isPending}
                              >
                                Retirer
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveTable>
                )
              ) : (
                <Alert severity="info">Aucun candidat sur cette election.</Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Export resultats</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            minRows={8}
            fullWidth
            value={exportContent}
            onChange={(event) => setExportContent(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export function AdminScoresPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const electionsQuery = useQuery({
    queryKey: queryKeys.elections,
    queryFn: fetchElections,
    refetchInterval: 5000,
  });

  const scoreElections = useMemo(() => {
    const items = (electionsQuery.data ?? []).filter((election) => election.status !== "draft");
    return [...items].sort((a, b) => {
      const aOrder = adminScoresOrderIndex(a.id);
      const bOrder = adminScoresOrderIndex(b.id);
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aStart = a.startAt?.toDate?.()?.getTime?.() ?? 0;
      const bStart = b.startAt?.toDate?.()?.getTime?.() ?? 0;
      if (aStart !== bStart) return aStart - bStart;
      return a.title.localeCompare(b.title, "fr-FR");
    });
  }, [electionsQuery.data]);

  const candidatesQueries = useQueries({
    queries: scoreElections.map((election) => ({
      queryKey: ["candidates", election.id, "admin-scores"],
      queryFn: () => fetchCandidates(election.id),
      enabled: Boolean(election.id),
    })),
  });

  const scoresQueries = useQueries({
    queries: scoreElections.map((election) => ({
      queryKey: ["electionScores", election.id, "admin-scores"],
      queryFn: () =>
        callFunction("getElectionScores", { electionId: election.id }) as Promise<{
          election: {
            electionId: string;
            title: string;
            status: string;
            totalEligibleVoters: number;
            totalVotesCast: number;
            participationRate: number;
          };
          scores: Array<{
            candidateId: string;
            displayName: string;
            sectionName: string;
            status: string;
            voteCount: number;
            percentage: number;
          }>;
        }>,
      enabled: Boolean(election.id),
      refetchInterval: election.status === "open" ? 5000 : false,
    })),
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Scores</Typography>

      {electionsQuery.error ? <Alert severity="error">{getErrorMessage(electionsQuery.error)}</Alert> : null}
      {electionsQuery.isLoading ? <Skeleton height={140} /> : null}
      {!electionsQuery.isLoading && scoreElections.length === 0 ? (
        <Alert severity="info">Aucune election fermee ou publiee a afficher.</Alert>
      ) : null}

      {scoreElections.map((election, index) => {
        const scoresQuery = scoresQueries[index];
        const candidatesQuery = candidatesQueries[index];
        const scoresData = scoresQuery?.data as
          | {
              election: {
                electionId: string;
                title: string;
                status: string;
                totalEligibleVoters: number;
                totalVotesCast: number;
                participationRate: number;
              };
              scores: Array<{
                candidateId: string;
                displayName: string;
                sectionName: string;
                status: string;
                voteCount: number;
                percentage: number;
              }>;
            }
          | undefined;
        const candidates = (candidatesQuery?.data ?? []) as Candidate[];
        const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
        const titleParts = splitElectionTitleForDisplay(election.title);

        const rows = (scoresData?.scores ?? []).map((row, rowIndex) => {
          const linkedCandidate = candidateById.get(row.candidateId);
          const photoUrl = resolveCandidatePhotoUrl(row.displayName, linkedCandidate?.photoUrl);
          return {
            ...row,
            rank: rowIndex + 1,
            photoUrl,
          };
        });

        return (
          <Card key={election.id} sx={{ border: "1px solid rgba(16,59,115,0.16)", overflow: "hidden" }}>
            <CardContent>
              <Stack spacing={2}>
                <Box
                  sx={{
                    border: "1px solid rgba(16,59,115,0.18)",
                    borderLeft: "4px solid rgba(16,59,115,0.55)",
                    borderRight: "4px solid rgba(16,59,115,0.55)",
                    borderRadius: 2,
                    p: { xs: 1.5, md: 2 },
                    textAlign: "center",
                    background: "linear-gradient(180deg, rgba(16,59,115,0.14), rgba(16,59,115,0.08))",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Scrutin
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      mt: 0.4,
                      fontSize: { xs: "1.55rem", md: "1.95rem" },
                      lineHeight: 1.2,
                    }}
                  >
                    {titleParts.scrutinTitle}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      mt: 0.55,
                      fontSize: { xs: "1.15rem", md: "1.3rem" },
                      lineHeight: 1.28,
                    }}
                  >
                    {titleParts.posteTitle}
                  </Typography>
                </Box>

                {scoresQuery?.isLoading ? <Skeleton height={120} /> : null}
                {scoresQuery?.error ? <Alert severity="error">{getErrorMessage(scoresQuery.error)}</Alert> : null}
                {candidatesQuery?.error ? <Alert severity="warning">{getErrorMessage(candidatesQuery.error)}</Alert> : null}

                {scoresData ? (
                  <Alert severity="info">
                    {`${scoresData.election.totalVotesCast} votes / ${scoresData.election.totalEligibleVoters} eligibles (${scoresData.election.participationRate.toFixed(2)}%)`}
                  </Alert>
                ) : null}

                {scoresData && rows.length === 0 ? <Alert severity="info">Aucun candidat score pour cette election.</Alert> : null}

                {rows.length > 0 ? (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(auto-fit, minmax(280px, 340px))",
                      },
                      gap: 1.8,
                      justifyContent: "center",
                      justifyItems: "center",
                    }}
                  >
                    {rows.map((row) => (
                      <Card
                        key={`${election.id}-${row.candidateId}`}
                        variant="outlined"
                        sx={{
                          position: "relative",
                          width: "100%",
                          maxWidth: 340,
                          borderColor: row.rank === 1 ? "rgba(56,130,107,0.55)" : "rgba(16,59,115,0.2)",
                          background:
                            row.rank === 1
                              ? "linear-gradient(180deg, rgba(56,130,107,0.12), rgba(56,130,107,0.04))"
                              : "linear-gradient(180deg, rgba(16,59,115,0.06), rgba(16,59,115,0.02))",
                          aspectRatio: "1 / 1",
                          minHeight: { xs: 290, sm: 320 },
                          boxShadow: row.rank === 1 ? "0 10px 22px rgba(56,130,107,0.18)" : "0 8px 18px rgba(16,59,115,0.10)",
                        }}
                      >
                        {row.rank === 1 ? (
                          <Chip
                            icon={<EmojiEventsRoundedIcon />}
                            label="Vainqueur"
                            size="small"
                            sx={{
                              position: "absolute",
                              top: 10,
                              right: 10,
                              zIndex: 2,
                              color: "white",
                              fontWeight: 800,
                              border: "1px solid rgba(255,255,255,0.35)",
                              background: "linear-gradient(135deg, #D4951A 0%, #F1C45B 45%, #B87317 100%)",
                              "& .MuiChip-icon": { color: "white" },
                            }}
                          />
                        ) : null}
                        <CardContent
                          sx={{
                            p: 1.9,
                            "&:last-child": { pb: 1.9 },
                            height: "100%",
                          }}
                        >
                          <Stack spacing={1.6} sx={{ height: "100%", justifyContent: "space-between" }}>
                            <Stack direction="row" spacing={1.4} alignItems="center">
                              <Avatar
                                src={row.photoUrl}
                                alt={row.displayName}
                                sx={{
                                  width: isMobile ? 94 : 110,
                                  height: isMobile ? 94 : 110,
                                  border: row.rank === 1 ? "3px solid rgba(56,130,107,0.55)" : "3px solid rgba(16,59,115,0.22)",
                                  bgcolor: "rgba(16,59,115,0.08)",
                                }}
                              >
                                {row.displayName.charAt(0)}
                              </Avatar>
                              <Box minWidth={0}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                                  {row.displayName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" noWrap>
                                  {row.sectionName || "-"}
                                </Typography>
                              </Box>
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="space-between">
                              <Chip
                                size="small"
                                color={row.rank === 1 ? "success" : "default"}
                                label={row.rank === 1 ? "1er" : `${row.rank}e`}
                              />
                              <Chip size="small" variant="outlined" label={`${row.voteCount} vote${row.voteCount > 1 ? "s" : ""}`} />
                              <Chip size="small" variant="outlined" label={`${row.percentage.toFixed(2)}%`} />
                            </Stack>

                            <Box sx={{ height: 10, borderRadius: 10, bgcolor: "rgba(16,59,115,0.14)", overflow: "hidden" }}>
                              <Box
                                sx={{
                                  height: "100%",
                                  width: `${Math.max(0, Math.min(100, row.percentage))}%`,
                                  bgcolor: row.rank === 1 ? "success.main" : "primary.main",
                                  transition: "width 220ms ease",
                                }}
                              />
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

export function AdminLogsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [actionFilter, setActionFilter] = useState("");
  const logsQuery = useQuery({
    queryKey: ["logs", actionFilter],
    queryFn: () =>
      callFunction("getAuditLogs", {
        action: actionFilter || undefined,
        limit: 200,
      }) as Promise<{ logs: Array<Record<string, unknown>>; total: number }>,
  });
  const formatLogTimestamp = (log: Record<string, unknown>) => {
    const rawIso = typeof log.timestampIso === "string" ? log.timestampIso : "";
    if (rawIso) {
      const parsed = new Date(rawIso);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleString("fr-FR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
      }
    }

    const rawTimestamp = log.timestamp as
      | { toDate?: () => Date; _seconds?: number; seconds?: number }
      | undefined;
    let parsed: Date | null = null;
    if (rawTimestamp?.toDate) {
      parsed = rawTimestamp.toDate();
    } else {
      const seconds = Number(rawTimestamp?._seconds ?? rawTimestamp?.seconds ?? NaN);
      if (!Number.isNaN(seconds)) {
        parsed = new Date(seconds * 1000);
      }
    }
    if (!parsed || Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };
  const formatActionLabel = (log: Record<string, unknown>) => {
    const action = String(log.action ?? "");
    const targetName = String(log.targetDisplayName ?? "").trim();
    const labels: Record<string, string> = {
      "member.create": "Inscription d'un membre",
      "member.update": "Mise a jour d'un membre",
      "member.password_change": "Changement du mot de passe",
      "member.role_change": "Modification du role d'un membre",
      "section.create": "Creation d'une section",
      "section.update": "Mise a jour d'une section",
      "section.delete": "Suppression d'une section",
      "condition.create": "Creation d'une condition",
      "condition.update": "Mise a jour d'une condition",
      "condition.delete": "Suppression d'une condition",
      "condition.validate": "Validation d'une condition membre",
      "condition.invalidate": "Invalidation d'une condition membre",
      "policy.create": "Creation de la politique de cotisation",
      "policy.update": "Mise a jour de la politique de cotisation",
      "payment.record": "Enregistrement d'un paiement",
      "election.create": "Creation d'une election",
      "election.update": "Mise a jour d'une election",
      "election.open": "Ouverture d'une election",
      "election.close": "Fermeture d'une election",
      "election.publish": "Publication des resultats",
      "candidate.add": "Ajout d'un candidat",
      "candidate.validate": "Validation d'un candidat",
      "candidate.reject": "Rejet d'un candidat",
      "candidate.remove": "Retrait d'un candidat",
      "vote.cast": "Vote enregistre (choix secret)",
      "vote.integrity_alert": "Alerte integrite des votes",
      "export.generate": "Generation d'un export",
    };
    const base = labels[action] ?? action;
    const shouldAppendTarget =
      action.startsWith("candidate.") ||
      action.startsWith("election.") ||
      action === "member.create" ||
      action === "member.update" ||
      action === "vote.cast" ||
      action === "export.generate";
    if (shouldAppendTarget && targetName) {
      return `${base}: ${targetName}`;
    }
    return base;
  };
  const formatTargetLabel = (log: Record<string, unknown>) => {
    const targetType = String(log.targetType ?? "");
    const targetValue = String(log.targetDisplayName || log.targetId || "");
    const typeLabel: Record<string, string> = {
      member: "Membre",
      election: "Election",
      section: "Section",
      condition: "Condition",
      candidate: "Candidat",
      payment: "Paiement",
      policy: "Politique",
      export: "Export",
      audit: "Audit",
    };
    const left = typeLabel[targetType] ?? targetType;
    if (!left && !targetValue) return "-";
    if (left && targetValue) return `${left}: ${targetValue}`;
    return targetValue || left || "-";
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Logs</Typography>
      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Filtrer par action"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              fullWidth
            />
            <Button variant="outlined" onClick={() => logsQuery.refetch()}>
              Actualiser
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          {logsQuery.isLoading ? <Skeleton height={120} /> : null}
          {(logsQuery.data?.logs.length ?? 0) > 0 ? (
            isMobile ? (
              <Stack spacing={1.2}>
                {logsQuery.data?.logs.map((log, index) => {
                  const key = String(log.id ?? `${String(log.action ?? "log")}-${index}`);
                  const actorLabel = String(log.actorDisplayName ?? log.actorId ?? "-");
                  const actionLabel = formatActionLabel(log);
                  const targetLabel = formatTargetLabel(log);
                  const timestampLabel = formatLogTimestamp(log);
                  return (
                    <Card key={key} variant="outlined">
                      <CardContent>
                        <Stack spacing={0.5}>
                          <Typography variant="body2">{`Date: ${timestampLabel}`}</Typography>
                          <Typography variant="body2">{`Action: ${actionLabel}`}</Typography>
                          <Typography variant="body2">{`Acteur: ${actorLabel}`}</Typography>
                          <Typography variant="body2">{`Cible: ${targetLabel}`}</Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            ) : (
              <ResponsiveTable minWidth={920}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Acteur</TableCell>
                      <TableCell>Cible</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logsQuery.data?.logs.map((log, index) => {
                      const key = String(log.id ?? `${String(log.action ?? "log")}-${index}`);
                      const timestampLabel = formatLogTimestamp(log);
                      const actionLabel = formatActionLabel(log);
                      const actorLabel = String(log.actorDisplayName ?? log.actorId ?? "-");
                      const targetLabel = formatTargetLabel(log);
                      return (
                        <TableRow key={key}>
                          <TableCell>{timestampLabel}</TableCell>
                          <TableCell>{actionLabel}</TableCell>
                          <TableCell>{actorLabel}</TableCell>
                          <TableCell>{targetLabel}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ResponsiveTable>
            )
          ) : (
            <Alert severity="info">Aucun log a afficher.</Alert>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

export function SuperAdminAdminsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const membersQuery = useQuery({
    queryKey: [...queryKeys.members, role],
    queryFn: () => fetchMembers({ includeSuperAdmins: role === "superadmin" }),
  });
  const [error, setError] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<Record<string, Member["role"]>>({});
  const canAssignSuperAdmin = role === "superadmin";
  const membersForRoleManagement = useMemo(
    () =>
      (membersQuery.data ?? []).filter((member) => {
        if (canAssignSuperAdmin) return true;
        return member.role !== "superadmin";
      }),
    [membersQuery.data, canAssignSuperAdmin],
  );

  const changeRoleMutation = useMutation({
    mutationFn: ({ memberId, newRole }: { memberId: string; newRole: Member["role"] }) =>
      callFunction("changeRole", { memberId, newRole }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Gestion admins</Typography>
      {!canAssignSuperAdmin ? <Alert severity="info">Vous pouvez promouvoir un membre en admin.</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card>
        <CardContent>
          {membersQuery.isLoading ? <Skeleton height={120} /> : null}
          {(membersForRoleManagement.length ?? 0) > 0 ? (
            isMobile ? (
              <Stack spacing={1.2}>
                {membersForRoleManagement.map((member) => (
                  <Card key={member.id} variant="outlined">
                    <CardContent>
                      <Stack spacing={0.8}>
                        <Typography variant="subtitle2">{`${member.firstName} ${member.lastName}`}</Typography>
                        <Typography variant="body2">{member.email}</Typography>
                        <Typography variant="body2">{`Role actuel: ${member.role}`}</Typography>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={pendingRoles[member.id] ?? member.role}
                            onChange={(event) =>
                              setPendingRoles((previous) => ({
                                ...previous,
                                [member.id]: event.target.value as Member["role"],
                              }))
                            }
                          >
                            <MenuItem value="member">member</MenuItem>
                            <MenuItem value="admin">admin</MenuItem>
                            {canAssignSuperAdmin ? <MenuItem value="superadmin">superadmin</MenuItem> : null}
                          </Select>
                        </FormControl>
                        <Box display="flex" justifyContent="flex-end">
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() =>
                              changeRoleMutation.mutate({
                                memberId: member.id,
                                newRole: pendingRoles[member.id] ?? member.role,
                              })
                            }
                            disabled={changeRoleMutation.isPending}
                          >
                            Appliquer
                          </Button>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <ResponsiveTable minWidth={920}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Prenom</TableCell>
                      <TableCell>Nom</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role actuel</TableCell>
                      <TableCell>Nouveau role</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {membersForRoleManagement.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>{member.firstName}</TableCell>
                        <TableCell>{member.lastName}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.role}</TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 180 }}>
                            <Select
                              value={pendingRoles[member.id] ?? member.role}
                              onChange={(event) =>
                                setPendingRoles((previous) => ({
                                  ...previous,
                                  [member.id]: event.target.value as Member["role"],
                                }))
                              }
                            >
                              <MenuItem value="member">member</MenuItem>
                              <MenuItem value="admin">admin</MenuItem>
                              {canAssignSuperAdmin ? <MenuItem value="superadmin">superadmin</MenuItem> : null}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() =>
                              changeRoleMutation.mutate({
                                memberId: member.id,
                                newRole: pendingRoles[member.id] ?? member.role,
                              })
                            }
                            disabled={changeRoleMutation.isPending}
                          >
                            Appliquer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ResponsiveTable>
            )
          ) : (
            <Alert severity="info">Aucun membre disponible.</Alert>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

export function SuperAdminAuditPage() {
  const electionsQuery = useQuery({ queryKey: queryKeys.elections, queryFn: fetchElections });
  const [electionId, setElectionId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkMutation = useMutation({
    mutationFn: () =>
      callFunction("auditCheckVoter", {
        electionId,
        memberId,
        reason,
      }) as Promise<Record<string, unknown>>,
    onSuccess: (data) => {
      setError(null);
      setResult(data);
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const revealMutation = useMutation({
    mutationFn: () =>
      callFunction("auditRevealVote", {
        electionId,
        memberId,
        reason,
      }) as Promise<Record<string, unknown>>,
    onSuccess: (data) => {
      setError(null);
      setResult(data);
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Audit confidentiel</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="audit-election">Election</InputLabel>
              <Select
                labelId="audit-election"
                label="Election"
                value={electionId}
                onChange={(event) => setElectionId(event.target.value)}
              >
                {electionsQuery.data?.map((election) => (
                  <MenuItem value={election.id} key={election.id}>
                    {`${election.title} (${election.status})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Member ID"
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
              fullWidth
            />
            <TextField
              label="Motif audit (obligatoire)"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              fullWidth
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Button
                variant="outlined"
                onClick={() => checkMutation.mutate()}
                disabled={!electionId || !memberId || reason.length < 5 || checkMutation.isPending}
              >
                Verifier vote (oui/non)
              </Button>
              <Button
                variant="contained"
                color="warning"
                onClick={() => revealMutation.mutate()}
                disabled={!electionId || !memberId || reason.length < 5 || revealMutation.isPending}
              >
                Reveler le vote
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      {result ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Resultat audit
            </Typography>
            <TextField
              multiline
              minRows={6}
              fullWidth
              value={JSON.stringify(result, null, 2)}
              onChange={(event) => setResult({ raw: event.target.value })}
            />
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
