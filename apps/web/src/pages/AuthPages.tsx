import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link as RouterLink, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { callFunction, getErrorMessage } from "../api/callables";
import { useAuth } from "../hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe minimum 8 caracteres"),
});

const registerSchema = z
  .object({
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "Mot de passe minimum 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirmation requise"),
    firstName: z.string().min(1, "Prenom requis"),
    lastName: z.string().min(1, "Nom requis"),
    city: z.string().min(1, "Ville requise"),
    phone: z.string().min(1, "Telephone requis"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type PublicSection = { id: string; name: string; city: string; region?: string };

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setError(null);
      await signIn(values.email, values.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message || "Connexion impossible");
    }
  });

  return (
    <Stack component="form" spacing={2} onSubmit={onSubmit}>
      <Typography variant="h5">Connexion</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TextField
        label="Email"
        type="email"
        {...register("email")}
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
      />
      <TextField
        label="Mot de passe"
        type="password"
        {...register("password")}
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
      />
      <Button type="submit" variant="contained" disabled={isSubmitting}>
        Se connecter
      </Button>
      <Button component={RouterLink} to="/auth/register" variant="text">
        Creer un compte
      </Button>
    </Stack>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState("");
  const sectionsQuery = useQuery({
    queryKey: ["publicSections"],
    queryFn: async () =>
      (await callFunction<Record<string, never>, { sections: PublicSection[] }>("listPublicSections", {})).sections,
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setError(null);
      setSuccess(null);
      await signUp({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        city: values.city,
        phone: values.phone,
        sectionId: sectionId.trim() || undefined,
      });
      setSuccess("Compte cree. Email de verification envoye.");
      navigate("/verify-email", { replace: true });
    } catch (err) {
      setError((err as Error).message || "Inscription impossible");
    }
  });

  return (
    <Stack component="form" spacing={2} onSubmit={onSubmit}>
      <Typography variant="h5">Inscription</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
      {sectionsQuery.error ? <Alert severity="warning">{getErrorMessage(sectionsQuery.error)}</Alert> : null}
      <TextField
        label="Prenom"
        {...register("firstName")}
        error={Boolean(errors.firstName)}
        helperText={errors.firstName?.message}
      />
      <TextField
        label="Nom"
        {...register("lastName")}
        error={Boolean(errors.lastName)}
        helperText={errors.lastName?.message}
      />
      <TextField label="Ville" {...register("city")} error={Boolean(errors.city)} helperText={errors.city?.message} />
      <TextField
        label="Telephone"
        {...register("phone")}
        error={Boolean(errors.phone)}
        helperText={errors.phone?.message}
      />
      <FormControl fullWidth>
        <InputLabel id="register-section">Section (optionnel)</InputLabel>
        <Select
          labelId="register-section"
          label="Section (optionnel)"
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value)}
        >
          <MenuItem value="">
            <em>Aucune section</em>
          </MenuItem>
          {sectionsQuery.data?.map((section) => (
            <MenuItem key={section.id} value={section.id}>
              {`${section.name} (${section.city})`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Email"
        type="email"
        {...register("email")}
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
      />
      <TextField
        label="Mot de passe"
        type="password"
        {...register("password")}
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
      />
      <TextField
        label="Confirmer mot de passe"
        type="password"
        {...register("confirmPassword")}
        error={Boolean(errors.confirmPassword)}
        helperText={errors.confirmPassword?.message}
      />
      <Button type="submit" variant="contained" disabled={isSubmitting}>
        Creer mon compte
      </Button>
      <Button component={RouterLink} to="/auth/login" variant="text">
        J'ai deja un compte
      </Button>
    </Stack>
  );
}

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { user, sendVerification, signOutUser, refreshAuthState } = useAuth();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Verification email</Typography>
      <Typography color="text.secondary">
        Verifiez votre boite mail puis cliquez sur le bouton de confirmation.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Compte: {user?.email}
      </Typography>
      {message ? <Alert severity="success">{message}</Alert> : null}
      <Button
        variant="contained"
        onClick={async () => {
          await refreshAuthState();
          navigate("/", { replace: true });
        }}
      >
        J'ai verifie mon email
      </Button>
      <Button
        variant="outlined"
        onClick={async () => {
          await sendVerification();
          setMessage("Email de verification renvoye.");
        }}
      >
        Renvoyer l'email
      </Button>
      <Button
        variant="text"
        onClick={async () => {
          await signOutUser();
          navigate("/auth/login", { replace: true });
        }}
      >
        Se deconnecter
      </Button>
    </Stack>
  );
}

