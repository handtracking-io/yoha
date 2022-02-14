import * as tfwebgl from '@tensorflow/tfjs-backend-webgl';
import * as tfwasm from '@tensorflow/tfjs-backend-wasm';
import {GraphModel, loadGraphModel} from '@tensorflow/tfjs-converter';
import * as tf from '@tensorflow/tfjs-core';

import {ApplyConfigDefaults} from '../../util/config_helper';
import {IsWebglOneAvailable, IsWebglTwoAvailable} from '../../util/webgl_helper';
import {
  IModelCb,
  IModelDownloadProgressCb,
  IModelInput,
  ITypedArrayInput,
  ModelInputType,
  IModelResult,
  DownloadMultipleYohaModelBlobs,
  DownloadMultipleModelBlobs,
  DownloadBlobs,
  IBlobs,
  CreateCacheReadingFetchFunc,
} from './base';

const DEFAULT_TFJS_WEBGL_ATTRIBUTES = {
  alpha: false,
  antialias: false,
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
  depth: false,
  stencil: false,
  failIfMajorPerformanceCaveat: true,
  powerPreference: 'default',
};

/**
 * @public
 * The computational backend type to use as the tfjs backend.
 */
export const enum TfjsBackendType {
  /**
   * WebGPU backend.
   * Currently not supported.
   */
  WEBGPU = 'WEBGPU',
  /**
   * Webgl backend.
   */
  WEBGL = 'WEBGL',
  /**
   * WASM backend.
   * Currently not supported.
   */
  WASM = 'WASM',
  /**
   * CPU backend.
   * Currently not supported.
   */
  CPU = 'CPU',
  /**
   * Experimental.
   * No backend is set explicitly by Yoha. You have to set up tfjs yourself with the backend of 
   * your choice before instantiating the Yoha models. 
   */
  MANUAL = 'MANUAL',
}

/**
 * @public
 * A tfjs model.
 */
export interface ITfjsModel {
  /**
   * The tfjs model.
   */
  model: GraphModel
  /**
   * The tfjs backend type with which this model was created.
   */
  backendType: TfjsBackendType
}

/**
 * @public
 * The two models required for running the Yoha engine.
 */
export interface IYohaTfjsModelBlobs {
  /**
   * This field adds some type safety to protect against mismatching blobs/backends.
   */
  modelType: 'tfjs'
  /**
   * The file blobs of the box model for detecting initial hand position within stream.
   */
  box: IBlobs
  /**
   * The file blobs of the landmark model for detecting landmark locations and detecting hand poses.
   */
  lan: IBlobs
}

/**
 * @public
 * Downloads the Yoha tfjs models.
 * @param boxUrl - Url to model.json file of box model.
 * @param lanUrl - Url to model.json file of landmark model.
 * @param progressCb - A callback that is called with the cumulative download progress for all
 *                     models.
 */
export async function DownloadMultipleYohaTfjsModelBlobs(
  boxUrl: string, 
  lanUrl: string, 
  progressCb: IModelDownloadProgressCb
) : Promise<IYohaTfjsModelBlobs> {
  return {
    ...await DownloadMultipleYohaModelBlobs(boxUrl, lanUrl, progressCb, DownloadTfjsModelBlobs),
    modelType: 'tfjs',
  };
}

/**
 * @public
 * Downloads a list of tfjs models.
 * @param urls - A list of URLs. Each URL must point to a model.json file.
 * @param progressCb - A callback that is called with the cumulative download progress for all
 *                     models.
 */
export async function DownloadTfjsModelBlobs(
  urls: string[],
  progressCb: IModelDownloadProgressCb
):
    Promise<IBlobs[]> {
  return DownloadMultipleModelBlobs(urls, progressCb, DownloadTfjsModel);
}

/**
 * @public
 * Downloads a tfjs model and reports download progress via a callback.
 * @param url - The URL to the model.json file of the tfjs model.
 * @param progressCb - Callback that informs about download progress.
 */
export async function DownloadTfjsModel(
  url: string, 
  progressCb: IModelDownloadProgressCb
) : Promise<IBlobs> {
  const f = tf.env().platform.fetch;

  // Fetch model.json
  const modelJsonResponse = await f(url);
  const modelJsonBlob = await modelJsonResponse.blob();
  const modelJsonString = await modelJsonBlob.text();
  const modelJson = JSON.parse(modelJsonString);

  // Fetch binary chunks while keeping track of progress
  const weightPaths : string[] = modelJson.weightsManifest[0].paths;
  const urlBase = url.substring(0, url.lastIndexOf('/') + 1);
  const fullPaths : string[] = weightPaths.map((p: string) => urlBase + p);

  const res = await DownloadBlobs(fullPaths, progressCb);
  // Need to include the model json that was downloaded beforehand.
  res.blobs.set(url, modelJsonBlob);
  return res;
}

export interface ITfjsManualBackendConfig {
  backendType: TfjsBackendType.MANUAL
}

export interface IInternalTfjsManualBackendConfig {
  backendType: TfjsBackendType.MANUAL
}


