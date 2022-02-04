import {ITrackSource} from '../track_source';
import {IPreprocInfo} from './preproc_comp';
import {IModelInput} from '../model/base';

export interface IPreprocessCb {
  (trackSource: ITrackSource, preprocInfo: IPreprocInfo): Promise<IModelInput>
}


