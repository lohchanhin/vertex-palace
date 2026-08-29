import { tsBuildInvoice } from "./invoice";

export function testTsBuildInvoice(): boolean {
  return tsBuildInvoice(5) === 10;
}