export interface ITfjsWebglBackendConfig {
  backendType: TfjsBackendType.WEBGL
}

export interface IInternalTfjsWebglBackendConfig {
  backendType: TfjsBackendType.WEBGL
}

/**
 * @public
 * Configuration that is specific to the tfjs wasm backend. 
 * 
 */
export interface ITfjsWasmBackendConfig {
  /**
   * See https://github.com/tensorflow/tfjs/tree/master/tfjs-backend-wasm#using-bundlers
   */
  wasmPaths: string
}

export interface IInternalTfjsWasmBackendConfig {
  backendType: TfjsBackendType.WASM
  wasmPaths: string
}

/**
 * We create external and interal configs just so that users don't have to deal with
 * setting the 'backendType' fields...
 */
export type ITfjsBackendConfig = ITfjsWebglBackendConfig | 
                                 ITfjsWasmBackendConfig | 
                                 ITfjsManualBackendConfig;

export type IInternalTfjsBackendConfig = IInternalTfjsWebglBackendConfig | 
                                         IInternalTfjsWasmBackendConfig |
                                         IInternalTfjsManualBackendConfig;

export const DEFAULT_TFJS_MANUAL_BACKEND_CONFIG = {
  type: TfjsBackendType.MANUAL,
};

export const DEFAULT_TFJS_WEBGL_BACKEND_CONFIG = {
  type: TfjsBackendType.WEBGL,
};

export const DEFAULT_TFJS_WASM_BACKEND_CONFIG = {
  type: TfjsBackendType.WASM,
  wasmPath: ''
};

/**
 * Creates a tfjs graph model from tfjs model files.
 * @param modelBlobs - The model files from which to create a tfjs model.
 * @param backendType - What computational backend to use for creation of the model.
 */
export async function CreateTfjsModelFromModelBlobs(
  modelBlobs: IBlobs,
  config: IInternalTfjsBackendConfig,
) : Promise<ITfjsModel> {
  const defaultConfig = GetTfjsDefaultBackendConfigForBackendType(config.backendType);
  config = ApplyConfigDefaults(defaultConfig, config);
  const t = config.backendType;
  if (t === TfjsBackendType.WEBGL) {
    await SetTfjsBackendToWebgl();
  } else if (t === TfjsBackendType.WASM) {
    await SetTfjsBackendToWasm(config.wasmPaths);
  } else if (t === TfjsBackendType.MANUAL) {
    // no-op
  } else {
    throw 'Backend ' + t + ' is currently not supported.';
  }
  const cacheReadingFetchFunc = CreateCacheReadingFetchFunc(modelBlobs);
  const graphModel = await loadGraphModel(ExtractModelJsonUrlFromModelBlobs(modelBlobs), {
    fetchFunc: cacheReadingFetchFunc
  });
  return {
    model: graphModel,
    backendType: t,
  };
}

function GetTfjsDefaultBackendConfigForBackendType(backendType: TfjsBackendType) {
  if (backendType === TfjsBackendType.WEBGL) {
    return DEFAULT_TFJS_WEBGL_BACKEND_CONFIG;
  } else if (backendType === TfjsBackendType.WASM) {
    return DEFAULT_TFJS_WASM_BACKEND_CONFIG;
  } else if (backendType === TfjsBackendType.MANUAL) {
    return DEFAULT_TFJS_MANUAL_BACKEND_CONFIG;
  } else {
    throw 'Backend ' + backendType + ' is currently not supported.';
  }
}

function ExtractModelJsonUrlFromModelBlobs(modelBlobs: IBlobs) {
  let url : string = null;
  for (const k of modelBlobs.blobs.keys()) {
    if (k.endsWith('model.json')) {
      if (url) {
        throw 'modelBlobs contained two model.json entries.';
      }
      url = k;
    }
  }
  if (!url) {
    throw 'modelBlobs did not contain a model.json entry.';
  }
  return url;
}

/**
 * Sets the tfjs webgl backend.
 */
export async function SetTfjsBackendToWebgl() {
  // Tfjs has its own mechanism for determining whether webgl is available. In
  // particular they create a canvas with a webgl context and a custom set of
  // webgl attributes among which they use 'failIfMajorPerformanceCaveat' ===
  // true. This causes some browsers, in particular late versions of firefox, to
  // disable webgl if the browser determines that webgl would lead to similar or
  // worse performance than other contexts like software rendering. If this
  // happens tfjs records that there is no WEBGL available (even though the
  // browser supports it). It turned out that at least on firefox the heuristic
  // it uses to determine whether to disable webgl or not works poorly i.e.
  // webgl is disabled even though it would lead to incredible performance
  // improvements for us.
  //
  // Thus we override tfjs determination of whether webgl is available.
  tf.env().set('HAS_WEBGL', true);
  if (IsWebglTwoAvailable()) {
    tf.env().set('WEBGL_VERSION', 2);
  } else if (IsWebglOneAvailable()) {
    tf.env().set('WEBGL_VERSION', 1);
  } else {
    throw 'No webgl available.';
  }

  const webglAttributes = JSON.parse(JSON.stringify(DEFAULT_TFJS_WEBGL_ATTRIBUTES));
  webglAttributes.failIfMajorPerformanceCaveat = false;
  webglAttributes.powerPreference = 'high-performance';
  tf.removeBackend('webgl');
  tf.registerBackend('webgl', () => {
    const canvas = document.createElement('canvas');
    let ctx : WebGLRenderingContext;
    if (IsWebglTwoAvailable()) {
      // in tfjs source code they also do this cast
      ctx = <WebGLRenderingContext>(canvas.getContext('webgl2', webglAttributes));
    } else {
      // in tfjs source code they also do this cast
      ctx = <WebGLRenderingContext>(canvas.getContext('webgl', webglAttributes));
    }
    const backend = new tfwebgl.MathBackendWebGL(new tfwebgl.GPGPUContext(ctx));
    return backend;
  }, 999);
  await tf.setBackend('webgl');
  await tf.ready();
}

