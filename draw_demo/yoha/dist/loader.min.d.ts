
/**
 * @public
 *
 * All types of events that the hand tracking engine may emit. See also {@link IEvent}.
 */
export declare const EventEnum: {
    readonly RESULT: "RESULT";
    readonly LOST: "LOST";
    readonly LATENCY: "LATENCY";
};

/**
 * @public
 *
 * Callback that periodically informs about the progress of a download.
 *
 * @remarks
 *
 * <b>progress</b>: A number in the range [0-1] indicating the progress of fetching the data.
 *
 * @privateRemarks
 *
 * We use 'type' instead of interface here since otherwise the progress parameter doesn't
 * show up in the docs. Also we do not use '\@param' because the documentation also
 * does not show up.
 * Related issue: https://github.com/microsoft/tsdoc/issues/184
 *
 */
export declare type IDownloadProgressCb = (progress: number) => void;

/**
 * @public
 * Hand tracking engine.
 *
 * @privateRemarks
 * XXX make proper example and add it as \@example
 * Usage example:
 * ```
 * engine.Configure();
 * await engine.PrefetchModel((progress) => {
 *   console.log('Download progress is ' + progress * 100 + '%');
 * });
 * await engine.Warmup()
 * await engine.SetUpCameraTrackSource();
 * ```
 *
 */
export declare interface IEngine {
    /**
     * Configures the engine.
     *
     * @param config - Engine configuration.
     */
    Configure(config?: IEngineConfig): void;
    /**
     * Creates a webcam stream and sets it up as source for the handtracking.
     *
     * @remarks
     *
     * This will ask the user for camera access.
     *
     * The created webcam stream uses reasonable default values.
     * For full control over the creation of the stream use {@link IEngine.SetUpCustomTrackSource} instead.
     */
    SetUpCameraTrackSource(): Promise<ISetUpCameraTrackSourceResult>;
    /**
     * Sets up the engine to use an externally created stream as source for the handtracking.
     *
     * @param trackSource - The element to use as source for the handtracking (usually an HTMLVideoElement).
     *
     * @remarks
     *
     * - Use this method for full control over the webcam stream.
     *
     * - If there are no special requirements  on the webcam stream or to get started
     * consider using {@link IEngine.SetUpCameraTrackSource} instead.
     *
     */
    SetUpCustomTrackSource(trackSource: ITrackSource): void;
    /**
     * Fetches the model files and reports download progress.
     *
     * @param progressCb - See {@link IDownloadProgressCb}.
     * @returns A promise that resolves once the download is complete.
     *
     * @remarks
     *
     * - This function can be optionally called before {@link IEngine.Start}
     * and {@link IEngine.Warmup} to fetch the model data while also being able to observe download
     * progress. If omitted, the first call to either {@link IEngine.Start} or {@link IEngine.Warmup}
     * will download the model data which does not provide the ability to observe the download progress.
     *
     * - The engine relies on a machine learning model to
     * perform the hand tracking. This model consists of learned
     * parameters that have to be fetched before the hand tracking can start.
     *
     */
    DownloadModel(progressCb?: IDownloadProgressCb): Promise<void>;
    /**
     * Prepares and optimizes the engine.
     *
     * @returns Promise that resolves once warmup is complete with estimates about the performance that the engine can provide.
     *
     * @remarks
     *
     * - Performs some dry runs to warm up the engine and to find optimal setup.
     *
     * - Requires that {@link IEngine.Configure} was called already.
     *
     */
    Warmup(): Promise<IWarmupResult>;
    /**
     * Starts the engine.
     *
     * @param eventCb - Callback that is called with various events. See {@link IEvent} for
     * more details.
     *
     * @returns Promise that resolves after engine has started.
     */
    Start(eventCb: IEventCb): Promise<void>;
    /**
     * Stops the engine.
     *
     * @returns Promise that resolves once the engine has stopped.
     *
     * @remarks
     *
     * It is possible to reuse the engine by calling {@link IEngine.Start}.
     */
    Stop(): Promise<void>;
    
}

/**
 * @public
 *
 * Engine configuration.
 */
