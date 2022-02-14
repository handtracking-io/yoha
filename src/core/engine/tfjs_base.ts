import {
  IEngineConfig,
  ITrackResultCb,
  IStopEngineCb,
  StartEngine,
} from './base';

import {ITrackSource} from '../track_source';

import {
  IInternalTfjsBackendConfig,
  CreateModelCbFromTfjsModel,
  GetInputDimensionsFromTfjsModel,
  CreateTfjsModelFromModelBlobs,
  IYohaTfjsModelBlobs,
} from '../model/tfjs';

import {
  CreateHtmlCanvasBasedPreprocCb
} from '../pre_model/canvas_preproc';

/**
 * @public
 * Starts an analysis loop on a track source (e.g. a `<video>` element) using a tfjs 
 * backend.
 *
 * @param engineConfig - Engine configuration.
 * @param backendConfig - Backend configuration.
 * @param trackSource - The element to be analyzed.
 * @param resCb - Callback that is called with hand tracking results. The callback may be called
 *                with high frequency.
 * @param yohaModels - File blobs of the AI models required for the engine to run.
 *
 * @returns Promise that resolves with a callback that can be used to stop the analysis.
 */
export async function StartTfjsEngine(
  engineConfig: IEngineConfig, 
  backendConfig: IInternalTfjsBackendConfig,
  yohaModels: IYohaTfjsModelBlobs,
  trackSource: ITrackSource, 
  resCb: ITrackResultCb,
) : Promise<IStopEngineCb> {
  const [boxModel, lanModel] = await Promise.all([
    CreateTfjsModelFromModelBlobs(yohaModels.box, backendConfig),  
    CreateTfjsModelFromModelBlobs(yohaModels.lan, backendConfig),
  ]);

  const boxDims = GetInputDimensionsFromTfjsModel(boxModel);
  const lanDims = GetInputDimensionsFromTfjsModel(lanModel);

  if (boxDims[0] !== lanDims[0] || boxDims[1] !== lanDims[1]) {
    throw 'Engine does not support different dimensions for box and landmark model right now.';
  }

  const preprocCb = CreateHtmlCanvasBasedPreprocCb(
    trackSource.width, 
    trackSource.height, 
    boxDims[0], 
    boxDims[1]
  );
  const boxCb = CreateModelCbFromTfjsModel(boxModel, true);
  const lanCb = CreateModelCbFromTfjsModel(lanModel, true);

  return StartEngine(engineConfig, trackSource, preprocCb, boxCb, lanCb, resCb);
}
