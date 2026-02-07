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
import { fetchMembers, fetchSections } from "../api/firestoreQueries";
import { useAuth } from "../hooks/useAuth";
import type { Member, Section } from "../types/models";

type PlaceholderPageProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  loading?: boolean;
};

const queryKeys = {
  sections: ["sections"] as const,
  members: ["members"] as const,
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
  return (
    <PlaceholderPage
      title="Mon eligibilite"
      subtitle="Checklist eligibilite detaillee (M3)."
      actionLabel="Contacter admin"
    />
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

export function AdminContributionsPage() {
  return (
    <PlaceholderPage
      title="Cotisations"
      subtitle="Politique + paiements append-only (M2)."
      actionLabel="Configurer la politique"
    />
  );
}

export function AdminElectionsPage() {
  return (
    <PlaceholderPage title="Elections" subtitle="Wizard election et candidats (M4)." actionLabel="Creer une election" />
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
