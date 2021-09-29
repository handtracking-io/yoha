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
  <li><a href="https://handtracking-io.github.io/yoha">Demo</a> <a href="https://github.com/handtracking-io/yoha/blob/master/src/demos/draw/entry.ts">(Code)</a></li>
  <li><a href="https://github.com/handtracking-io/yoha/tree/master/docs">Docs</a></li>
</ul>

<h2>Installation</h2>

`npm install @handtracking.io/yoha`

Please note:

- You need to serve the files from `node_modules/@handtracking.io/yoha`. (<a href="https://github.com/handtracking-io/yoha/blob/572a9d7612c099c34d1a0830dd5710eaf3adb29c/webpack.config.js#L47">Webpack Example</a>)
- You need to serve your page with https. (<a href="https://github.com/handtracking-io/yoha/blob/572a9d7612c099c34d1a0830dd5710eaf3adb29c/webpack.config.js#L19">Webpack Example</a>)
- You <i>should</i> use cross-origin isolation as it improves the engine's performance in certain scenarios. (<a href="https://github.com/handtracking-io/yoha/blob/572a9d7612c099c34d1a0830dd5710eaf3adb29c/webpack.config.js#L15">Webpack Example</a>)

<h2>Description</h2>

YoHa is a hand tracking engine that is built with the goal of being strong
in practical scenarios where hand tracking is employed to add true value to
an application. While ultimately the goal is to be a general purpose hand
tracking engine supporting <i>any</i> hand pose, the engine is built and will grow
around specific hand poses that users/developers find useful. These poses are detected by the engine which allows
to build applications with novel interactions. See the <a href="https://handtracking-io.github.io/yoha">demo</a>
for an example.

YoHa is currently only available for the web.

YoHa is currently in beta.

About the name: YoHa is short for ("<b>Yo</b>ur <b>Ha</b>nd Tracking").

<h2>Supported Poses</h2>

Currently YoHa supports and detects the following poses:

<ul>
  <li>Pinch</li>
  <li>Fist</li>
</ul>

<b>Your help is needed to expand this list.</b>
Please open an <a href="./issues">issue</a> or vote on an existing one to
communicate which poses you would like to see next.

<h2>Technical Details</h2>

YoHa was build from scratch. It uses a custom neural
network trained using a custom dataset. The backbone for the
inference in the browser is currently <a
target="blank" href="https://github.com/tensorflow/tfjs">TensorFlow.js</a> as
it currently provides the fastest open source inference for the web. However,
this may change in the future depending on how the ML landscape for the web
develops.

Features:
<ul>
  <li>Detection of 21 2D-landmark coordinates (single hand).</li>
  <li>Hand presence detection.</li>
  <li>Hand orientation (left/right hand) detection.</li>
  <li>Inbuilt pose detection.</li>
</ul>

<h3>Performance</h3>

YoHa was build with performance in mind. It is able to provide realtime user
experience on a broad range of laptops and desktop devices. The performance
on mobile devices is not great which hopefuly will change with the further
development of inference frameworks like 
<a target="blank" href="https://github.com/tensorflow/tfjs">TensorFlow.js</a>

Please note that native inference speed can not be compared
with the web inference speed. Differently put, if you were to 
run YoHa natively it would be much faster than via the web
browser.

<h2>Alternatives</h2>

The most prominent hand tracking solution for the web is from <a
target="blank" href="https://github.com/google/mediapipe">mediapipe</a>. It
is a very general and performant solution that keeps evolving and
supports a lot of different deployment methods. In terms of performance the
solution from mediapipe is faster. 
There is <a target="blank" href="https://blog.tensorflow.org/2021/05/high-fidelity-pose-tracking-with-mediapipe-blazepose-and-tfjs.html">reason to believe</a>
this is to an unknown and hard-to-assess extend due to the inference engine that it uses which is closed
source. 

<h2>About</h2>

Hey, I'm Benjamin. I started out making this project because I wanted to make
the web more interactive (especially due to covid imposed home office). Existing
solutions did not offer what I was looking for so I built my own.
<br>
<br>
<a href="mailto:benjamin@handtracking.io">benjamin@handtracking.io</a>

