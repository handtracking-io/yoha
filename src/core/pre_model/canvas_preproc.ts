import {IPreprocInfo} from './preproc_comp'
import {ITrackSource} from '../track_source'
import {IModelInput, ModelInputType} from '../model/base'

class CanvasBasedPreprocessing {
  private originalWidth_: number
  private originalHeight_: number
  private resizeWidth_: number
  private resizeHeight_: number
  private pad_: boolean
  private canvas_: OffscreenCanvas | HTMLCanvasElement

  Init(
    originalWidth: number,
    originalHeight: number,
    resizeWidth: number,
    resizeHeight: number,
    pad: boolean) : void {
    this.originalWidth_ = originalWidth;
    this.originalHeight_ = originalHeight;
    this.resizeWidth_ = resizeWidth;
    this.resizeHeight_ = resizeHeight;
    this.pad_ = pad;

    this.canvas_ = document.createElement('canvas');
    if (this.canvas_.transferControlToOffscreen) {
      // Use offscreencanvas if available for better performance.
      this.canvas_ = this.canvas_.transferControlToOffscreen();
    }
    this.canvas_.width = resizeWidth;
    this.canvas_.height = resizeHeight;
    // Initialize context.
    this.canvas_.getContext('2d');
  }

  // Note: It's a race condition to call this before finishing processing of any previous result.
  async Preprocess(
    src: ITrackSource,
    preprocInfo: IPreprocInfo) : Promise<IModelInput> {
    const trg = this.canvas_;
    const res : IModelInput = {
      type: ModelInputType.TRACK_SOURCE,
      data: trg,
    };
    if (!this.pad_) {
      this.ProcessInternal_(src, trg, preprocInfo);
      return res; 
    } else {
      const t = JSON.parse(JSON.stringify(preprocInfo));
      // make box square
      // note that we have to be careful with aspect ratio here
      const width = this.originalWidth_ * (t.bottomRight[0] - t.topLeft[0]);
      const height = this.originalHeight_ * (t.bottomRight[1] - t.topLeft[1]);
      const globalPad = Math.abs(width - height);

      if (width > height) {
        t.topLeft[1] -= (globalPad / 2) / this.originalHeight_;
        t.bottomRight[1] += (globalPad / 2) / this.originalHeight_;
      } else if (width < height) {
        t.topLeft[0] -= (globalPad / 2) / this.originalWidth_;
        t.bottomRight[0] += (globalPad / 2) / this.originalWidth_;
      }
      this.ProcessInternal_(src, trg, t);
      // Replace actual data with padding value.
      const ctx = trg.getContext('2d')
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (width > height) {
        const boxPad = 1 - (height / width)
        ctx.clearRect(0, 0, this.resizeWidth_, boxPad / 2 * this.resizeHeight_);
        ctx.clearRect(0, this.resizeHeight_ - this.resizeHeight_ * boxPad / 2,
                      this.resizeWidth_, boxPad / 2 * this.resizeHeight_);
      } else if (width < height) {
        const boxPad = 1 - (width / height)
        ctx.clearRect(0, 0, boxPad / 2 * this.resizeWidth_, this.resizeHeight_);
        ctx.clearRect(this.resizeWidth_ - this.resizeWidth_ * boxPad / 2, 0,
                      boxPad / 2 * this.resizeWidth_, this.resizeHeight_);
      }
      return res;
    }
  }

  private Reset_(trg: HTMLCanvasElement | OffscreenCanvas) {
    const ctx = trg.getContext('2d')
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.resizeWidth_, this.resizeHeight_);
  }

  private ProcessInternal_(src: ITrackSource,
                           trg: HTMLCanvasElement | OffscreenCanvas,
                           preprocInfo: IPreprocInfo) {
    const ctx = trg.getContext('2d');
    this.Reset_(trg);

    const {topLeft, bottomRight, rotationCenter, rotationInRadians, flip} = preprocInfo;

    const boxWidth = (bottomRight[0] - topLeft[0]) * this.originalWidth_ + 1;
    const boxHeight = (bottomRight[1] - topLeft[1]) * this.originalHeight_ + 1;
    const scaleX = this.resizeWidth_ / boxWidth;
    const scaleY = this.resizeHeight_ / boxHeight;

    ctx.scale(scaleX, scaleY);

    // Translate.
    const offset = [topLeft[0] * this.originalWidth_, topLeft[1] * this.originalHeight_];
    ctx.translate(-offset[0], -offset[1]);

    // Rotate.
    const d = [rotationCenter[0] * this.originalWidth_, rotationCenter[1] * this.originalHeight_]
    ctx.translate(d[0], d[1]);
    ctx.rotate(rotationInRadians);
    ctx.translate(-d[0], -d[1]);

    if (flip) {
      ctx.scale(-1, 1)
    }

    let dx = 0;
    const dy = 0;
    const dWidth = this.originalWidth_;
    const dHeight = this.originalHeight_;

    if (flip) {
      dx = -(dx + dWidth)
    }
    // Note: This is not supported on ios safari if src is a HTMLVideoElement: 
    // https://developer.apple.com/documentation/webkitjs/canvasrenderingcontext2d/1630282-drawimage
    ctx.drawImage(src, 0, 0, this.originalWidth_, this.originalHeight_, dx, dy,
                  dWidth, dHeight);
  }
}

export function CreateHtmlCanvasBasedPreprocCb(
  originalWidth: number,
  originalHeight: number,
  resizeWidth: number,
  resizeHeight: number,
) {
  const preproc = new CanvasBasedPreprocessing()
  preproc.Init(originalWidth, originalHeight, resizeWidth, resizeHeight, false);

  return (trackSource: ITrackSource, preprocInfo: IPreprocInfo) : Promise<IModelInput> => {
    return preproc.Preprocess(trackSource, preprocInfo);
  };
}
