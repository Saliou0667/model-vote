import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1565C0",
      dark: "#0D47A1",
    },
    secondary: {
      main: "#FF8F00",
      dark: "#EF6C00",
    },
    background: {
      default: "#F5F7FB",
      paper: "#FFFFFF",
    },
    success: { main: "#2E7D32" },
    error: { main: "#C62828" },
    warning: { main: "#F9A825" },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: "'Montserrat', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
});
