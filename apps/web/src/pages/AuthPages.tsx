import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { httpsCallable } from "firebase/functions";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { z } from "zod";
import { functions } from "../config/firebase";
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
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setError(null);
      setSuccess(null);
      await signUp(values.email, values.password);
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runBootstrap = async () => {
    try {
      setError(null);
      setMessage(null);
      setBusy(true);
      const callable = httpsCallable(functions, "bootstrapRole");
      await callable();
      await refreshAuthState();
      setMessage("Bootstrap superadmin applique. Relancez la session.");
    } catch (err) {
      setError((err as Error).message || "Bootstrap indisponible");
    } finally {
      setBusy(false);
    }
  };

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
      {error ? <Alert severity="error">{error}</Alert> : null}
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
      <Button variant="outlined" onClick={runBootstrap} disabled={busy}>
        Activer bootstrap superadmin
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
