# Set in Stone — Bay Area drag monument prototype

A mobile-first web prototype with a custom illustrated regional map, seven shows imported from `Map Info.xlsx`, and camera previews for the two supplied monument artworks. Its nocturnal violet, electric blue, cyan, and magenta palette follows the two supplied visual references. The map is a generalized illustration covering Sonoma, Napa, Solano, Marin, Contra Costa, Alameda, San Francisco, San Mateo, and Santa Clara counties.

## Run

To see the design immediately, open `set-in-stone-preview.html` from the ZIP in a browser. This single file includes the styling and artwork. For camera and location features, from this folder run `python3 -m http.server 8000` and visit `http://localhost:8000`. On a phone, host the folder over HTTPS. `localhost` is accepted as a secure context by current browsers for local testing.

## Try it

1. Explore the nine-county map. Each show has its own sculptural visual marker. Choose San Francisco or Oakland to filter them; choose a marker for its venue address and participant names. Zoom with the controls and drag the map after zooming. Markers are schematically arranged around the two cities because exact coordinates were not supplied. The map is not for navigation.
2. Open **The collection** for the two monument artworks. Before coordinates are set, their camera views are clearly labeled **Preview mode**. The camera has an illustrated fallback if permission is unavailable. Artwork for the other five shows is marked as forthcoming.
3. Select **Set up a venue** to enter a venue name, address, verified latitude and longitude, radius, story, information link, and optional audio file URL. **Use my current location** fills the coordinate fields when permission is granted; select **Save monument** to apply them.
4. With coordinates saved, the experience uses GPS proximity to unlock available monument artwork. On supported phones, compass heading gives a turn cue. Tap the floating star or **The story** for its translucent card. Audio starts only when **Play sound** is pressed.
5. **Export JSON** downloads the configured text, coordinates, and audio URLs. Settings are otherwise stored only in that browser's localStorage.

## Important prototype boundaries

- The monuments are transparent images in the camera feed, **not tracked 3D objects**. Device compass and GPS can point toward a venue, but cannot place a sculpture precisely on a pavement. Replace this renderer with authored `.glb` models and a supported geospatial AR system, then test alignment at each venue before a public launch.
- Artist names in the screenshots are visual references. Venue coordinates, biographies, outbound links, and recorded music were not supplied, so the defaults are clearly marked as draft. The built-in soundtrack is an original short synthesized instrumental loop, and can be replaced with a licensed audio URL per monument.
- GPS accuracy must be at least as good as the saved unlock radius; browsers often have poorer accuracy around buildings. A 100 m default is used for the demo. Confirm site access, placement, permissions, and accessibility with the artists and venues.
- The addresses and participant names come from the supplied workbook. No coordinates were supplied. The map places seven individual markers schematically near San Francisco and Oakland instead of pretending to pinpoint venues. Five markers are abstract sculpture concepts, not representations of unfinished artist monuments. For deployment across users, confirm exact coordinates and publish curated configuration from a server rather than relying on each browser's localStorage.

Files: `index.html`, `styles.css`, `app.js`, the custom SVG atlas in `assets/`, and the two cutout artworks.
