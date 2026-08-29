export function tsComputeInvoice(total: number): number {
  return total * 2;
}

export function tsBuildInvoice(total: number): number {
  return tsComputeInvoice(total);
}

export class TsInvoiceService {
  calculate(total: number): boolean {
    return total > 0;
  }
}

class TsPrimary {
  resolve(): number {
    return 1;
  }
}

class TsSecondary {
  resolve(): number {
    return 2;
  }
}

export function tsUseResolver(resolve: () => number): number {
  return resolve();
}
