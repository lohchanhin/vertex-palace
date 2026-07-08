export class TokenService {
  generateAccessToken(userId: string): string {
    return `access:${userId}`;
  }

  generateRefreshToken(userId: string): string {
    return `refresh:${userId}`;
  }
}
