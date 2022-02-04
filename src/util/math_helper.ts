/**
 * Takes a list of relative coordinates (in range [0-1]) and converts them to
 * absolute coordinates (in range [0 - (width - 1)] and [0 - (height - 1)]
 * respectively).
 */
export function MakeCoordsAbsolute(
  coords: number[][], 
  widthPx: number, 
  heightPx: number
): number[][] {
  const res = [];
  for (const c of coords) {
    res.push([ c[0] * (widthPx - 1), c[1] * (heightPx - 1) ]);
  }
  return res;
}

/**
 * Takes a list of absolute coordinates (in range [0 - (width - 1)] and
 * [0 - (height - 1)] respectively) and converts them to relative coordinates
 * (in range [0-1]).
 */
export function MakeCoordsRelative(
  coords: number[][], 
  widthPx: number, 
  heightPx: number
): number[][] {
  const res = [];
  for (const c of coords) {
    res.push([ c[0] / (widthPx - 1), c[1] / (heightPx - 1) ]);
  }
  return res;
}

/**
 * Computes l2 norm of given vector.
 */
export function ComputeL2Norm(a: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; ++i) {
    sum += Math.pow(a[i], 2);
  }
  const norm = Math.sqrt(sum);
  return norm;
}

/**
 * Returns |v1 - v2|_2
 */
export function ComputeDistanceBetweenVectors(
  v1: number[], 
  v2: number[]
): number {
  return ComputeL2Norm(SubtractVectors(v1, v2));
}

/**
 * Computes a - b elementwise.
 */
export function SubtractVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length)
    throw 'Unequal length vectors';

  const res = [];
  for (let i = 0; i < a.length; ++i) {
    res.push(a[i] - b[i]);
  }
  return res;
}

/**
 * Calculates a * b element wise.
 */
export function MultiplyVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length)
    throw 'Unequal length vectors';

  const res = [];
  for (let i = 0; i < a.length; ++i) {
    res.push(a[i] * b[i]);
  }
  return res;
}

/**
 * Returns a scaled to unit vector.
 */
export function NormalizeVector(a: number[]): number[] {
  const norm = ComputeL2Norm(a);

  const res = [];
  for (let i = 0; i < a.length; ++i) {
    res.push(a[i] / norm);
  }
  return res;
}

/**
 * Calculates a / b element wise.
 */
export function DivideVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length)
    throw 'Unequal length vectors';

  const res = [];
  for (let i = 0; i < a.length; ++i) {
    res.push(a[i] / b[i]);
  }
  return res;
}

/**
 * Calculates a + b element wise.
 */
export function AddVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length)
    throw 'Unequal length vectors';

  const res = [];
  for (let i = 0; i < a.length; ++i) {
    res.push(a[i] + b[i]);
  }
  return res;
}

export class AspectRatioAwareRotation {
  private rotationCenter_: number[];
  private rotationInRadians_: number; 
  private aspectRatio_: number[]; 
  private aspectRatioAwareRotationCenter_: number[];
  private rotMat_: number[][];
  private reverseRotMat_: number[][];

  // - rotationCenter uses coords in relative units (range [0-1]).
  // - rotationInRadians: positive = clock-wise rotation.
  // - aspectRatio: 2D array with the aspect ratio ([width, height])
  constructor(
    rotationCenter: number[], 
    rotationInRadians: number,
    aspectRatio: number[]
  ) {
    this.rotationCenter_ = rotationCenter;
    this.rotationInRadians_ = rotationInRadians;
    this.aspectRatio_ = aspectRatio;

    this.aspectRatioAwareRotationCenter_ = null;
    this.rotMat_ = null;
    this.reverseRotMat_ = null;

    this.Initialize_();
  }

  // Note about internals:
  // Idea is to take relative unit coords (range [0, 1]) and scale them such
  // that y coordinate always remains relative unit coord and x coordinate is
  // adjusted to match the aspect ratio.
  private Initialize_() {
    // Compute aspect ratio aware center.
    const maxX = this.aspectRatio_[0] / this.aspectRatio_[1];
    // Note that y coord stays unchanged since we don't apply any scaling to y
    // coord.
    this.aspectRatioAwareRotationCenter_ =
        [ this.rotationCenter_[0] * maxX, this.rotationCenter_[1] ];

    this.rotMat_ = ComputeRotationMatrix2D(
      this.aspectRatioAwareRotationCenter_,
      -RadiansToDegrees(
        this.rotationInRadians_
      ), 
      1.0
    );
    this.reverseRotMat_ = ComputeRotationMatrix2D(
      this.aspectRatioAwareRotationCenter_, 
      RadiansToDegrees(this.rotationInRadians_), 
      1.0
    );
  }

  // Takes relative coords (range [0-1]), applies rotation and returns relative
  // coords.
  Apply(coords: number[][]): number[][] {
    return this.ApplyInternal_(coords, false);
  }

  // Takes relative coords (range [0-1]), applies reverse rotation and returns
  // relative coords.
  ApplyReverse(coords: number[][]): number[][] {
    return this.ApplyInternal_(coords, true);
  }

