export function IsWebGLOneOrTwoAvailable() : boolean {
  return IsWebGLOneAvailable() || IsWebGLTwoAvailable();
}

export function IsWebGLTwoAvailable() : boolean {
  return !!document.createElement('canvas').getContext('webgl2');
}

export function IsWebGLOneAvailable() : boolean {
  return !!document.createElement('canvas').getContext('webgl');
}

