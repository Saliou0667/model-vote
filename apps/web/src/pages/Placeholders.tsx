import { Button, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";

type PlaceholderPageProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  loading?: boolean;
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
  return <PlaceholderPage title="Accueil membre" subtitle="Vue globale membre et election active." loading />;
}

export function MemberProfilePage() {
  return <PlaceholderPage title="Mon profil" subtitle="Edition du profil membre (M1)." actionLabel="Mettre a jour" />;
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
  return <PlaceholderPage title="Dashboard admin" subtitle="KPIs, alertes, actions recentes." loading />;
}

export function AdminMembersPage() {
  return (
    <PlaceholderPage
      title="Membres"
      subtitle="Table filtres/recherche/pagination (M1)."
      actionLabel="Ajouter un membre"
    />
  );
}

export function AdminSectionsPage() {
  return <PlaceholderPage title="Sections" subtitle="CRUD sections (M1)." actionLabel="Creer une section" />;
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
