<h1 align="center">
  <img src="./logo.png" alt="YoHa" height="250px">
  <br>
  YoHa 
  <br>
</h1>
<h4 align="center">A practical hand tracking engine. </h4>
<br>

<h2>
  Quick Links:
</h2>
<ul>
  <li><a href="https://handtracking.io/draw_demo" target="_blank">Demo</a> <a href="https://github.com/handtracking-io/yoha/blob/master/src/demos/draw/entry.ts">(Code)</a></li>
  <li><a href="https://github.com/handtracking-io/yoha/tree/master/docs">Docs</a></li>
</ul>

<h2>Installation</h2>

`npm install @handtracking.io/yoha`

Please note:

- You need to serve the files from `node_modules/@handtracking.io/yoha`. (<a href="https://github.com/handtracking-io/yoha/blob/1aa0217e63a66113b2517bbca2cb60967881e505/webpack.config.js#L48">Webpack Example</a>)
- You need to serve your page with https. (<a href="https://github.com/handtracking-io/yoha/blob/1aa0217e63a66113b2517bbca2cb60967881e505/webpack.config.js#L20">Webpack Example</a>)
- You <i>should</i> use cross-origin isolation as it improves the engine's performance in certain scenarios. (<a href="https://github.com/handtracking-io/yoha/blob/1aa0217e63a66113b2517bbca2cb60967881e505/webpack.config.js#L15">Webpack Example</a>)

<h2>Description</h2>

YoHa is a hand tracking engine that is built with the goal of being a versatile solution
in practical scenarios where hand tracking is employed to add value to
an application. While ultimately the goal is to be a general purpose hand
tracking engine supporting any hand pose, the engine evolves
around specific hand poses that users/developers find useful. These poses 
are detected by the engine which allows to build applications with meaningful interactions. 
See the <a href="https://handtracking.io/draw_demo" target="_blank">demo</a> for an example.

YoHa is currently only available for the web.

YoHa is currently in beta.

About the name: YoHa is short for ("<b>Yo</b>ur <b>Ha</b>nd Tracking").

## Technical Details

YoHa was built from scratch. It uses a custom neural
network trained using a custom dataset. The backbone for the
inference in the browser is currently <a
target="_blank" href="https://github.com/tensorflow/tfjs">TensorFlow.js</a> 

### Features:

<ul>
  <li>Detection of 21 2D-landmark coordinates (single hand).</li>
  <li>Hand presence detection.</li>
  <li>Hand orientation (left/right hand) detection.</li>
  <li>Inbuilt pose detection.</li>
</ul>

#### Supported hand poses:

<ul>
  <li>Pinch</li>
  <li>Fist</li>
</ul>

<b>Your desired pose is not on this list? Feel free to create a GitHub issue for it.</b>

### Performance

YoHa was built with performance in mind. It is able to provide realtime user
experience on a broad range of laptops and desktop devices. The performance
on mobile devices is not great which hopefuly will change with the further
development of inference frameworks like 
<a target="_blank" href="https://github.com/tensorflow/tfjs">TensorFlow.js</a>

Please note that native inference speed can not be compared
with the web inference speed. Differently put, if you were to 
run YoHa natively it would be much faster than via the web
browser.

## Alternatives

The most prominent hand tracking solution for the web is from <a
target="_blank" href="https://github.com/google/mediapipe">mediapipe</a>. It
is a very general and performant solution that keeps evolving and
supports a lot of different deployment methods. In terms of performance the
solution from mediapipe is faster. 
There is <a target="_blank" href="https://blog.tensorflow.org/2021/05/high-fidelity-pose-tracking-with-mediapipe-blazepose-and-tfjs.html">reason to believe</a>
that this is due to mediapipe using a different and <a target="_blank" href="https://github.com/google/mediapipe/issues/877#issuecomment-929615654">closed
source</a> inference engine. 

## About

Hey, I'm Benjamin. I started out making this project because I wanted to make
the web more interactive (especially due to covid imposed home office). Existing
solutions did not offer what I was looking for so I built my own.
<br>
<br>
<a href="mailto:benjamin@handtracking.io">benjamin@handtracking.io</a>

