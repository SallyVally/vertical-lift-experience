# Asset sources

Cabin geometry: created for this concept in Blender, source build-v3.py and elevator-v3.blend.

Poly Haven assets (CC0):
- Walnut Veneer 02: https://polyhaven.com/a/walnut_veneer_02
- Marble 01: https://polyhaven.com/a/marble_01
- Studio Small 09: https://polyhaven.com/a/studio_small_09

Three.js r170, MIT License: https://github.com/mrdoob/three.js/tree/r170
Manrope font: https://fonts.google.com/specimen/Manrope

v4 lighting: direct and indirect diffuse illumination baked in Blender Cycles, 48 samples. Full 2048 px illumination atlas is packed in elevator-v4.blend. A 1024 px Radiance HDR map is used by the website through UV1.
Loading doors: rendered in Blender, then split into door-left.png and door-right.png. The cabin is the first section of a scrolling page.

Mobile derivatives: embedded model textures resized to 512 px (AO 1024 px), the geometry is unchanged. HDR environment and illumination maps resized in Blender to 512 px. Loading doors converted to WebP; the external mobile walnut color map is 1024 px WebP. Originals remain available for the desktop profile.

Corridor luminaires use project-authored screen-space ribbon shaders with smooth coverage. Portrait layout reuses the original walnut geometry, baked UV illumination and material for the control-panel pilaster.
