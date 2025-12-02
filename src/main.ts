// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts"; // fixes marker icons
import luck from "./_luck.ts";
import "./style.css";

// === Create and append map container ===
const mapDiv = document.createElement("div");
mapDiv.id = "map";
mapDiv.style.width = "100%";
mapDiv.style.height = "90vh";
document.body.appendChild(mapDiv);

// === Game Settings ===
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
); // Stevenson College, UCSC

const GAMEPLAY_ZOOM = 19; // Fixed zoom for grid precision
const TILE_DEGREES = 1e-4; // ~11 meters per tile
const GRID_RADIUS = 2; // 5x5 grid centered on player (radius 2)

// === Create Leaflet Map ===
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM,
  minZoom: GAMEPLAY_ZOOM,
  maxZoom: GAMEPLAY_ZOOM,
  zoomControl: false,
  scrollWheelZoom: false,
});

// === Add Background Tile Layer ===
leaflet
  .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// === Game State ===
const playerRow = 0; // offset in grid
const playerCol = 0;
let inventory = 0; // player holds 0 or one token value
const statusPanel = document.createElement("div");
statusPanel.id = "statusPanel";
statusPanel.textContent = "Inventory: empty";
document.body.appendChild(statusPanel);

// === Draw Grid Cells ===
function drawGrid() {
  // Clear existing grid cells by removing all rectangle layers marked as grid
  map.eachLayer((layer) => {
    const layerOptions =
      (layer as unknown as { options?: { pane?: string } }).options;
    if (layer instanceof leaflet.Rectangle && layerOptions?.pane === "grid") {
      map.removeLayer(layer);
    }
  });

  // Define grid bounds centered on player
  const minI = playerRow - GRID_RADIUS;
  const maxI = playerRow + GRID_RADIUS;
  const minJ = playerCol - GRID_RADIUS;
  const maxJ = playerCol + GRID_RADIUS;

  for (let i = minI; i <= maxI; i++) {
    for (let j = minJ; j <= maxJ; j++) {
      // Define cell bounds using classroom as origin
      const origin = CLASSROOM_LATLNG;
      const cellBounds = leaflet.latLngBounds([
        [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
        [
          origin.lat + (i + 1) * TILE_DEGREES,
          origin.lng + (j + 1) * TILE_DEGREES,
        ],
      ]);

      // Generate deterministic token value using luck()
      const seed = [i, j, "tokenValue"].toString();
      const hasToken = luck(seed) > 0.5; // 50% chance, but deterministic
      const tokenValue = hasToken ? 1 : 0;

      // Add rectangle for the cell
      const cell = leaflet.rectangle(cellBounds, {
        pane: "grid",
        fillColor: tokenValue > 0 ? "#4CAF50" : "#f0f0f0",
        fillOpacity: 0.7,
        color: "#333",
        weight: 1,
      }).addTo(map);

      // Store token value in cell data
      (cell as unknown as Record<string, number>).tokenValue = tokenValue;

      // Create popup content
      cell.bindPopup(() => {
        const popupDiv = document.createElement("div");

        // Compute distance from player
        const dRow = Math.abs(i - playerRow);
        const dCol = Math.abs(j - playerCol);
        const inRange = dRow <= 1 && dCol <= 1; // 3×3 interaction radius

        // Display token and controls
        if (tokenValue > 0) {
          popupDiv.innerHTML = `
            <div>Cell (${i}, ${j})</div>
            <div>Token: <strong>${tokenValue}</strong></div>
            <div style="margin: 8px 0; font-size: 0.9em; color: ${
            inRange ? "green" : "red"
          }">
              ${inRange ? "InteractionEnabled" : "Too far away"}
            </div>
          `;

          // Only show interaction buttons if in range
          if (inRange) {
            if (inventory === 0 && tokenValue > 0) {
              const collectBtn = document.createElement("button");
              collectBtn.textContent = "Collect";
              collectBtn.addEventListener("click", () => {
                const cellData = cell as unknown as Record<string, number>;
                if (inventory === 0 && cellData.tokenValue > 0) {
                  inventory = cellData.tokenValue;
                  statusPanel.textContent = `Inventory: ${inventory}`;
                  cellData.tokenValue = 0; // remove token from cell
                  cell.setStyle({ fillColor: "#f0f0f0" }); // visual feedback
                  cell.setPopupContent("<div>Collected!</div>"); // update popup
                }
              });
              popupDiv.appendChild(collectBtn);
            } else if (inventory > 0 && tokenValue === inventory) {
              const craftBtn = document.createElement("button");
              craftBtn.textContent = "Craft";
              craftBtn.addEventListener("click", () => {
                const cellData = cell as unknown as Record<string, number>;
                const newValue = inventory * 2;
                statusPanel.textContent = `Crafted! New token: ${newValue}`;
                inventory = newValue;
                // Update cell to show new token value
                cellData.tokenValue = newValue;
                cell.setStyle({ fillColor: "#FF9800" });
                cell.setPopupContent(`
                  <div>Cell (${i}, ${j})</div>
                  <div>Token: <strong>${newValue}</strong></div>
                  <div style="color: green;">Crafted!</div>
                `);

                // Optional: Victory condition
                if (inventory >= 16) {
                  setTimeout(() => {
                    alert(
                      "🎉 Victory! You've crafted a token of value 16 or higher!",
                    );
                  }, 100);
                }
              });
              popupDiv.appendChild(craftBtn);
            } else if (inventory > 0 && tokenValue !== inventory) {
              popupDiv.innerHTML +=
                "<div>Values don't match for crafting.</div>";
            } else if (tokenValue === 0) {
              popupDiv.innerHTML += "<div>No token to collect.</div>";
            }
          } else {
            popupDiv.innerHTML += "<div><em>Move closer to interact</em></div>";
          }
        } else {
          popupDiv.innerHTML =
            `<div>Cell (${i}, ${j})</div><div>No token here.</div>`;
        }

        return popupDiv;
      });
    }
  }

  // === Add Player Marker ===
  const playerMarker = leaflet.marker(CLASSROOM_LATLNG, {
    title: "You are here",
  }).addTo(map);
  playerMarker.bindTooltip("👤 You");
}

// === Initialize Game ===
drawGrid();
