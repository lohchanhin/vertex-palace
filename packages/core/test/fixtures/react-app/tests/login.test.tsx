import { login } from "../src/api/auth";

it("logs in", async () => {
  await expect(login("a@example.com", "secret")).resolves.toHaveProperty("refreshToken");
});
