/**
 * Takes a list of relative coordinates (in range [0-1]) and converts them to
 * absolute coordinates (in range [0 - (width - 1)] and [0 - (height - 1)] respectively).
 */
export function MakeCoordsAbsolute(coords: number[][], widthPx: number, heightPx: number) : number[][]{
  const res = [];
  for (const c of coords) {
    res.push([c[0] * (widthPx - 1), c[1] * (heightPx - 1)]);
  }
  return res;
}

/**
 * Takes a list of absolute coordinates (in range [0 - (width - 1)] and 
 * [0 - (height - 1)] respectively) and converts them to relative coordinates (in
 * range [0-1]).
 */
export function MakeCoordsRelative(coords: number[][], widthPx: number, heightPx: number) : number[][]{
  const res = [];
  for (const c of coords) {
    res.push([c[0] / (widthPx - 1), c[1] / (heightPx - 1)]);
  }
  return res;
}

/**
 * Computes l2 norm of given vector. 
 */
export function ComputeL2Norm(a: number[]) : number {
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
export function ComputeDistanceBetweenVectors(v1: number[], v2: number[]) : number {
  return ComputeL2Norm(SubtractVectors(v1, v2));
}

/**
 * Computes a - b elementwise.
 */
export function SubtractVectors(a: number[], b: number[]) : number []{
  if (a.length !== b.length) throw 'Unequal length vectors';

  const res = [];
  for (let i = 0; i < a.length; ++i) {
    res.push(a[i] - b[i]);
  }
  return res;
}

