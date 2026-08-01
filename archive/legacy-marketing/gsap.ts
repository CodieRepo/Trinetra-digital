import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

// --- Free Eases and Plugins (Included in public NPM "gsap" package) ---
import { CustomEase } from "gsap/CustomEase";
import { RoughEase, ExpoScaleEase, SlowMo } from "gsap/EasePack";
import { Draggable } from "gsap/Draggable";
import { Flip } from "gsap/Flip";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Observer } from "gsap/Observer";
import { PixiPlugin } from "gsap/PixiPlugin";
import { EaselPlugin } from "gsap/EaselPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { TextPlugin } from "gsap/TextPlugin";

// --- Premium Plugins (Requires GSAP Club membership / private npm token) ---
// If you purchase a license and configure your .npmrc with npm.greensock.com,
// you can uncomment these imports and add them to gsap.registerPlugin().
//
// import { CustomBounce } from "gsap/CustomBounce";
// import { CustomWiggle } from "gsap/CustomWiggle";
// import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
// import { GSDevTools } from "gsap/GSDevTools";
// import { InertiaPlugin } from "gsap/InertiaPlugin";
// import { MotionPathHelper } from "gsap/MotionPathHelper";
// import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
// import { Physics2DPlugin } from "gsap/Physics2DPlugin";
// import { PhysicsPropsPlugin } from "gsap/PhysicsPropsPlugin";
// import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
// import { ScrollSmoother } from "gsap/ScrollSmoother";
// import { SplitText } from "gsap/SplitText";

// Register all standard free plugins
gsap.registerPlugin(
  useGSAP,
  ScrollTrigger,
  ScrollToPlugin,
  Draggable,
  Flip,
  Observer,
  MotionPathPlugin,
  TextPlugin,
  EaselPlugin,
  PixiPlugin,
  CustomEase,
  RoughEase,
  ExpoScaleEase,
  SlowMo
);

// Define pre-calculated organic custom eases (replacing paid wiggles/bounces)
CustomEase.create("warm-out", "M0,0 C0.25,0.46 0.45,0.94 1,1");
CustomEase.create("editorial-spring", "M0,0 C0.175,0.885 0.32,1.1 1,1");
CustomEase.create("luxury-slow", "M0,0 C0.1,0 0.2,1 1,1");

export {
  gsap,
  useGSAP,
  ScrollTrigger,
  ScrollToPlugin,
  Draggable,
  Flip,
  Observer,
  MotionPathPlugin,
  TextPlugin,
  EaselPlugin,
  PixiPlugin,
  CustomEase,
  RoughEase,
  ExpoScaleEase,
  SlowMo,
};
