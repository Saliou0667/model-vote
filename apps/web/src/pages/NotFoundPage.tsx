import { Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Stack spacing={2} alignItems="start">
      <Typography variant="h4">Page introuvable</Typography>
      <Typography color="text.secondary">La route demandee n'existe pas.</Typography>
      <Button variant="contained" onClick={() => navigate("/")}>
        Retour a l'accueil
      </Button>
    </Stack>
  );
}
