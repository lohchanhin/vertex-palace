export async function login(email: string, password: string) {
  return { email, password, refreshToken: "refresh" };
}
