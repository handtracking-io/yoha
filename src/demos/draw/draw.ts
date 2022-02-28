/**
 * This file contains code for the draw demo. You can find a live version at
 * https://handtracking.io/draw_demo
 *
 * Note that the complete demo consists out of this file and one of the `*_entry` files contained
 * in this directory (there is one for each backend Yoha supports).
 */
/**
 * Same imports are available via the Yoha npm package 
 * https://www.npmjs.com/package/%40handtracking.io/yoha
 */
import {
  CreateMaxFpsMaxResStream,
  MediaStreamErrorEnum, 
  CreateVideoElementFromStream,
  IDownloadProgressCb,
  ITrackResultCb,
  ITrackSource,
  IEngineConfig,
  RecommendedHandPoseProbabilityThresholds,
} from '../../entry';

/**
 * Utilities specific to the drawing demo. Not included in the Yoha npm package right now.
 */
import {
  VideoLayer, 
  PointLayer, 
  DynamicPathLayer, 
  LayerStack, 
  LandmarkLayer, 
  FpsLayer
} from '../../util/layers';

import {IsMobile} from '../../util/mobile_detect';
import {ScaleResolutionToWidth} from '../../util/stream_helper';
import {ExponentialMovingAverage} from '../../util/ema';

const BORDER_PADDING_FACTOR = 0.05;
const VIDEO_WIDTH_FACTOR = 0.66;

/**
 * The purpose of this interface is to encapsulate backend specific things
 * into separate files (e.g. tfjs_webgl_entry.ts) and reuse the code in this file.
 */
interface IDownloadAndStartEngineCb {
  (
    src: ITrackSource,
    config: IEngineConfig,
    progressCb: IDownloadProgressCb, 
    resultCb: ITrackResultCb
  ) : void
}

export async function CreateDrawDemo(startCb: IDownloadAndStartEngineCb) {
  if (IsMobile({tablet: true})) {
    document.getElementById('mobile').style.display = '';
  }

  const progressCb = (received: number, total: number) => {
    const progress = received / total;
    document.getElementById('progress').innerText = `${Math.round(progress * 100)}%`;
  };
  
  const config = {
    // Webcam video is usually flipped so we want the coordinates to be flipped as well.
    mirrorX: true,
    // Crop away a small area at the border to prevent the user to move out of view
    // when reaching for border areas on the canvas.
    padding: BORDER_PADDING_FACTOR,
  };

  // Create a video stream. This will ask the user for camera access.
  const streamRes = await CreateMaxFpsMaxResStream();

  if (streamRes.error) {
    if (streamRes.error === MediaStreamErrorEnum.NOT_ALLOWED_ERROR) {
      LogError('You denied camera access. Refresh the page if this was a mistake ' +
               'and you\'d like to try again.');
      return;
    } else if (streamRes.error === MediaStreamErrorEnum.NOT_FOUND_ERROR) {
      LogError('No camera found. For the handtracking to work you need to connect a camera. ' +
               'Refresh the page to try again.');
      return;
    } else {
      LogError(`Something went wrong when trying to access your camera (${streamRes.error}) ` +
               'You may try again by refreshing the page.');
      return;

    }
  }

  document.getElementById('logs').style.display = 'none';

  const src = CreateVideoElementFromStream(streamRes.stream);


  let width = src.width;
  let height = src.height;

  // Scale up/down to desired size...
  const targetWidth = window.innerWidth * VIDEO_WIDTH_FACTOR;
  ({width, height} = ScaleResolutionToWidth({width, height}, targetWidth));

  // Create helper 'layers' that we can use for easy visualization of the results.
  const {stack, pointLayer, pathLayer, landmarkLayer, fpsLayer} =
      CreateLayerStack(src, width, height);
  document.getElementById('canvas').appendChild(stack.GetEl());

  // Using a subtle exponential moving average helps to get smoother results.
  // (Setting the parameter to 1 disables the smoothing if you'd like to try without it.)
  const pos = new ExponentialCoordinateAverage(0.85);

  const thresholds = RecommendedHandPoseProbabilityThresholds;

  // StartTfliteEngine(config, src, models, e => {
  startCb(src, config, progressCb, e => {
    fpsLayer.RegisterCall();
    if (e.isHandPresentProb > thresholds.IS_HAND_PRESENT) {
      const cursorPos = pos.Add(ComputeCursorPositionFromCoordinates(e.coordinates));

      pointLayer.DrawPoint(cursorPos[0], cursorPos[1]);
      pointLayer.Render();

      if (e.poses.pinchProb > thresholds.PINCH) {
        pathLayer.AddNode(cursorPos[0], cursorPos[1]);
        pathLayer.Render();
      } else {
        pathLayer.EndPath();
      }

      if (e.poses.fistProb > thresholds.FIST) {
        pathLayer.Clear();
        pathLayer.Render();
      }

      // Uncomment to hide video upon detection.
      // videoLayer.FadeOut();
      landmarkLayer.Draw(e.coordinates);
      landmarkLayer.Render();
    } else {
      pointLayer.Clear();
      pointLayer.Render();
      pathLayer.EndPath();
      landmarkLayer.Clear();
      landmarkLayer.Render();
      // Uncomment to show video upon loosing the hand.
      // videoLayer.FadeIn();
    }
  });
}

class ExponentialCoordinateAverage {
  private xAvg_: ExponentialMovingAverage;
  private yAvg_: ExponentialMovingAverage;

  constructor(alpha: number) {
    this.xAvg_ = new ExponentialMovingAverage(alpha);
    this.yAvg_ = new ExponentialMovingAverage(alpha);
  }

  Add(coord: number[]) {
    return [this.xAvg_.Add(coord[0]), this.yAvg_.Add(coord[1])];
  }
}

function ComputeCursorPositionFromCoordinates(coords: number[][]) : number[] {
  return [(coords[3][0] + coords[7][0]) / 2, (coords[3][1] + coords[7][1]) / 2];
}

function LogError(error: string) {
  document.getElementById('error').innerText = error;
}

// This function creates utilities for visualizing the results. There is no magic
// here but feel free to explore.
function CreateLayerStack(video: HTMLVideoElement, width: number, height: number) {
  const stack = new LayerStack({
    width,
    height,
    outline: '2px solid white'
  });

  const videoLayer = new VideoLayer({
    width,
    height,
    virtuallyFlipHorizontal: true,
    crop: BORDER_PADDING_FACTOR,
  }, video);
  stack.AddLayer(videoLayer);

  const pointLayer = new PointLayer({
    width,
    height,
    color: '#FF5B5B',
    radius: 8,
    fill: true,
  });
  stack.AddLayer(pointLayer);

  const pathLayer = new DynamicPathLayer({
    pathLayerConfig: {
      width,
      height,
      numSmoothPoints: 10,
      color: '#00FFFF',
      lineWidth: 20,
    }
  });
  stack.AddLayer(pathLayer);

  const landmarkLayer = new LandmarkLayer({
    width,
    height,
  });
  stack.AddLayer(landmarkLayer);

  const fpsLayer = new FpsLayer({
    width,
    height,
  });
  stack.AddLayer(fpsLayer);

  return {stack, videoLayer, pointLayer, pathLayer, landmarkLayer, fpsLayer};
}

