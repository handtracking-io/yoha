import {
  ITrackResult,
  MirrorCoordinatesHorizontally, 
  ApplyPaddingToCoordinates,
  ConvertLandmarkCoordinatesToGlobalCoordinates,
  MakeCoordinateOrderUserFriendly,
  AssembleTrackResultFromCoordinatesAndClasses,
} from '../post_model/post_model';
import {
  ComputePreprocInfoFromBoxCoords,
  ComputePreprocInfoFromLanCoords,
  IPreprocInfo,
} from '../pre_model/preproc_comp';
import {IPreprocessCb} from '../pre_model/preproc';
import {IModelCb} from '../model/base';

import {ITrackSource} from '../track_source';
import {RequestAnimationFrame} from '../../util/animation_frame';

/**
 * @public
 *
 * Result callback.
 */
export type ITrackResultCb = (res: ITrackResult) => void

/**
 * The default configuration that is used to fill in any gaps in the user supplied
 * configuration.
 */
export const DEFAULT_CONFIG : IEngineConfig = {
  mirrorX: true,
  padding: 0.00,
  minHandPresenceProbabilityThreshold: 0.5,
  __userFriendlyCoordinateOrder: true,
  __boxSlack: 0.75,
};

/**
 * @public
 * Engine configuration.
 */
export interface IEngineConfig {
  /**
   * See {@link MirrorCoordinatesHorizontally}. Default is `true`.
   */
  mirrorX?: boolean

  /**
   * See {@link ApplyPaddingToCoordinates}. Default is `0`.
   */
  padding?: number

  /**
   * If the classifiers probability of a hand being present falls below this threshold
   * the engine will use the box model to look out for a hand. Default is `0.5`.
   */
  minHandPresenceProbabilityThreshold?: number 

  /**
   * For internal use.
   */
  __userFriendlyCoordinateOrder?: boolean

  /**
   * For internal use.
   */
  __boxSlack?: number
}

/**
 * @public
 *
 * A callback that when invoked stops the engine.
 */
export interface IStopEngineCb {
  (): void
}

const BOX_PREPROC_INFO: IPreprocInfo = {
  topLeft : [ 0.0, 0.0 ],
  bottomRight : [ 1.0, 1.0 ],
  flip : false,
  rotationCenter : [ 0.5, 0.5 ],
  rotationInRadians : 0.0,
};

/**
 * @public
 *
 * @param config - Engine configuration.
 * @param trackSource - The element to be analyzed.
 * @param preprocCb - Calllback that transforms track source (rotation/crop/resize).
 * @param boxCb - Callback that runs bounding box model.
 * @param lanCb - Callback that runs landmark model.
 * @param resCb - Callback that is called with hand tracking results. The
 * callback may be called with high frequency.
 *
 * @returns Promise that resolves with a callback that can be used to stop the
 * analysis.
 */
export async function StartEngine(
  config: IEngineConfig,
  trackSource: ITrackSource,
  preprocCb: IPreprocessCb,
  boxCb: IModelCb,
  lanCb: IModelCb,
  resCb: ITrackResultCb
): Promise<IStopEngineCb> {
  if (!config) {
    config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  ApplyConfigDefaults(DEFAULT_CONFIG,  config);
  const aspectRatio = [ trackSource.width, trackSource.height ];

  let stopped = false;
  let preprocInfo = null;

  while (!stopped) {
    if (!preprocInfo) {
      await RequestAnimationFrame();
      const boxModelInput = await preprocCb(trackSource, BOX_PREPROC_INFO);
      const boxRes = await boxCb(boxModelInput);
      preprocInfo = ComputePreprocInfoFromBoxCoords(
        boxRes.coordinates, 
        aspectRatio, 
        config.__boxSlack
      );
    }

    await RequestAnimationFrame();
    const lanModelInput = await preprocCb(trackSource, preprocInfo);
    const lanRes = await lanCb(lanModelInput);
    const classes = lanRes.classes;
    let coords = ConvertLandmarkCoordinatesToGlobalCoordinates(
      preprocInfo, 
      aspectRatio, 
      lanRes.coordinates
    );

    preprocInfo =
      ComputePreprocInfoFromLanCoords(coords, aspectRatio, config.__boxSlack);

    coords = ApplyPostProcessingToCoordinates(config, coords);

    const result =
        AssembleTrackResultFromCoordinatesAndClasses(coords, classes);
    resCb(result);

    if (result.isHandPresentProb < config.minHandPresenceProbabilityThreshold) {
      // Make the box model look for hand again.
      preprocInfo = null;
    }
  }

  return () => { stopped = true; };
}

/**
 * Applies any post processing to the result coordinates.
 * @param config - Engine configuration. 
 * @param coords - The coordinates to transform.
 */
export function ApplyPostProcessingToCoordinates(
  config: IEngineConfig, 
  coords: number[][]
): number[][] {
  if (config.padding) {
    coords = ApplyPaddingToCoordinates(config.padding, coords);
  }
  if (config.mirrorX) {
    coords = MirrorCoordinatesHorizontally(coords);
  }
  if (config.__userFriendlyCoordinateOrder) {
    coords = MakeCoordinateOrderUserFriendly(coords);
  }
  return coords;
}

function ApplyConfigDefaults(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  srcConfig: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trgConfig: any
): void {
  if (srcConfig === null || srcConfig === undefined || 
      trgConfig === null || trgConfig === undefined) {
    return;
  }
  if (typeof srcConfig !== 'object' || typeof trgConfig !== 'object') {
    return;
  }
  for (const key of Object.keys(srcConfig)) {
    if (key in trgConfig) {
      ApplyConfigDefaults(srcConfig[key], trgConfig[key]);
    } else if (key) {
      trgConfig[key] = srcConfig[key];
    }
  }
}
