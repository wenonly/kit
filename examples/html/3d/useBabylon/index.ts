import {
  Engine,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  Scene,
  Vector3,
} from "@babylonjs/core";

let engine: Engine;
let canvas: HTMLCanvasElement;

const createScene = function () {
  // Creates a basic Babylon Scene object
  const scene = new Scene(engine);
  // Creates and positions a free camera
  const camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);
  // Targets the camera to scene origin
  camera.setTarget(Vector3.Zero());
  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);
  // Creates a light, aiming 0,1,0 - to the sky
  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  // Dim the light a small amount - 0 to 1
  light.intensity = 0.7;
  // Built-in 'sphere' shape.
  const sphere = MeshBuilder.CreateSphere(
    "sphere",
    { diameter: 2, segments: 32 },
    scene
  );
  // Move the sphere upward 1/2 its height
  sphere.position.y = 1;
  // Built-in 'ground' shape.
  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: 6, height: 6 },
    scene
  );
  return scene;
};

function init() {
  canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  if (canvas) {
    canvas.style.height = window.innerHeight + "px";
    canvas.style.width = window.innerWidth + "px";

    engine = new Engine(canvas, true);

    const scene = createScene(); //Call the createScene function
    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
      scene.render();
    });
    window.addEventListener("resize", function () {
      engine.resize();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => init());
