export class ExponentialMovingAverage {
  private alpha_: number;
  private curValue_: number;

  constructor(alpha: number) {
    this.alpha_ = alpha;
  }

  Add(value: number) : number {
    if (this.curValue_ === undefined || this.curValue_ === null) {
      this.curValue_ = value;
    } else {
      this.curValue_ = this.curValue_ * (1 - this.alpha_) + value * this.alpha_;
    }
    return this.curValue_;
  }

  Get() : number {
    return this.curValue_;
  }
}
