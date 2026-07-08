import { AuthController } from "../src/controllers/auth.controller";

describe("auth login", () => {
  it("returns refresh token", async () => {
    const controller = new AuthController();
    const result = await controller.login("a@example.com", "secret");
    expect(result.refreshToken).toContain("refresh:");
  });
});
