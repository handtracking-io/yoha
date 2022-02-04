import {CreateVideoElementFromStream} from './stream_helper';
import {ExponentialMovingAverage} from '../util/ema';
import * as THREE from 'three';

import {MeshLine, MeshLineMaterial} from 'meshline';

const THREE_USE_ORTHO_CAMERA = true;

/**
 * @public
 */
export interface IThreeLayerConfig {
  width: number
  height: number
}

/**
 * @public
 */
export class ThreeLayer {
  private camera_: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private scene_: THREE.Scene;
  private renderer_: THREE.WebGLRenderer;
  private config_: IThreeLayerConfig;

  constructor(config: IThreeLayerConfig) {
    this.config_ = config;

    if (THREE_USE_ORTHO_CAMERA) {
      this.camera_ = new THREE.OrthographicCamera(
        0, 
        config.width, 
        0, 
        config.height, 
        0, 
        1000
      );
    } else {
      this.camera_ = new THREE.PerspectiveCamera(
        45, 
        this.config_.width / this.config_.height, 
        0.1, 
        1000
      );
      // This gives the right distance along z axes such that our content exactly fills
      // the canvas.
      const distance = this.config_.height / (2 * Math.tan( this.camera_.fov * Math.PI / 360 ) );
      this.camera_.up.set(0, -1, 0);
      // Note: We use negative z coordinate for camera position since this allows us to 
      // correctly align x and y axes with the canvas (where y axis is flipped).
      this.camera_.position.set(this.config_.width / 2, this.config_.height / 2, -distance);
      this.camera_.lookAt(this.config_.width / 2, this.config_.height / 2, 0);
    }

    this.renderer_ = new THREE.WebGLRenderer({
      alpha: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
      antialias: true,
    });
    this.renderer_.debug.checkShaderErrors = false;
    this.renderer_.setSize(this.config_.width, this.config_.height);
    this.renderer_.setPixelRatio( window.devicePixelRatio );
    this.renderer_.setClearColor( 0x000000, 0.0 );
    this.renderer_.autoClear = true;
    this.scene_ = new THREE.Scene();
  }

  Add(o: THREE.Mesh | THREE.Line) : void {
    this.scene_.add(o);
  }

  GetDomElement() : HTMLCanvasElement {
    return this.renderer_.domElement;
  }

  Render() : void {
    this.renderer_.render(this.scene_, this.camera_);
  }

  RemoveMesh(o: THREE.Mesh | THREE.Line) : void {
    this.scene_.remove(o);
  }
}

/**
 * @public
 */
export interface IPointLayerConfig {
  width: number
  height: number
  radius?: number
  color?: string
  fill?: boolean
  lineWidth?: number
  segments?: number
}

/**
 * @public
 */
export class PointLayer implements ILayer {
  private config_: IPointLayerConfig;
  private threeLayer_: ThreeLayer;
  private mesh_: THREE.Mesh;
  private geo_: THREE.RingGeometry;
  private mat_: THREE.MeshBasicMaterial;
  private meshAdded_: boolean;

  constructor(config: IPointLayerConfig) {
    this.threeLayer_ = new ThreeLayer({
      width: config.width,
      height: config.height,
    });
    if (!config.color) {
      config.color = 'red';
    }
    if (!config.radius) {
      config.radius = 10;
    }
    if (!config.segments) {
      config.segments = 30;
    }
    if (!config.lineWidth) {
      config.lineWidth = 10;
    }
    this.config_ = config;
    const innerRadius = this.config_.fill ? 0 : this.config_.radius - this.config_.lineWidth;
    this.geo_ =
        new THREE.RingGeometry(
          innerRadius, 
          this.config_.radius, 
          this.config_.segments
        );
    this.mat_ = new THREE.MeshBasicMaterial({color: this.config_.color, side: THREE.DoubleSide});
    this.mesh_ =  new THREE.Mesh(this.geo_, this.mat_);
  }

  DrawPoint(x: number, y: number) : void {
    if (!this.meshAdded_) {
      this.threeLayer_.Add(this.mesh_);
      this.meshAdded_ = true;
    }

    const mesh = this.mesh_;
    mesh.position.x = x * this.config_.width;
    mesh.position.y = y * this.config_.height;
    mesh.position.z = 0;
  }

