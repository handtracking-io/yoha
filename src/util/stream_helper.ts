/**
 * @public
 */
export interface IResolution {
  width: number
  height: number
}


/**
 * @public
 */
export function CreateVideoElementFromStream(stream: MediaStream) : HTMLVideoElement {
  const video = document.createElement('video');
  const {width, height} = GetStreamDimensions(stream);
  video.srcObject = stream;
  video.width = width;
  video.height = height;
  video.setAttribute('autoplay', "");
  return video;
}

/**
 * @public
 */
export function GetStreamDimensions(stream: MediaStream) : IResolution {
  return {
    width: stream.getVideoTracks()[0].getSettings().width,
    height: stream.getVideoTracks()[0].getSettings().height,
  }
}

/**
 * @public
 */
export function ScaleResolutionToWidth(
  resolution: IResolution,
  width: number) : IResolution {
  const cw = resolution.width;
  const ch = resolution.height;
  const tw = width;
    
  return {
    width: tw,
    height: ch / (cw / tw),
  };
}

/**
 * @public
 */
export function ScaleResolutionToHeight(
  resolution: IResolution,
  height: number) : IResolution {
  const cw = resolution.width;
  const ch = resolution.height;
  const th = height;

  return {
    width: cw / (ch / th),
    height: th,
  }
}

/**
 * @public
 */
export function ScaleResolutionDown(
  resolution: IResolution,
  upperResolutionLimit: IResolution) : IResolution {
  const res = resolution;
  const uRes = upperResolutionLimit;
  if (res.width <= uRes.width && res.height <= uRes.height) {
    return res;
  }
  if (res.width - uRes.width > res.height - uRes.height) {
    return ScaleResolutionToWidth(res, uRes.width);
  } else {
    return ScaleResolutionToHeight(res, uRes.height);
  }
}

/**
 * @public
 */
export function ScaleResolutionUp(
  resolution: IResolution,
  lowerResolutionLimit: IResolution) : IResolution {
  const res = resolution;
  const lRes = lowerResolutionLimit;
  if (res.width >= lRes.width && res.height >= lRes.height) {
    return res;
  }
  if (res.width - lRes.width < res.height - lRes.height) {
    return ScaleResolutionToWidth(res, lRes.width);
  } else {
    return ScaleResolutionToHeight(res, lRes.height);
  }
}

/**
 * @public
 * Keeping the aspect ratio, scales given resolution to minimize the euclidian
 * distance to the target resolution.
 */
export function ScaleResolutionMinimizingEuclidianDistance(
    resolution: IResolution, targetResolution: IResolution): IResolution {
  const alpha = resolution.width;
  const beta = resolution.height;
  const gamma = targetResolution.width;
  const delta = targetResolution.height;
  const y = (beta * delta + gamma * alpha) / (Math.pow(alpha, 2) + Math.pow(beta, 2));
  return {
    width: alpha * y,
    height: beta * y 
  };
}

/**
 * @public
 */
export function GetStreamFrameRate(stream: MediaStream) : number {
  return stream.getVideoTracks()[0].getSettings().frameRate;
}
