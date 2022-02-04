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
export type IModelDownloadProgressCb = (received: number, total: number) => void

export interface IModelDownloadProgressCbCreationFn {
  (): IModelDownloadProgressCb
}

export function CreateSimultaneousDownloadProgressCb(
  combinedProgressCb: IModelDownloadProgressCb
) : IModelDownloadProgressCbCreationFn {
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
