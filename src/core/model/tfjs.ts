import * as tfwebgl from '@tensorflow/tfjs-backend-webgl';
import {GraphModel, loadGraphModel} from '@tensorflow/tfjs-converter';
import * as tf from '@tensorflow/tfjs-core';

import {IsWebGLOneAvailable, IsWebGLTwoAvailable} from '../../util/webgl_helper';

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
   * WebGL backend.
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
  CPU = 'CPU'
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

/**
 * Creates a tfjs graph model from tfjs model files.
 * @param modelBlobs - The model files from which to create a tfjs model.
 * @param backendType - What computational backend to use for creation of the model.
 */
export async function CreateTfjsModelFromModelBlobs(
  modelBlobs: IBlobs,
  backendType: TfjsBackendType
) : Promise<ITfjsModel> {
  const cacheReadingFetchFunc = CreateCacheReadingFetchFunc(modelBlobs);
  if (backendType === TfjsBackendType.WEBGL) {
    SetTfjsBackendToWebGl();
  }
  const graphModel = await loadGraphModel(ExtractModelJsonUrlFromModelBlobs(modelBlobs), {
    fetchFunc: cacheReadingFetchFunc
  });
  return {
    model: graphModel,
    backendType,
  };
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
export async function SetTfjsBackendToWebGl() {
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
  if (IsWebGLTwoAvailable()) {
    tf.env().set('WEBGL_VERSION', 2);
  } else if (IsWebGLOneAvailable()) {
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
    if (IsWebGLTwoAvailable()) {
      // in tfjs source code they also do this cast
      ctx = <WebGLRenderingContext>(canvas.getContext('webgl2', webglAttributes));
    } else {
      // in tfjs source code they also do this cast
      ctx = <WebGLRenderingContext>(canvas.getContext('webgl', webglAttributes));
    }
    const backend = new tfwebgl.MathBackendWebGL(new tfwebgl.GPGPUContext(ctx));
    return backend;
  }, 999);
  tf.setBackend('webgl');
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
  return GetCurrentTfjsBackend() === bt;
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
    const tfjsRes  = <tf.Tensor<tf.Rank>[]>(model.model.execute(t, ['coordinates', 'classes']));
    const coords = (<number[][][]>(
      execAsync ? (await tfjsRes[0].array()) : tfjsRes[0].arraySync()))[0];
    const classes = (<number[][][]>(
      execAsync ? (await tfjsRes[1].array()) : tfjsRes[1].arraySync()))[0];
    t.dispose();
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

