import * as MathUtil from '../../util/math_helper'

/**
 * Holds information on how to transform a frame into another frame by applying
 * horizontal flip, rotation, crop.
 */
export interface IPreprocInfo {
  rotationCenter: number[]
  rotationInRadians: number
  topLeft: number[]
  bottomRight: number[]
  flip: boolean
}

/**
 * Given coordinates from the box model, compute image transformation information that can be used
 * to transform the frame for analysis with the landmark model.
 * @param coords - The result coordinates of the box model.
 * @param ar - [width, height] of the original frame.
 * @param slack - Specifies the amount of slack to add around the hand when cropping the next frame 
 * to account for movement of the hand in unknown direction.
 * slack of 1 means 100% of the box' width and height are added as slack around the hand.
 * Changing this value requires changes in the underlying models.
 */
export function ComputePreprocInfoFromBoxCoords(
    coords: number[][], ar: number[], slack: number): IPreprocInfo {
  if (coords.length !== 6) throw 'wrong num coords'
  const rotCalc = new SixPointRotationCalculation(coords[0], coords[1], ar);
  const rotationInRadians = rotCalc.GetRotationInRadians();

  const extremumCoords = [coords[2], coords[3], coords[4], coords[5]];

  const rotationCenter = MathUtil.DivideVectors(
      MathUtil.AddVectors(coords[0], coords[1]), [ 2.0, 2.0 ]);

  const araRot = new MathUtil.AspectRatioAwareRotation(
      rotationCenter, rotationInRadians, ar);
  const rotatedExtremumCoords = araRot.Apply(extremumCoords);

  let topLeftBottomRight = ComputeTopLeftBottomRightFromExtremumCoords(rotatedExtremumCoords);
  topLeftBottomRight = AddBoxSlack(coords, topLeftBottomRight, ar, slack);
  return {
    topLeft: topLeftBottomRight[0],
    bottomRight: topLeftBottomRight[1],
    rotationInRadians,
    rotationCenter,
    flip: false,
  };
}

function AddBoxSlack(boxCoords: number[][], topLeftBottomRight: number[][], ar: number[], slack: number) {
  const absCoords = MathUtil.MakeCoordsAbsolute(boxCoords, ar[0], ar[1]);
  const slackPx = MathUtil.ComputeDistanceBetweenVectors(absCoords[0], absCoords[1]) * slack;

  topLeftBottomRight = JSON.parse(JSON.stringify(topLeftBottomRight));
  topLeftBottomRight[0][0] -= slackPx / ar[0];
  topLeftBottomRight[1][0] += slackPx / ar[0];
  topLeftBottomRight[0][1] -= slackPx / ar[1];
  topLeftBottomRight[1][1] += slackPx / ar[1];
  return topLeftBottomRight;
}

/**
 * Similar to {@link CommputePreprocInfoFromBoxCoords}.
 */
export function ComputePreprocInfoFromLanCoords(
    coords: number[][], ar: number[], slack: number): IPreprocInfo {
  const palmBottom = coords[20]
  const palmTop = coords[5];

  const rotationCenter = MathUtil.DivideVectors(
      MathUtil.AddVectors(palmBottom, palmTop), [ 2.0, 2.0 ]);
  const rotCalc = new SixPointRotationCalculation(palmBottom, palmTop, ar);
  const rotationInRadians = rotCalc.GetRotationInRadians();

  const araRot = new MathUtil.AspectRatioAwareRotation(
      rotationCenter, rotationInRadians, ar);
  const rotatedCoords = araRot.Apply(coords);

  const ec = MathUtil.ComputeExtremumCoords(rotatedCoords);
  const ecArray = [ec.minX, ec.maxX, ec.minY, ec.maxY];

  let topLeftBottomRight = ComputeTopLeftBottomRightFromExtremumCoords(ecArray);
  topLeftBottomRight = AddLanSlack(topLeftBottomRight, ar, slack, coords);
  return {
    topLeft: topLeftBottomRight[0],
    bottomRight: topLeftBottomRight[1],
    rotationInRadians,
    rotationCenter,
    flip: false,
  };
}

