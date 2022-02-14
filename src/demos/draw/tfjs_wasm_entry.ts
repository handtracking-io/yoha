/**
 * All imports used here are also available via the npm package.
 * https://www.npmjs.com/package/%40handtracking.io/yoha
 */
import {
  DownloadMultipleYohaTfjsModelBlobs,
  StartTfjsWasmEngine,
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
    // Note the 'wasmPath' argument. This has to be in sync with how you serve the respective
    // files. See webpack.config.js for an example.
    StartTfjsWasmEngine(config, {
      wasmPaths: './node_modules/@tensorflow/tfjs-backend-wasm/dist/'
    }, src, modelBlobs, resultCb);
  });
}

Run();