export function PendingApprovalPage() {
  const navigate = useNavigate();
  const { user, profile, role, signOutUser, refreshAuthState } = useAuth();
  const [firstName, setFirstName] = useState<string | undefined>(undefined);
  const [lastName, setLastName] = useState<string | undefined>(undefined);
  const [city, setCity] = useState<string | undefined>(undefined);
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [sectionId, setSectionId] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sectionsQuery = useQuery({
    queryKey: ["publicSections"],
    queryFn: async () =>
      (await callFunction<Record<string, never>, { sections: PublicSection[] }>("listPublicSections", {})).sections,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Utilisateur non connecte");
      await callFunction("updateMember", {
        memberId: user.uid,
        updates: {
          firstName: (firstName ?? profile?.firstName ?? "").trim(),
          lastName: (lastName ?? profile?.lastName ?? "").trim(),
          city: (city ?? profile?.city ?? "").trim(),
          phone: (phone ?? profile?.phone ?? "").trim(),
          sectionId: (sectionId ?? profile?.sectionId ?? "").trim(),
        },
      });
    },
    onSuccess: async () => {
      setError(null);
      setMessage("Profil enregistre. Votre demande reste en attente de validation admin.");
      await refreshAuthState();
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(getErrorMessage(mutationError));
    },
  });

  if (!user) return <Navigate to="/auth/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (role === "admin" || role === "superadmin") return <Navigate to="/admin" replace />;
  if (profile?.status === "active") return <Navigate to="/member" replace />;

  const firstNameValue = firstName ?? profile?.firstName ?? "";
  const lastNameValue = lastName ?? profile?.lastName ?? "";
  const cityValue = city ?? profile?.city ?? "";
  const phoneValue = phone ?? profile?.phone ?? "";
  const sectionValue = sectionId ?? profile?.sectionId ?? "";
  const suspended = profile?.status === "suspended";

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{suspended ? "Inscription refusee / compte suspendu" : "Inscription en attente"}</Typography>
      <Alert severity={suspended ? "error" : "warning"}>
        {suspended
          ? "Votre compte a ete refuse ou suspendu. Contactez un administrateur pour plus d'informations."
          : "Votre compte est en attente de validation par un administrateur. Vous ne pouvez pas encore acceder aux ecrans membres."}
      </Alert>
      {message ? <Alert severity="success">{message}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Typography variant="subtitle1">Completer mon dossier</Typography>
      <TextField label="Prenom" value={firstNameValue} onChange={(event) => setFirstName(event.target.value)} />
      <TextField label="Nom" value={lastNameValue} onChange={(event) => setLastName(event.target.value)} />
      <TextField label="Ville" value={cityValue} onChange={(event) => setCity(event.target.value)} />
      <TextField label="Telephone" value={phoneValue} onChange={(event) => setPhone(event.target.value)} />
      <FormControl fullWidth>
        <InputLabel id="pending-section">Section (optionnel)</InputLabel>
        <Select
          labelId="pending-section"
          label="Section (optionnel)"
          value={sectionValue}
          onChange={(event) => setSectionId(event.target.value)}
        >
          <MenuItem value="">
            <em>Aucune section</em>
          </MenuItem>
          {sectionsQuery.data?.map((section) => (
            <MenuItem key={section.id} value={section.id}>
              {`${section.name} (${section.city})`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        variant="contained"
        onClick={() => updateProfileMutation.mutate()}
        disabled={updateProfileMutation.isPending}
      >
        Enregistrer mon profil
      </Button>
      <Button
        variant="outlined"
        onClick={async () => {
          await refreshAuthState();
        }}
      >
        Verifier mon statut
      </Button>
      <Button
        variant="text"
        onClick={async () => {
          await signOutUser();
          navigate("/auth/login", { replace: true });
        }}
      >
        Se deconnecter
      </Button>
    </Stack>
  );
}