function AddLanSlack(topLeftBottomRight: number[][], ar: number[],
                     slack: number, coords: number[][]): number[][] {
  const distances = [];
  const absCoords = MathUtil.MakeCoordsAbsolute(coords, ar[0], ar[1]);
  distances.push(MathUtil.ComputeDistanceBetweenVectors(absCoords[20], absCoords[16]));
  distances.push(MathUtil.ComputeDistanceBetweenVectors(absCoords[20], absCoords[1]));
  distances.push(MathUtil.ComputeDistanceBetweenVectors(absCoords[20], absCoords[5]));
  distances.push(MathUtil.ComputeDistanceBetweenVectors(absCoords[20], absCoords[9]));
  distances.push(MathUtil.ComputeDistanceBetweenVectors(absCoords[20], absCoords[13]));

  distances.push(MathUtil.ComputeDistanceBetweenVectors(absCoords[13], absCoords[1]));

  let maxDistance = -1;
  // Get max distance.
  for (const d of distances) {
    maxDistance = Math.max(maxDistance, d);
  }

  const slackPx = slack * maxDistance;

  topLeftBottomRight = JSON.parse(JSON.stringify(topLeftBottomRight));
  topLeftBottomRight[0][0] -= slackPx / ar[0];
  topLeftBottomRight[1][0] += slackPx / ar[0];
  topLeftBottomRight[0][1] -= slackPx / ar[1];
  topLeftBottomRight[1][1] += slackPx / ar[1];
  return topLeftBottomRight;
}

// extremumCoords [minX, maxX, minY, maxY]
function ComputeTopLeftBottomRightFromExtremumCoords(extremumCoords: number[][]) : number[][]{
  const topLeft = [extremumCoords[0][0], extremumCoords[2][1]];
  const bottomRight = [extremumCoords[1][0], extremumCoords[3][1]];
  return [topLeft, bottomRight]
}

export class SixPointRotationCalculation {
  private palmBottom_: number[]
  private palmTop_: number[]
  private aspectRatio_: number[]
  private palmLine_: number[]
  private normalizedPalmLine_: number[]
  private mainJointLine_: number[]
  private rotationInRadians_: number

  constructor(palmBottom: number[], palmTop: number[], aspectRatio: number[]) {
    this.palmBottom_ = palmBottom;
    this.palmTop_ = palmTop;
    this.aspectRatio_ = aspectRatio;

    // The vector from palmBottom to palmTop (assumes origin top left).
    this.palmLine_ = null;
    // this.palmLine_ scaled to unit vector.
    this.normalizedPalmLine_ = null;
    // Orthogonal unit vector to palmLine_ going from left to right.
    this.mainJointLine_ = null;
    // Rotation of hand in radians. Positive value means clock-wise rotation.
    this.rotationInRadians_ = null;

    this.Initialize_();
  }

  GetRotationInRadians() : number {
    return this.rotationInRadians_;
  }

  private Initialize_() {
    this.AdjustForAspectRatio_();
    this.ComputePalmLine_();
    this.ComputeMainJointLine_();
    this.ComputeRotation_();
  }

  private AdjustForAspectRatio_() {
    const maxX = this.aspectRatio_[0] / this.aspectRatio_[1];
    this.palmTop_ = MathUtil.MultiplyVectors(this.palmTop_, [maxX, 1.0]);
    this.palmBottom_ = MathUtil.MultiplyVectors(this.palmBottom_, [maxX, 1.0]);
  }

  private ComputePalmLine_() {
    this.palmLine_ = MathUtil.SubtractVectors(this.palmTop_, this.palmBottom_)
    this.normalizedPalmLine_ = MathUtil.NormalizeVector(this.palmLine_);
  }

  private ComputeMainJointLine_() {
    this.mainJointLine_ =
        [ -this.normalizedPalmLine_[1], this.normalizedPalmLine_[0] ];
  }

  private ComputeRotation_() {
    // Coords have y axis flipped, for calculating atan2 we need to invert this.
    const carthesianMainJointLine = [this.mainJointLine_[0], -this.mainJointLine_[1]]
    this.rotationInRadians_ = Math.atan2(carthesianMainJointLine[1], carthesianMainJointLine[0]);
  }
}