  GetEl() : HTMLCanvasElement { return this.threeLayer_.GetDomElement(); }

  Clear() : void {
    this.threeLayer_.RemoveMesh(this.mesh_);
    this.meshAdded_ = false;
  }

  Render(): void {
    this.threeLayer_.Render();
  }
}

/**
 * @public
 */
export interface IRectLayerConfig {
  width: number
  height: number
  rectWidth: number
  rectHeight: number
  color: string
}

/**
 * @public
 */
export class RectLayer implements ILayer {
  private config_: IRectLayerConfig;
  private threeLayer_: ThreeLayer;
  private geo_: THREE.PlaneGeometry;
  private mat_: THREE.MeshBasicMaterial;
  private mesh_: THREE.Mesh;
  private meshAdded_: boolean;

  constructor(config: IRectLayerConfig) {
    this.threeLayer_ = new ThreeLayer({
      width: config.width,
      height: config.height,
    });
    this.config_ = config;
    this.geo_ = new THREE.PlaneGeometry(this.config_.rectWidth, this.config_.rectHeight, 1, 1);
    this.mat_ = new THREE.MeshBasicMaterial({color: this.config_.color, side: THREE.DoubleSide});
    this.mesh_ =  new THREE.Mesh(this.geo_, this.mat_);
  }

  DrawRect(x: number, y: number, rotationInRadians?: number) : void {
    if (!this.meshAdded_) {
      this.threeLayer_.Add(this.mesh_);
      this.meshAdded_ = true;
    }
    const mesh = this.mesh_;
    if (typeof rotationInRadians === 'number') {
      mesh.rotation.z = rotationInRadians;
    }
    mesh.position.x = x * this.config_.width;
    mesh.position.y = y * this.config_.height;
    mesh.position.z = 0;
    this.threeLayer_.Add(this.mesh_);
  }

  GetEl() : HTMLCanvasElement { return this.threeLayer_.GetDomElement(); }

  Clear() : void {
    this.threeLayer_.RemoveMesh(this.mesh_);
    this.meshAdded_ = false;
  }

  Render(): void {
    this.threeLayer_.Render();
  }
}

/**
 * @public
 */
export interface ILandmarkLayerConfig {
  width: number
  height: number
  color?: string
  lineWidth?: number
}

const JOINT_LINKS = [
  [1],
  [2],
  [3],
  [],
  [5],
  [6],
  [7],
  [],
  [9],
  [10],
  [11],
  [],
  [13],
  [14],
  [15],
  [],
  [17],
  [18],
  [19],
  [],
  [0, 4, 8, 12, 16]
];

/**
 * @public
 */
export class LandmarkLayer implements ILayer {
  private pathLayer_: PathLayer;

  constructor(config: ILandmarkLayerConfig) {
    if (!config.color) {
      config.color = 'red';
    }
    if (!config.lineWidth && typeof config.lineWidth !== 'number') {
      config.lineWidth = 2;
    }
    this.pathLayer_ = new PathLayer({
      width: config.width,
      height: config.height,
      lineWidth: config.lineWidth,
      numSmoothPoints: 10,
      color: config.color,
    });
  }

  Draw(coords: number[][]) : void {
    this.Clear();
    for (let i = 0; i < coords.length; ++i) {
      const c = coords[i];

      for (const coordIndex of JOINT_LINKS[i]) {
        const nextC = coords[coordIndex];
        this.pathLayer_.DrawPath([[c[0], c[1]], [nextC[0], nextC[1]]]);
      }
    }
  }

  GetEl() : HTMLCanvasElement { return this.pathLayer_.GetEl(); }

  Clear() : void {
    this.pathLayer_.Clear();
  }

  Render() : void {
    this.pathLayer_.Render();
  }
}

/**
 * @public
 */
export interface IVideoLayerConfig {
  // Crop is specified w.r.t. to the width/height dimensions of the stream.
  crop?: number
  // Width and height to which the stream is resized after cropping.
  width: number
  height: number
  // If true, the video element is flipped horizontally using css.
  virtuallyFlipHorizontal: boolean
  fadeInSeconds?: number
  fadeOutSeconds?: number
}

