export {IEngine, MediaStreamErrorEnum, EventEnum} from 'yoha'
import {IEngine, Load, IHandTrackingApi} from 'yoha'

let API : IHandTrackingApi;

export async function CreateEngine() : Promise<IEngine> {
  if (API) {
    return API.CreateEngine();
  }
  API = await Load('./yoha');
  return CreateEngine();
}
