export function createSession(userId: string) {
  return {
    userId,
    createdAt: new Date().toISOString()
  };
}
