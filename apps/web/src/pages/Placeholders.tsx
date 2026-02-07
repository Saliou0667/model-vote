import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { callFunction, getErrorMessage } from "../api/callables";
import {
  fetchActiveContributionPolicy,
  fetchCandidates,
  fetchConditions,
  fetchElections,
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
};

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
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstNameValue = firstName ?? profile?.firstName ?? "";
  const lastNameValue = lastName ?? profile?.lastName ?? "";
  const phoneValue = phone ?? profile?.phone ?? "";

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Utilisateur non connecte.");
      await callFunction("updateMember", {
        memberId: user.uid,
        updates: {
          firstName: firstNameValue,
          lastName: lastNameValue,
          phone: phoneValue,
        },
      });
    },
    onSuccess: async () => {
      setError(null);
      setFeedback("Profil mis a jour.");
      setFirstName(undefined);
      setLastName(undefined);
      setPhone(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.members });
      await refreshAuthState();
    },
    onError: (mutationError) => {
      setFeedback(null);
      setError(getErrorMessage(mutationError));
    },
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Mon profil</Typography>
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField label="Prenom" value={firstNameValue} onChange={(event) => setFirstName(event.target.value)} />
            <TextField label="Nom" value={lastNameValue} onChange={(event) => setLastName(event.target.value)} />
            <TextField label="Telephone" value={phoneValue} onChange={(event) => setPhone(event.target.value)} />
            <Button variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending || !user}>
              Mettre a jour
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export function MemberEligibilityPage() {
  const { user } = useAuth();
  const eligibilityQuery = useQuery({
    queryKey: ["eligibility", user?.uid],
    queryFn: async () => {
      if (!user) return null;
      return callFunction("computeEligibility", {
        memberId: user.uid,
      }) as Promise<{
        eligible: boolean;
        reasons: Array<{ condition: string; met: boolean; detail: string }>;
      }>;
    },
    enabled: Boolean(user),
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Mon eligibilite</Typography>
      {eligibilityQuery.isLoading ? <Skeleton height={120} /> : null}
      {eligibilityQuery.error ? <Alert severity="error">{getErrorMessage(eligibilityQuery.error)}</Alert> : null}
      {eligibilityQuery.data ? (
        <Alert severity={eligibilityQuery.data.eligible ? "success" : "warning"}>
          {eligibilityQuery.data.eligible ? "Vous etes eligible." : "Vous n'etes pas encore eligible."}
        </Alert>
      ) : null}
      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            {(eligibilityQuery.data?.reasons ?? []).map((reason) => (
              <Alert
                key={reason.condition}
                severity={reason.met ? "success" : "info"}
              >{`${reason.condition}: ${reason.detail}`}</Alert>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export function MemberVotePage() {
  return (
    <PlaceholderPage
      title="Vote"
      subtitle="Page de vote securisee, castVote via Cloud Function (M5)."
      actionLabel="Confirmer mon vote"
    />
  );
}

export function MemberResultsPage() {
  return <PlaceholderPage title="Resultats" subtitle="Resultats publies visibles apres cloture/publication." />;
}

export function AdminDashboardPage() {
  const sectionsQuery = useQuery({
    queryKey: queryKeys.sections,
    queryFn: fetchSections,
  });
  const membersQuery = useQuery({
    queryKey: queryKeys.members,
    queryFn: fetchMembers,
  });

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
            <Typography variant="h4">{membersQuery.isLoading ? "..." : (membersQuery.data?.length ?? 0)}</Typography>
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}

export function AdminSectionsPage() {
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
  const queryClient = useQueryClient();
  const membersQuery = useQuery({ queryKey: queryKeys.members, queryFn: fetchMembers });
  const sectionsQuery = useQuery({ queryKey: queryKeys.sections, queryFn: fetchSections });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Member["status"]>("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [status, setStatus] = useState<Member["status"]>("pending");
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      callFunction("createMember", {
        email,
        firstName,
        lastName,
        phone,
        sectionId,
        status,
      }),
    onSuccess: async () => {
      setError(null);
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setStatus("pending");
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

  const sectionLabel = useMemo(() => {
    const map = new Map<string, string>();
    sectionsQuery.data?.forEach((section) => map.set(section.id, section.name));
    return map;
  }, [sectionsQuery.data]);

  const filteredMembers = useMemo(() => {
    const list = membersQuery.data ?? [];
    return list.filter((member) => {
      const text = `${member.firstName} ${member.lastName} ${member.email}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" ? true : member.status === statusFilter;
      const matchesSection = sectionFilter === "all" ? true : member.sectionId === sectionFilter;
      return matchesSearch && matchesStatus && matchesSection;
    });
  }, [membersQuery.data, search, statusFilter, sectionFilter]);

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
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="Telephone" value={phone} onChange={(event) => setPhone(event.target.value)} fullWidth />
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
              <FormControl fullWidth>
                <InputLabel id="member-status">Statut</InputLabel>
                <Select
                  labelId="member-status"
                  label="Statut"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Member["status"])}
                >
                  <MenuItem value="pending">pending</MenuItem>
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="suspended">suspended</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Box>
              <Button
                variant="contained"
                onClick={() => createMutation.mutate()}
                disabled={!email || !firstName || !lastName || !sectionId || createMutation.isPending}
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
            Liste des membres
          </Typography>
          {membersQuery.isLoading ? <Skeleton height={120} /> : null}
          {!membersQuery.isLoading && filteredMembers.length === 0 ? (
            <Alert severity="info">Aucun membre trouve.</Alert>
          ) : null}
          {filteredMembers.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Email</TableCell>
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
                    <TableCell>{`${member.firstName} ${member.lastName}`}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{sectionLabel.get(member.sectionId ?? "") ?? "-"}</TableCell>
                    <TableCell>{member.contributionUpToDate ? "A jour" : "En retard"}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>{member.status}</TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => setEditingMember({ ...member })}>
                        Editer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const conditionsQuery = useQuery({
    queryKey: queryKeys.conditions,
    queryFn: fetchConditions,
  });
  const membersQuery = useQuery({ queryKey: queryKeys.members, queryFn: fetchMembers });
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Condition["type"]>("checkbox");
  const [validityDuration, setValidityDuration] = useState("0");
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [validationState, setValidationState] = useState<"valid" | "invalid">("valid");
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

  const validateMutation = useMutation({
    mutationFn: () =>
      callFunction("validateCondition", {
        memberId: selectedMember,
        conditionId: selectedCondition,
        validated: validationState === "valid",
        note,
      }),
    onSuccess: async () => {
      setError(null);
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["memberConditions", selectedMember] });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const conditionLabel = useMemo(() => {
    const map = new Map<string, string>();
    conditionsQuery.data?.forEach((condition) => map.set(condition.id, condition.name));
    return map;
  }, [conditionsQuery.data]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Conditions d'eligibilite</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Catalogue conditions</Typography>
            {role === "superadmin" ? (
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
              <Alert severity="info">Seul un superadmin peut creer/modifier le catalogue.</Alert>
            )}

            {conditionsQuery.isLoading ? <Skeleton height={120} /> : null}
            {(conditionsQuery.data?.length ?? 0) > 0 ? (
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
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={role !== "superadmin" || updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({
                              conditionId: condition.id,
                              updates: { isActive: !condition.isActive },
                            })
                          }
                        >
                          {condition.isActive ? "Desactiver" : "Activer"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                  {membersQuery.data?.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {`${member.firstName} ${member.lastName} - ${member.email}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="cond-condition">Condition</InputLabel>
                <Select
                  labelId="cond-condition"
                  label="Condition"
                  value={selectedCondition}
                  onChange={(event) => setSelectedCondition(event.target.value)}
                >
                  {conditionsQuery.data?.map((condition) => (
                    <MenuItem key={condition.id} value={condition.id}>
                      {condition.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="cond-state">Etat</InputLabel>
                <Select
                  labelId="cond-state"
                  label="Etat"
                  value={validationState}
                  onChange={(event) => setValidationState(event.target.value as "valid" | "invalid")}
                >
                  <MenuItem value="valid">Valider</MenuItem>
                  <MenuItem value="invalid">Invalider</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField label="Note" value={note} onChange={(event) => setNote(event.target.value)} fullWidth />
            <Box>
              <Button
                variant="contained"
                onClick={() => validateMutation.mutate()}
                disabled={validateMutation.isPending || !selectedMember || !selectedCondition}
              >
                Enregistrer la validation
              </Button>
            </Box>

            {(memberConditionsQuery.data?.length ?? 0) > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Condition</TableCell>
                    <TableCell>Etat</TableCell>
                    <TableCell>Expire le</TableCell>
                    <TableCell>Note</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {memberConditionsQuery.data?.map((item: MemberCondition) => (
                    <TableRow key={item.id}>
                      <TableCell>{conditionLabel.get(item.conditionId) ?? item.conditionId}</TableCell>
                      <TableCell>{item.validated ? "Validee" : "Invalide"}</TableCell>
                      <TableCell>
                        {item.expiresAt ? item.expiresAt.toDate().toLocaleDateString("fr-FR") : "-"}
                      </TableCell>
                      <TableCell>{item.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Alert severity="info">Aucune validation pour ce membre.</Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export function AdminContributionsPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const membersQuery = useQuery({ queryKey: queryKeys.members, queryFn: fetchMembers });
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
                  {membersQuery.data?.map((member) => (
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
          ) : null}
        </CardContent>
      </Card>
    </Stack>
  );
}

export function AdminElectionsPage() {
  const queryClient = useQueryClient();
  const electionsQuery = useQuery({ queryKey: queryKeys.elections, queryFn: fetchElections });
  const membersQuery = useQuery({ queryKey: queryKeys.members, queryFn: fetchMembers });
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
  const [candidateMemberId, setCandidateMemberId] = useState("");
  const [candidateBio, setCandidateBio] = useState("");

  const candidatesQuery = useQuery({
    queryKey: ["candidates", selectedElectionId],
    queryFn: () => fetchCandidates(selectedElectionId),
    enabled: Boolean(selectedElectionId),
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
        electionId: selectedElectionId,
        memberId: candidateMemberId,
        bio: candidateBio,
      }),
    onSuccess: async () => {
      setError(null);
      setCandidateMemberId("");
      setCandidateBio("");
      await queryClient.invalidateQueries({ queryKey: ["candidates", selectedElectionId] });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const openElectionMutation = useMutation({
    mutationFn: (electionId: string) => callFunction("openElection", { electionId }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.elections });
      await queryClient.invalidateQueries({ queryKey: ["candidates", selectedElectionId] });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const closeElectionMutation = useMutation({
    mutationFn: (electionId: string) => callFunction("closeElection", { electionId }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.elections });
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
      await queryClient.invalidateQueries({ queryKey: ["candidates", selectedElectionId] });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const removeCandidateMutation = useMutation({
    mutationFn: ({ electionId, candidateId }: { electionId: string; candidateId: string }) =>
      callFunction("removeCandidate", { electionId, candidateId }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["candidates", selectedElectionId] });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Elections</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

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

      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Liste des elections
          </Typography>
          {electionsQuery.isLoading ? <Skeleton height={120} /> : null}
          {(electionsQuery.data?.length ?? 0) > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Titre</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Ouverture</TableCell>
                  <TableCell>Cloture</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {electionsQuery.data?.map((election) => (
                  <TableRow key={election.id} selected={selectedElectionId === election.id}>
                    <TableCell>{election.title}</TableCell>
                    <TableCell>{election.status}</TableCell>
                    <TableCell>{election.startAt?.toDate().toLocaleString("fr-FR")}</TableCell>
                    <TableCell>{election.endAt?.toDate().toLocaleString("fr-FR")}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" variant="outlined" onClick={() => setSelectedElectionId(election.id)}>
                          Gerer
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openElectionMutation.mutate(election.id)}
                          disabled={election.status !== "draft" || openElectionMutation.isPending}
                        >
                          Ouvrir
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
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert severity="info">Aucune election configuree.</Alert>
          )}
        </CardContent>
      </Card>

      {selectedElectionId ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
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
                    {membersQuery.data?.map((member) => (
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
                <Button
                  variant="contained"
                  onClick={() => addCandidateMutation.mutate()}
                  disabled={!candidateMemberId || addCandidateMutation.isPending}
                >
                  Ajouter
                </Button>
              </Stack>

              {(candidatesQuery.data?.length ?? 0) > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Candidat</TableCell>
                      <TableCell>Section</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {candidatesQuery.data?.map((candidate: Candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell>{candidate.displayName}</TableCell>
                        <TableCell>{candidate.sectionName || "-"}</TableCell>
                        <TableCell>{candidate.status}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                validateCandidateMutation.mutate({
                                  electionId: selectedElectionId,
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
                                  electionId: selectedElectionId,
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
                                  electionId: selectedElectionId,
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
              ) : (
                <Alert severity="info">Aucun candidat sur cette election.</Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}

export function AdminLogsPage() {
  return <PlaceholderPage title="Logs" subtitle="Logs filtres selon role (M6)." />;
}

export function SuperAdminAdminsPage() {
  return (
    <PlaceholderPage
      title="Gestion admins"
      subtitle="Promotion/revocation roles admin/superadmin (M6)."
      actionLabel="Promouvoir"
    />
  );
}

export function SuperAdminAuditPage() {
  return <PlaceholderPage title="Audit confidentiel" subtitle="Break-glass superadmin avec motif obligatoire (M6)." />;
}
