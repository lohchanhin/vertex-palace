export type User = {
  id: string;
  email: string;
};

export class AuthService {
  async validateUser(email: string, password: string): Promise<User> {
    if (!email || !password) {
      throw new Error("Missing credentials");
    }
    return { id: "user_123", email };
  }
}
