export {IEngine, MediaStreamErrorEnum, EventEnum} from '@handtracking.io/yoha'
import {IEngine, Load, IHandTrackingApi} from '@handtracking.io/yoha'

let API : IHandTrackingApi;

export async function CreateEngine() : Promise<IEngine> {
  if (API) {
    return API.CreateEngine();
  }
  API = await Load('./yoha');
  return CreateEngine();
}