/**
 * @public
 */
export class VideoLayer implements ILayer {
  private config_: IVideoLayerConfig;
  private video_: HTMLVideoElement;
  private container_: HTMLDivElement;

  constructor(config: IVideoLayerConfig, el: MediaStream | HTMLVideoElement) {
    this.config_ = config;
    this.container_ = document.createElement('div');
    this.container_.style.width = config.width + 'px';
    this.container_.style.height = config.height + 'px';
    this.container_.style.overflow = 'hidden';
    if (el instanceof HTMLVideoElement) {
      this.video_ = el;
    } else {
      this.video_ = CreateVideoElementFromStream(el);
    }

    const videoWidth = this.video_.width;
    const videoHeight = this.video_.height;

    if (!this.config_.crop) {
      this.config_.crop = 0;
    }

    const cropX = this.config_.crop * videoWidth;
    const cropY = this.config_.crop * videoHeight;

    // Compute crop value in pixels after scaling down/up the video. 
    const scaleX = this.config_.width / (videoWidth - 2 * cropX);
    const scaleY = this.config_.height / (videoHeight - 2 * cropY);
    const scaledCropXPx = cropX * scaleX;
    const scaledCropYPx = cropY * scaleY;

    // Stretch/Clinch video to accomodate for crop 
    const newWidth = this.config_.width + scaledCropXPx * 2;
    const newHeight = this.config_.height + scaledCropYPx * 2;
    
    this.video_.style.width = newWidth + 'px';
    this.video_.style.height = newHeight + 'px';
    this.video_.style.top = -scaledCropYPx + 'px';
    this.video_.style.left = -scaledCropXPx + 'px';

    this.video_.style.position = 'relative';
    
    // In case the aspect ratio of the cropped video does not match the original aspect ratio,
    // we need to let the browser stretch/shrink the resized video. Otherwise our calculations
    // are off since the browser would use padding by default.
    this.video_.style.objectFit = 'fill';

    this.container_.appendChild(this.video_);

    if (this.config_.virtuallyFlipHorizontal) {
      this.container_.style.transform = 'scaleX(-1)';
    }
    this.CreateStyles_();
  }

  GetEl() : HTMLDivElement { return this.container_; }

  FadeIn() : void {
    const inName = this.GetFadeInClassName_();
    const outName = this.GetFadeoutClassName_();
    this.GetEl().classList.remove(inName);
    this.GetEl().classList.remove(outName);
    this.GetEl().classList.add(inName);
  }

  FadeOut() : void {
    const inName = this.GetFadeInClassName_();
    const outName = this.GetFadeoutClassName_();
    this.GetEl().classList.remove(inName);
    this.GetEl().classList.remove(outName);
    this.GetEl().classList.add(outName);
  }

  private CreateStyles_() {
    this.CreateFadeInStyle_();
    this.CreateFadeOutStyle_();
  }

  private CreateFadeInStyle_() {
    const name = this.GetFadeInClassName_();
    if (document.getElementById(name)) {
      return;
    }
    const styleEl = document.createElement('style');
    const s = this.config_.fadeInSeconds;
    const fadeInCss = `
    .${name} {
      opacity: 1;
      transition: opacity ${s}s linear;
      visibility: visible;
    }
    `;
    styleEl.innerHTML = fadeInCss;
    styleEl.id = name;
    document.body.appendChild(styleEl);

  }

  private CreateFadeOutStyle_() {
    const name = this.GetFadeoutClassName_();
    if (document.getElementById(name)) {
      return;
    }
    const styleEl = document.createElement('style');
    const s = this.config_.fadeInSeconds;
    const fadeOutCss = `
    .${name} {
      opacity: 0;
      transition: visibility 0s ${s}s, opacity ${s}s linear;
      visibility: hidden;
    }
    `;
    styleEl.innerHTML = fadeOutCss;
    styleEl.id = name;
    document.body.appendChild(styleEl);
  }

  private GetFadeoutClassName_() {
    return `vlfadeout-${this.config_.fadeOutSeconds}`;
  }

