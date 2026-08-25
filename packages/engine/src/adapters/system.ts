import type { ClockPort, IdGeneratorPort } from "../ports/index.js";

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}

export class UlidLikeIdGenerator implements IdGeneratorPort {
  private counter = 0;
  constructor(private readonly prefix = "id") {}
  next(): string {
    // P0: prefix + timestamp + monotonic suffix. Real ULIDs land with a
    // future storage feature; determinism matters more right now.
    this.counter += 1;
    const ts = Date.now().toString(36);
    return `${this.prefix}_${ts}_${this.counter.toString(36)}`;
  }
}
