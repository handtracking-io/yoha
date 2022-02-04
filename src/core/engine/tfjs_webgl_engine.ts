import {
  IEngineConfig,
  ITrackResultCb,
  IStopEngineCb,
  StartEngine,
} from './base';

import {ITrackSource} from '../track_source';

import {
  TfjsBackendType,
  IYohaModelFiles,
  CreateTfjsModelFromModelFiles,
  CreateModelCbFromTfjsModel,
  GetInputDimensionsFromTfjsModel,
} from '../model/tfjs';

import {
  CreateHtmlCanvasBasedPreprocCb
} from '../pre_model/canvas_preproc';

/**
 * @public
 * Starts an analysis loop on a track source (e.g. a `<video>` element) using the TFJS WebGl 
 * backend.
 *
 * @param config - Engine configuration.
 * @param trackSource - The element to be analyzed.
 * @param resCb - Callback that is called with hand tracking results. The callback may be called
 *                with high frequency.
 * @param yohaModels - File blobs of the AI models required for the engine to run.
 *
 * @returns Promise that resolves with a callback that can be used to stop the analysis.
 */
export async function StartWebGlEngine(
  config: IEngineConfig, 
  trackSource: ITrackSource, 
  yohaModel: IYohaModelFiles,
  resCb: ITrackResultCb,
) : Promise<IStopEngineCb> {
  const [boxModel, lanModel] = await Promise.all([
    CreateTfjsModelFromModelFiles(yohaModel.box, TfjsBackendType.WEBGL),  
    CreateTfjsModelFromModelFiles(yohaModel.lan, TfjsBackendType.WEBGL),
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

  return StartEngine(config, trackSource, preprocCb, boxCb, lanCb, resCb);
}