  private GetFadeInClassName_() {
    return `vlfadein-${this.config_.fadeInSeconds}`;
  }
}

/**
 * @public
 */
export interface IPathLayerConfig {
  width: number
  height: number
  color?: string
  lineWidth?: number
  numSmoothPoints?: number
}

/**
 * @public
 */
export class PathLayer implements ILayer {
  private config_: IPathLayerConfig;
  private threeLayer_: ThreeLayer;
  private meshes_: THREE.Mesh[];
  private lines_: MeshLine[];
  private mat_: MeshLineMaterial;

  constructor(config: IPathLayerConfig) {
    if (!config.color) {
      config.color = 'black';
    }
    if (!config.lineWidth) {
      config.lineWidth = 5;
    }
    if (!config.numSmoothPoints) {
      config.numSmoothPoints = 10;
    }


    this.config_ = config;
    this.lines_ = [];
    this.meshes_ = [];

    this.threeLayer_ = new ThreeLayer({
      width: config.width,
      height: config.height,
    });

    this.mat_ = new MeshLineMaterial({
      resolution: new THREE.Vector2(this.config_.width, this.config_.height),
      color: this.config_.color,
      lineWidth: this.config_.lineWidth,
      sizeAttenuation: 0,
      useMap: 0,
      opacity: 1,
    });
  }

  DrawPath(path: number[][]) : void {
    const points : THREE.Vector3[] = [];
    for (let i = 0; i < path.length; ++i) {
      points.push(
        new THREE.Vector3(
          path[i][0] * this.config_.width, 
          path[i][1] * this.config_.height, 
          0
        )
      );
    }

    const line = new MeshLine();
    const normal : number[] = [];
    if (this.config_.numSmoothPoints >= 0) {
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
      const smoothPoints = curve.getPoints(this.config_.numSmoothPoints * path.length);
      for (const i of smoothPoints) {
        normal.push(i.x, i.y, 0);
      }
    } else {
      for (const v of points) {
        normal.push(v.x, v.y, 0);
      }
    }
    line.setPoints(normal);
    this.lines_.push(line);
    const mesh = new THREE.Mesh(line, this.mat_);
    this.threeLayer_.Add(mesh);
    this.meshes_.push(mesh);
  }

  Clear() : void {
    for (const el of this.meshes_) {
      this.threeLayer_.RemoveMesh(el);
    }
    for (const el of this.lines_) {
      el.dispose();
    }
    this.lines_ = [];
    this.meshes_ = [];
  }

  Render() : void {
    this.threeLayer_.Render();
  }

  GetEl() : HTMLCanvasElement { return this.threeLayer_.GetDomElement(); }
}

/**
 * @public
 */
export interface IDynamicPathLayerConfig {
  pathLayerConfig: IPathLayerConfig
  maxLinePoints?: number
}

/**
 * @public
 */
export class DynamicPathLayer implements ILayer {
  private pathLayer_: PathLayer;
  private tmpPathLayer_: PathLayer;
  private curPath_: number[][];
  private config_: IDynamicPathLayerConfig;
  private miniStack_: LayerStack;

  constructor(config: IDynamicPathLayerConfig) {
    this.pathLayer_ = new PathLayer(config.pathLayerConfig);
    this.tmpPathLayer_ = new PathLayer(config.pathLayerConfig);
    if (!config.maxLinePoints) {
      config.maxLinePoints = 30;
    }
    this.config_ = config;
    this.miniStack_ = new LayerStack({
      width: this.config_.pathLayerConfig.width,
      height: this.config_.pathLayerConfig.height,
      border: '',
      outline: '',
    });
    this.miniStack_.AddLayer(this.pathLayer_);
    this.miniStack_.AddLayer(this.tmpPathLayer_);
    this.curPath_ = [];
  }

  GetEl() : HTMLDivElement {
    return this.miniStack_.GetEl();
  }

  Clear() : void {
    this.tmpPathLayer_.Clear();
    this.pathLayer_.Clear();
  }

  Render() : void {
    this.pathLayer_.Render();
    this.tmpPathLayer_.Render();
  }