export declare interface IEngineConfig {
    /**
     * If true, mirrors the result coordinates ({@link IResultEvent.coordinates}) along the y axis.
     * In other words, [x, y] becomes [1 - x, y].
     *
     * @privateRemarks
     *
     * This is applied before all other post processing.
     */
    flipX?: boolean;
    /**
     * Starting from the borders, removes a percentage of the analyzed track source.
     *
     * Example: A video with resolution 640x480 would yield landmark coordinates where
     * [0, 0] and [1, 1] correspond to pixel values of [1, 1] and [640, 480] respectively.
     *
     * Setting padding to 0.05 would make [0, 0] and [1, 1] correspond to pixel values of
     * [640 * 0.05, 480 * 0.05] and [640 - 640 * 0.05, 480 - 480 * 0.05] respectively.
     *
     */
    padding?: number;
}

/**
 * @public
 * All events that the hand tracking engine may emit.
 */
export declare type IEvent = IResultEvent | IHandLostEvent | ILatencyEvent;

/**
 * @public
 *
 * Event callback.
 */
export declare type IEventCb = (event: IEvent) => void;

/**
 * @public
 *
 * Event emitted by the engine if a hand was previously detected but is not recognized
 * anymore.
 *
 * @remarks
 *
 *
 * Multiple circumstances can cause this event to occur:
 *
 * <ul>
 *   <li>
 *     The hand is not visible anymore (e.g. because the user moved it outside the webcam's view).
 *   </li>
 *   <li>
 *     The user performs a hand pose that is not supported.
 *   </li>
 *   <li>
 *     The image quality is poor (e.g. due to bad lighting conditions).
 *   </li>
 *   <li>
 *     The user moves the hand too rapidly (more relevant on low-end devices).
 *   </li>
 * </ul>
 */
export declare interface IHandLostEvent {
    /**
     * Unique type ({@link EventEnum}) of this event.
     */
    type: typeof EventEnum.LOST;
}

/**
 * @public
 * Top level API returned by the loading script.
 */
export declare interface IHandTrackingApi {
    /**
     * Creates a new hand tracking engine.
     *
     * @returns A hand tracking engine.
     */
    CreateEngine(): IEngine;
}

/**
 * @public
 * Types of recommendations on how to handle critical events.
 */
/**
 * @public
 * Interface that is implemented by all events that are considered 'critical' with respect
 * to the engine's functioning or performance.
 */
/**
 * @public
 *
 * Event that informs about the time it took to analyze one frame.
 */
export declare interface ILatencyEvent {
    /**
     * Unique type ({@link EventEnum}) of this event.
     */
    type: typeof EventEnum.LATENCY;
    /**
     * Time in milliseconds that it took to analyze the frame.
     */
    latencyMs: number;
}

/**
 * @public
 *
 * The detected hand poses.
 *
 * @privateRemarks
 *
 * <b>[Enterprise Edition Only]</b> Please note that pose detection is only available in the
 * Enterprise Edition of the SDK.
 */
export declare interface IPoses {
    /**
     * Pinch gesture. Tip of index finger and tip of thumb touch.
     */
    pinch: boolean;
    /**
     * Fist gesture. Fingers form a fist.
     */
    fist: boolean;
}

/**
 * @public
 *
 * Event that is emitted by the engine to report the hand tracking results.
 *
 * @remarks
 *
 * Once a hand is detected this event occurs with high frequency.
 */
export declare interface IResultEvent {
    /**
     * Unique type ({@link EventEnum}) of this event.
     */
    type: typeof EventEnum.RESULT;
    /**
     * Array of 21 [x, y] coordinates where x and y are relative coordinates such that
     * [x,y] = [0,0] corresponds to the top left pixel of the track source and [x,y] = [1,1]
     * corresponds to the bottom right pixel of the track source.
     *
     * The array is orderd as follows:
     * <ul>
     *   <li>
     *     [0-3]: Thumb from base to tip.<br>
     *   </li>
     *   <li>
     *     [4-7]: Index finger from base to tip.<br>
     *   </li>
     *   <li>
     *     [8-11]: Middle finger from base to tip.<br>
     *   </li>
     *   <li>
     *     [12-15]: Ring finger from base to tip.<br>
     *   </li>
     *   <li>
     *     [16-19]: Little finger from base to tip.<br>
     *   </li>
     *   <li>
     *     [20]: Base of hand.<br>
     *   </li>
     * </ul>
     */
    coordinates: number[][];
    /**
     * The detected hand orientation.<br><br>
     *
     * Note that this is with respect to the processed video which may or may not be flipped depending
     * on how you retrieved it.
     */
    isLeftHand: boolean;
    /**
     * The detected hand poses. See {@link IPoses} for more details.
     *
     * @privateRemarks
     *
     * <b>[Enterprise Edition Only]</b>
     */
    poses: IPoses;
    
}

