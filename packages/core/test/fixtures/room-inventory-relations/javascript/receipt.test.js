import { jsBuildReceipt } from "./receipt.js";

export function testJsBuildReceipt() {
  return jsBuildReceipt("ok") === "receipt:ok";
}
