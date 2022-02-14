export function IsWebglOneOrTwoAvailable() : boolean {
  return IsWebglOneAvailable() || IsWebglTwoAvailable();
}

export function IsWebglTwoAvailable() : boolean {
  return !!document.createElement('canvas').getContext('webgl2');
}

export function IsWebglOneAvailable() : boolean {
  return !!document.createElement('canvas').getContext('webgl');
}

