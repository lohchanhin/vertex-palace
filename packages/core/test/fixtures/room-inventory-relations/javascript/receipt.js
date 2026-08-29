export function jsFormatReceipt(value) {
  return `receipt:${value}`;
}

export function jsBuildReceipt(value) {
  return jsFormatReceipt(value);
}

export class JsReceiptService {
  render(value) {
    return value !== "";
  }
}

class JsPrimary {
  resolve() {
    return 1;
  }
}

class JsSecondary {
  resolve() {
    return 2;
  }
}

export function jsUseResolver(resolve) {
  return resolve();
}
