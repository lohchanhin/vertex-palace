export class PaymentService {
  async authorize(accountId: string, amount: number): Promise<boolean> {
    return accountId.length > 0 && amount > 0;
  }
}
