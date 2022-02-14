/**
 * All imports used here are also available via the npm package.
 * https://www.npmjs.com/package/%40handtracking.io/yoha
 */
import {
  DownloadMultipleYohaTfjsModelBlobs,
  StartTfjsWebglEngine,
  IModelDownloadProgressCb,
  ITrackResultCb,
  ITrackSource,
  IEngineConfig,
} from '../../entry';

import {CreateDrawDemo} from './draw';

async function Run() {
  CreateDrawDemo(async (
    src: ITrackSource, 
    config: IEngineConfig,
    progressCb: IModelDownloadProgressCb, 
    resultCb: ITrackResultCb
  ) => {
    const modelBlobs = await DownloadMultipleYohaTfjsModelBlobs(
      'box/model.json', 
      'lan/model.json', 
      progressCb
    );
    StartTfjsWebglEngine(config, src, modelBlobs, resultCb);
  });
}

Run();