/**
 * @public
 *  engine configuration options that can be set on engine start or while the engine is
 * running (via {@link IEngine.Reconfigure})
 */
/**
 * @public
 *  engine Configuration options that can only be set on engine start.
 */
/**
 * The result of a call to {@link IEngine.SetUpCameraTrackSource}.
 *
 * @public
 */
export declare interface ISetUpCameraTrackSourceResult {
    /**
     * The create stream. Set if no error occurred.
     */
    stream?: MediaStream;
    /**
     * The created HTMLVideoElement. Set if no error occurred.
     */
    video?: HTMLVideoElement;
    /**
     * The problem that prevented the stream from being created. Only set if an error occurred.
     */
    error?: ObjValues<typeof MediaStreamErrorEnum>;
}

/**
 * @public
 *
 * The element to be used as source for the handtracking. Usually this is an HTMLVideoElement.
 */
export declare type ITrackSource = HTMLCanvasElement | HTMLVideoElement | HTMLImageElement;

/**
 * @public
 *
 * The result of a call to {@link IEngine.Warmup}.
 *
 * @remarks
 *
 * Please note that the returned performance estimates are based on small
 * samples (to keep the warmup phase as short as possible) and may be
 * inaccurate. For implementing thresholding based on these estimates (e.g. if
 * FPS is below X, disable handtracking) it is recommended to either
 * incorporate decent slack into the threshold or to actually start the engine
 * and collect accurate performance estimates using larger samples.
 */
export declare interface IWarmupResult {
    /**
     * Estimate for the maximum possible FPS that the engine can process.
     */
    maxFpsEstimate: number;
    /**
     * Estimate for the average FPS that the engine can process.
     */
    avgFpsEstimate: number;
}

/**
 * @public
 *
 * Fetches the JavaScript component of the hand tracking API.
 *
 * @privateRemarks
 *
 * The {@link Load} function is part of a separate loader script whose purpose is to load the actual
 * JavaScript code of the hand tracking SDK.
 *
 * @privateRemarks
 *
 * We have a separate loader script because this provides more flexibility: It's okay
 * if people bundle the loader code into their production bundles but it would not
 * work if the engine is included in such a bundle (current approach to web workers would
 * break).
 *
 * @privateRemarks
 *
 * Also we can inject the engine code as inline script which again simplifies work with web workers
 * since this allows us to easily access the engines code if needed for web workers.
 *
 * @param url - Overwrites the default URL from which the API is loaded.
 * @returns A promise that resolves with the handtracking API.
 *
 */
export declare function Load(url: string): Promise<IHandTrackingApi>;

/**
 * @public
 * Possible error types that can occur when calling navigator.mediaDevices.getUserMedia.
 *
 * @remarks
 *
 * See {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#exceptions | here}
 * for more infos.
 */
export declare const MediaStreamErrorEnum: {
    readonly ABORT_ERROR: "AbortError";
    readonly NOT_ALLOWED_ERROR: "NotAllowedError";
    readonly NOT_FOUND_ERROR: "NotFoundError";
    readonly NOT_READABLE_ERROR: "NotReadableError";
    readonly OVERCONSTRAINTED_ERROR: "OverconstrainedError";
    readonly SECURITY_ERROR: "SecurityError";
    readonly TYPE_ERROR: "TypeError";
};

/**
 * @public
 * A small helper that is used to build a type consisting of all values of an object literal.<br/>
 *
 * @example
 * ```
 * const MyEnum =  {
 *    ENUM_VALUE_ONE: "value_one",
 *    ENUM_VALUE_TWO: "value_two",
 * } as const;
 * type PossibleEnumValues = ObjValues<typeof MyEnum>
 * ```
 * Here `PossibleEnumValues` will resolve to the type `'"value_one" | "value_two"'`.
 *
 * @remarks
 *
 * This is used to work around native enums (and some of their limitations) in TypeScript.
 */
export declare type ObjValues<T> = T[keyof T];

export { }
