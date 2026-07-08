import { login } from "../api/auth";

export function LoginForm() {
  return <button onClick={() => login("a@example.com", "secret")}>Login</button>;
}
