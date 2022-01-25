/**
 * This is a very minimal example showcasing various features of the Yoha engine.
 * The Example creates a colored box that can be moved using hand movements. Performing
 * a pinch or fist gesture changes the color of the cursor.
 */
import * as yoha from 'yoha'
import {SetCursorColor, SetCursorPosition, SetCursorVisibility, InitializeCursor} from './cursor'

async function Run() {
  // Download models.
  const modelFiles = await yoha.DownloadYohaModelFiles('/box/model.json', '/lan/model.json', (rec, total) => {
    document.body.innerText = 'Download progress: ' + (rec / total) * 100 + '%';
  });

  InitializeCursor();

  // Setup video feed.
  const streamRes = await yoha.CreateMaxFpsMaxResStream();
  if (streamRes.error) { 
    // Non-production ready error handling...
    console.error(error); 
    return ;
  }
  const video = yoha.CreateVideoElementFromStream(streamRes.stream);

  // Run engine.
  // We configure small padding to avoid that users move their hand outside webcam view
  // when trying to move the cursor towards the border of the viewport.
  yoha.StartWebGlEngine({padding: 0.05}, video, modelFiles, res => {
    if (!Math.round(res.isHandPresentProb)) {
      SetCursorVisibility(false);
      return;
    }
    SetCursorVisibility(true);

    // Change color depending on gesture.
    if (Math.round(res.poses.fistProb)) {
      SetCursorColor('red');
    } else if (Math.round(res.poses.pinchProb)) {
      SetCursorColor('green');
    } else {
      SetCursorColor('blue');
    }

    // Change cursor position.
    // We only use one coordinate here...
    SetCursorPosition(...res.coordinates[0])
  });
}

Run();

