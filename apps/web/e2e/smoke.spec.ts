import { expect, test } from "@playwright/test";

test("authentication pages render and navigate", async ({ page }) => {
  await page.goto("/auth/login");

  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();

  await page.getByRole("link", { name: "Creer un compte" }).click();
  await expect(page).toHaveURL(/\/auth\/register$/);
  await expect(page.getByRole("heading", { name: "Inscription" })).toBeVisible();
});