  AddNode(x: number, y: number) : void {
    this.curPath_.push([x, y]);
    if (this.curPath_.length < 2) {
      return;
    }
    this.tmpPathLayer_.Clear();
    if (this.curPath_.length < this.config_.maxLinePoints) {
      this.tmpPathLayer_.DrawPath(this.curPath_);
    } else {
      this.pathLayer_.DrawPath(this.curPath_);
      const newPath : number[][] = [];
      const numKept = Math.min(2, this.curPath_.length);
      for (let i = 0; i < numKept; ++i) {
        newPath.push(this.curPath_[this.curPath_.length - 1 - numKept + i]);
      }
      this.EndPath();
      this.curPath_ = newPath;
    }
  }

  EndPath() : void {
    if (this.curPath_.length >= 2) {
      this.pathLayer_.DrawPath(this.curPath_);
    }
    this.curPath_ = [];
  }
}

/**
 * @public
 */
export interface IFpsLayerConfig {
  width: number
  height: number
  color?: string
  fontSize?: string
  timeBetweenUpdatesMs?: number
}

/**
 * @public
 */
export class FpsLayer {
  private calls_: number;
  private ema_: ExponentialMovingAverage;
  private el_: HTMLDivElement ;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private intervalHandle_: any;

  constructor(config: IFpsLayerConfig) {
    if (!config.color) {
      config.color = '#FF0000';
    }
    if (!config.fontSize) {
      config.fontSize = '25px';
    }
    if (!config.timeBetweenUpdatesMs) {
      config.timeBetweenUpdatesMs = 50;
    }
    this.calls_ = 0;
    this.el_ = document.createElement('div');
    this.el_.style.padding = '3px';
    this.el_.style.width = config.width + 'px';
    this.el_.style.height = config.height + 'px';
    this.el_.style.color = config.color;
    this.el_.style.fontSize = config.fontSize;
    this.el_.style.fontWeight = 'bold';
    this.ema_ = new ExponentialMovingAverage(0.25);

    this.intervalHandle_ = setInterval(() => {
      this.UpdateFps_();
    }, config.timeBetweenUpdatesMs);
  }

  GetEl() : HTMLDivElement {
    return this.el_;
  }

  RegisterCall() {
    this.calls_ += 1;
    setTimeout(() => {
      this.calls_ -= 1;
    }, 1000);
  }

  Stop() {
    clearInterval(this.intervalHandle_);
  }

  private UpdateFps_() {
    this.ema_.Add(this.calls_);
    let fps = this.ema_.Get();
    if (typeof fps !== 'number') {
      fps = 0;
    }
    this.el_.innerText = '' + Math.round(fps) + ' FPS';
  }
}

/**
 * @public
 */
export interface ILayerStackConfig {
  width: number
  height: number
  // Css style
  border?: string
  // Css style
  outline?: string
}

/**
 * @public
 */
export interface ILayer {
  GetEl(): HTMLElement
}

/**
 * @public
 */
export class LayerStack {
  private config_: ILayerStackConfig;
  private layers_: ILayer[];
  private containerEl_: HTMLDivElement;

  constructor(config: ILayerStackConfig) {
    this.config_ = config;
    this.CreateContainerElement_();
    this.layers_ = [];
  }
  private CreateContainerElement_() {
    this.containerEl_ = document.createElement('div');
    this.containerEl_.style.width = '' + this.config_.width + 'px';
    this.containerEl_.style.height = '' + this.config_.height + 'px';
    if (this.config_.border) {
      this.containerEl_.style.border = this.config_.border;
    }
    if (this.config_.outline) {
      this.containerEl_.style.outline = this.config_.outline;
    }
    this.containerEl_.style.position = 'relative';
  }

  AddLayer(layer: ILayer, name?: string) : void {
    const el = layer.GetEl();
    el.style.position = 'absolute';
    el.style.top = '0';
    el.style.left = '0';
    el.style.zIndex = '' + this.layers_.length;
    if (name) {
      el.id = 'fabric-' + name;
    }
    this.containerEl_.appendChild(el);
    this.layers_.push(layer);
  }

  GetEl() : HTMLDivElement {
    return this.containerEl_;
  }
}
