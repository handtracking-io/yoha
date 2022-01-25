
/**
 * @public
 * Requests a 'post' animation frame.
 * @returns Promise that resolves right after frame has been rendered.
 */
export async function RequestPostAnimationFrame() : Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });
}

/**
 * @public
 * Requests an animation frame.
 * @returns Promise that resolves right before next frame is to be rendered.
 */
export async function RequestAnimationFrame() : Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

