# D3: {game title goes here}

## Game Design Vision

{a few-sentence description of the game mechanics}

## Technologies

- TypeScript for most game code, little to no explicit HTML, and all CSS collected in common `style.css` file
- Deno and Vite for building
- GitHub Actions + GitHub Pages for deployment automation

## Assignments

### D3.a: Core mechanics (token collection and crafting)

Key technical challenge: Assembling a map-based user interface using the Leaflet mapping framework.

## To-Do

- [x] render leaflet map
- [x] generate cells
- [x] create cell contents/interactibility
- [x] random spawning
- [x] set victory to 4

### D3.b: Globe-spanning Gameplay

Key technical challenge: Implementing dynamic location and map generation.

## To-Do

- [x] directional controls
- [x] dynamic map updating (memoryless cells + border)
- [x] coordinate system
- [x] set victory to 16

### D3.c: Object Persistence

Key technical challenge: Preserving map state efficiently.

## To-Do

- [x] cells not visible on the map do not require memory for storage if they have not been modified by the player
- [x] preserve the state of modified cells when they scroll off-screen
- [x] restore them when they return to view

### D3.d: Gameplay Across Real-world Space and Time

Key technical challenge: Integrating real-time geolocation.

## To-Do

- [x] browser geolocation API can be used to control character movement
- [ ] movement uses Facade design pattern
- [ ] localStorage API is used to persist game state
- [ ] new game button
- [x] button to switch between button-based and geolocation-based movement
