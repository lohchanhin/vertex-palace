import { AuthService } from "../services/auth.service";
import { TokenService } from "../services/token.service";

export class AuthController {
  constructor(
    private readonly authService = new AuthService(),
    private readonly tokenService = new TokenService()
  ) {}

  async login(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);
    const accessToken = this.tokenService.generateAccessToken(user.id);
    const refreshToken = this.tokenService.generateRefreshToken(user.id);
    return { user, accessToken, refreshToken };
  }
}