/**
 * Sets the tfjs wasm backend.
 */
export async function SetTfjsBackendToWasm(wasmPaths: string) {
  if (!wasmPaths) {
    throw '`wasmPaths` not set. Got ' + wasmPaths;
  }
  tfwasm.setWasmPaths(wasmPaths);
  await tf.setBackend('wasm');
  await tf.ready();
}

function GetCurrentTfjsBackend() : TfjsBackendType {
  const t = tf.getBackend();
  if (t === 'webgl') {
    return TfjsBackendType.WEBGL;
  } else if (t === 'webgpu') {
    return TfjsBackendType.WEBGPU;
  } else if (t === 'cpu') {
    return TfjsBackendType.CPU;
  } else  if (t === 'wasm') {
    return TfjsBackendType.WASM;
  } else {
    throw 'Unknown backend type string: ' + t;
  }
}

function DoesTfjsBackendTypeMatchCurrentlySetBackend(bt: TfjsBackendType) : boolean {
  return GetCurrentTfjsBackend() === bt || bt === TfjsBackendType.MANUAL;
}

/**
 * Creates a model callback from a tfjs graph model and information about how the model
 * is to be invoked.
 * @param model - The graph model to create a callback for.
 * @param execAsync - Whether to execute the model asynchronously.
 */
export function CreateModelCbFromTfjsModel(model: ITfjsModel, execAsync: boolean) : IModelCb {
  return async (modelInput: IModelInput) : Promise<IModelResult> => {
    if (!DoesTfjsBackendTypeMatchCurrentlySetBackend(model.backendType)) {
      console.warn('The tfjs model was created with backend ' + model.backendType + 
        ' but the backend was switched to ' + GetCurrentTfjsBackend());
    }
    const t = CreateTensorFromModelInput(modelInput);
    const tfjsRes  = <tf.Tensor<tf.Rank>[]>(model.model.execute(
      t,
      ['coordinates', 'classes']
    ));
    t.dispose();
    const readOutputFn = async (index: number) : Promise<number[][]> => {
      const outputEl = tfjsRes[index];
      const batchedRes = <number[][][]>(
        execAsync ? (await outputEl.array()) : outputEl.arraySync());
      const noBatchDimRes = batchedRes[0];
      return noBatchDimRes;
    };
    const [coords, classes] = await Promise.all(
      [readOutputFn(0), readOutputFn(1)]
    );
    for (const resultTensor of tfjsRes) {
      resultTensor.dispose();
    }

    return {
      // need to convert coordinates from [-1,1] into range [0,1]
      coordinates: coords.map(c => [(c[0] + 1) / 2, (c[1] + 1) / 2]),
      // classes is list of bernulli distributions. We just keep one value of it.
      classes: classes.map(v => v[1])
    };
  };
}

export function CreateTensorFromModelInput(mi: IModelInput) {
  let t : tf.Tensor;
  if (mi.type === ModelInputType.TRACK_SOURCE) {
    // Typescript complains here about offscreen canvas but it's fine to pass it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t = tf.browser.fromPixels(<any>mi.data);
  } else if (mi.type === ModelInputType.TYPED_ARRAY) {
    t = CreateTensorFromTypedArrayInput(mi);
  } else {
    throw 'not implemented';
  }
  const reshaped = tf.reshape(t, [1, t.shape[0], t.shape[1], t.shape[2]]);
  const casted = tf.cast(reshaped, 'float32');
  reshaped.dispose();
  t.dispose();
  return casted;
}

function CreateTensorFromTypedArrayInput(tai: ITypedArrayInput) {
  if (tai.data instanceof Uint8Array) {
    return tf.tensor(tai.data, tai.shape, 'int32');
  } else {
    throw 'not implemented';
  }
}

/**
 * Given a Tfjs model where the first input tensor is of shape [B,H,W,C].
 * returns [H,W]. Returns undefined if such tensor was not found.
 */
export function GetInputDimensionsFromTfjsModel(model: ITfjsModel): number[] {
  if (!model.model.inputs.length) {
    return;
  }
  const dims = model.model.inputs[0].shape;
  if (dims.length !== 4) {
    return;
  }
  return [dims[1], dims[2]];
}

