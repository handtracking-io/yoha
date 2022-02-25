/**
 * This file contains everything backend-unrelated that is concerned with 
 * - obtaining a model
 * - executing a model
 */
import {ITrackSource} from '../track_source';

export interface IModelResult {
  /**
   * [x, y] coordinates in the range [0, 1].
   */
  coordinates: number[][]
  /**
   * Probablities (range [0, 1]).
   */
  classes: number[]
}

export const enum ModelInputType {
  TRACK_SOURCE = 'TRACK_SOURCE',
  TYPED_ARRAY = 'TYPED_ARRAY',
}

/**
 * This type of input processes an HTML element. See {@link ITrackSource} for details.
 */
export interface ITrackSourceInput {
  type: ModelInputType.TRACK_SOURCE
  data: ITrackSource
}

export interface ITypedArrayInput {
  type: ModelInputType.TYPED_ARRAY
  data: Uint8Array
  shape: number[]
}

export type IModelInput = ITrackSourceInput | ITypedArrayInput

export interface IModelCb {
  (input: IModelInput): Promise<IModelResult>
}

/**
 * @public
 * Callback that periodically informs about download progress.
 * @remarks
 * <b>received</b>: Number in range [0,total]<br>
 * <b>total</b>: Number in range [0,INFINITY) that stays the same across invocations of the 
 * function.
 */
export type IDownloadProgressCb = (received: number, total: number) => void

export interface IDownloadProgressCbCreationFn {
  (): IDownloadProgressCb
}

/**
 * This function can be used to track the overall download progress of multiple downloads.
 *
 * Functions that report download progress do so via a {@link IDownloadProgressCb}
 * argument. This function here also takes such a parameter but uses it to report the overall 
 * download progress. Further it returns a callback that, when called, returns a 
 * {@link IDownloadProgressCb} that should be used for one of the downloads.
 * @param combinedProgressCb Callback to report combined download progress.
 */
export function CreateProgressCbCreationCbForMultipleDownloads(
  combinedProgressCb: IDownloadProgressCb
) : IDownloadProgressCbCreationFn {
  let totalReceived = 0;
  let totalSize = 0;
  return () => {
    let first = true;
    let prev = 0;
    return (r: number, t: number) => {
      totalReceived -= prev;
      totalReceived += r;
      prev = r;
      if (first) {
        totalSize += t;
        first = false;
      }
      combinedProgressCb(totalReceived, totalSize);
    };
  };
}

/**
 * Reads a stream and reports progress of reading process.
 * @param reader Reader for the stream to be processed.
 * @param cb Callback that reports the progress of reading the stream. 
 *           `progress` is a number that represents the size of the just processed chunk.
 */
export async function ReadStreamWithProgress(
  reader: ReadableStreamDefaultReader<Uint8Array>, 
  cb: (progress: number) => void
) {
  let receivedLength = 0;
  const chunks = []; 
  while (true) {
    const {done, value} = await reader.read();
    if (done) {
      break;
    }
  
    chunks.push(value);
    receivedLength += value.length;
    cb(value.length);
  }
  
  const chunksAll = new Uint8Array(receivedLength); 
  let position = 0;
  for(const chunk of chunks) {
    chunksAll.set(chunk, position);
    position += chunk.length;
  }
  return chunksAll;
}

/**
 * Callback that downloads a model and reports download progress.
 */
interface IDownloadModelCb {
  (url: string, progressCb: IDownloadProgressCb) : Promise<IBlobs>
}

/**
 * Callback that downloads multiple models and reports total download progress.
 */
interface IDownloadModelsCb {
  (urls: string[], progressCb: IDownloadProgressCb) : Promise<IBlobs[]>
}

/**
 * Blobs associated with Yoha models.
 */
interface IYohaModelBlobs {
  box: IBlobs
  lan: IBlobs
}

/**
 * @public
 * Collection of blobs.
 */
export interface IBlobs {
  /**
   * Key (e.g. Url) to corresponding byte blob.
   */
  blobs: Map<string, Blob>
}

/**
 * @public
 * Downloads Yoha models.
 * @param boxUrl - Url to model.json of box model. Must be understood by {@link downloadModelsCb}.
 * @param lanUrl - Url to model.json of landmark model. Must be understood 
 *                 by {@link downloadModelsCb}.
 * @param progressCb - A callback that is called with the cumulative download progress for all
 *                     models.
 * @param downloadModelsCb - A callback that is called to download multiple models simultaneously.
 */
export async function DownloadMultipleYohaModelBlobs(
  boxUrl: string, 
  lanUrl: string, 
  progressCb: IDownloadProgressCb,
  downloadModelsCb: IDownloadModelsCb
) : Promise<IYohaModelBlobs> {
  const modelBlobs = await downloadModelsCb([boxUrl, lanUrl], progressCb);
  return {
    box: modelBlobs[0],
    lan: modelBlobs[1],
  };
}

/**
 * Downloads a list of models.
 * @param urls - A list of URLs, one for each model.
 * @param progressCb - A callback that is called with the cumulative download progress for all
 *                     models.
 * @param downloadModelCb - A callback that is called to download a model.
 */
export async function DownloadMultipleModelBlobs(
  urls: string[],
  progressCb: IDownloadProgressCb,
  downloadModelCb: IDownloadModelCb
): Promise<IBlobs[]> {
  const promises = [];
  const createModelProgressCb = CreateProgressCbCreationCbForMultipleDownloads(progressCb);
  for (const url of urls) {
    promises.push(downloadModelCb(url, createModelProgressCb()));
  }
  return Promise.all(promises);
}

/**
 * Downloads a list of files, reports download progress and returns the files as map from
 * url to blobs.
 * @param urls Urls of the files to download.
 * @param progressCb Callback that informs about download progress.
 */
export async function DownloadBlobs(
  urls: string[], 
  progressCb: IDownloadProgressCb
) : Promise<IBlobs> {
  const fetchPromises = urls.map((u: string) => fetch(u));
  const responses : Response[] = await Promise.all(fetchPromises);
  const sizes = responses.map((r: Response) => +r.headers.get('Content-Length'));
  const totalSize = sizes.reduce((acc: number, cur: number) => acc + cur);
  const playloadPromises = [];

  // Inform consumers immediately.
  progressCb(0, totalSize);
  let totalReceived = 0;
  for (let i = 0; i < sizes.length; ++i) {
    playloadPromises.push(
      ReadStreamWithProgress(
        responses[i].body.getReader(), 
        (numRec: number) => {
          totalReceived += numRec;
          progressCb(totalReceived, totalSize);
        }
      )
    );
  }
  const payloads = await Promise.all(playloadPromises);

  const blobs = new Map<string, Blob>();
  // Cache chunks
  for (let i = 0; i < sizes.length; ++i) {
    blobs.set(urls[i], new Blob([payloads[i]]));
  }
  return {
    blobs,
  };
}

/**
 * Creates a `fetch` compatible function that uses cached request results to process
 * any request.
 * @param cache The request cache. Has to contain an entry for every url that is going to be 
 *              requested.
 */
export function CreateCacheReadingFetchFunc(cache: IBlobs) {
  return async (requestInfo: RequestInfo) => {
    const resource = requestInfo.toString();

    if (!cache.blobs.has(resource)) {
      throw `Requested URL ${resource} but that was not contained in modelBlobs ` +
            `(${Array.from(cache.blobs.keys()).concat(', ')})`;
    }
    return new Response(cache.blobs.get(resource), {
      status: 200
    });
  };
}