  // Takes relative coords (range [0-1]), applies rotation and returns relative
  // coords.
  ApplyInternal_(coords: number[][], reverse: boolean): number[][] {
    const maxX = this.aspectRatio_[0] / this.aspectRatio_[1];
    // Apply aspect ratio scaling.
    const aspectRatioAwareCoords = [];
    for (const c of coords) {
      const nc = MultiplyVectors(c, [ maxX, 1.0 ]);
      aspectRatioAwareCoords.push(nc);
    }
    const mat = reverse ? this.reverseRotMat_ : this.rotMat_;
    const rotatedCoords = Apply2DRotMatTo2DVecs(mat, aspectRatioAwareCoords);

    const finalCoords = [];
    for (const c of rotatedCoords) {
      const nc = DivideVectors(c, [ maxX, 1.0 ]);
      finalCoords.push(nc);
    }
    return finalCoords;
  }
}

/**
 * Implements
 * https://docs.opencv.org/3.4/da/d54/group__imgproc__transform.html#gafbbc470ce83812914a70abfb604f4326
 */
export function ComputeRotationMatrix2D(
  center: number[], 
  angleInDegrees: number, 
  scale: number
): number[][] {
  const res = [ [ 0, 0, 0 ], [ 0, 0, 0 ] ];
  const rotationInRadians = DegreesToRadians(angleInDegrees);
  const cosAngle = Math.cos(rotationInRadians);
  const sinAngle = Math.sin(rotationInRadians);
  const alpha = scale * cosAngle;
  const beta = scale * sinAngle;

  res[0][0] = alpha;
  res[0][1] = beta;
  res[0][2] = (1 - alpha) * center[0] - beta * center[1];
  res[1][0] = -beta;
  res[1][1] = alpha;
  res[1][2] = beta * center[0] + (1 - alpha) * center[1];

  return res;
}

export function DegreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function RadiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

export function Apply2DRotMatTo2DVec(m: number[][], v: number[]) {
  v = [ v[0], v[1], 1 ];
  return MatVecMul(m, v);
}

/**
 * Applys matrix m on vector v.
 */
function MatVecMul(m: number[][], v: number[]) {
  if (m.length === 0) throw 'empty matrix';
  if (m[0].length === 0) throw 'empty matrix';
  if (m[0].length !== v.length) throw 'matrix dimension mismatch';
  const res = [];
  for (let i = 0; i < m.length; ++i) {
    let sum = 0;
    for (let j = 0; j < m[0].length; ++j) {
      sum += m[i][j] * v[j];
    }
    res.push(sum);
  }
  return res;
}

/**
 * Applys matrix m on vectors v.
 */
function Apply2DRotMatTo2DVecs(m: number[][], v: number[][]) {
  const newCoords = [];
  for (const c of v) {
    newCoords.push(Apply2DRotMatTo2DVec(m, c));
  }
  return newCoords;
}

export interface IExtremumCoords {
  minX: number[]
  maxX: number[]
  minY: number[]
  maxY: number[]
}

export function ComputeExtremumCoords(coords: number[][]): IExtremumCoords {
  let minX = null;
  let maxX = null;
  let minY = null;
  let maxY = null;
  for (const c of coords) {
    if (minX === null) {
      minX = c;
      maxX = c;
      minY = c;
      maxY = c;
      continue;
    }
    if (c[0] < minX[0]) {
      minX = c;
    }
    if (c[1] < minY[1]) {
      minY = c;
    }
    if (c[0] > maxX[0]) {
      maxX = c;
    }
    if (c[1] > maxY[1]) {
      maxY = c;
    }
  }
  return {minX, maxX, minY, maxY};
}

export function FlipCoordsHorizontally(coords: number[][]): number[][] {
  const res = [];
  for (const c of coords) {
    res.push([ 1 - c[0], c[1] ]);
  }
  return res;
}

export function CoordsOutsideBox(
  box: number[][], 
  coords: number[][]
): number[][] {
  if (box.length !== 2) {
    throw 'Wrong box dimension';
  }
  const boxWidth = box[1][0] - box[0][0];
  const boxHeight = box[1][1] - box[0][1];
  const newCoords = [];
  for (const c of coords) {
    newCoords.push(
      [ box[0][0] + c[0] * boxWidth, box[0][1] + c[1] * boxHeight ]
    );
  }
  return newCoords;
}

export function CoordsInsideBox(
  box: number[][], 
  coords: number[][]
): number[][] {
  if (box.length !== 2) {
    throw 'Wrong box dimension';
  }
  const newCoords = [];
  const boxWidth = box[1][0] - box[0][0];
  const boxHeight = box[1][1] - box[0][1];
  const xPadding = 1 - boxWidth;
  const yPadding = 1 - boxHeight;
  const adj = (v: number, origin: number, totalPadding: number) => {
    return (v - origin) * (1 / (1 - totalPadding));
  };
  for (const c of coords) {
    newCoords.push(
      [ adj(c[0], box[0][0], xPadding), adj(c[1], box[0][1], yPadding) ]
    );
  }
  return newCoords;
}
