import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";
import "./style.css";

// === Constants ===
const TILE_DEGREES = 1e-4;
const PIT_SPAWN_PROBABILITY = 0.5;
const INTERACTION_RANGE = 3; // Number of cells away player can interact
const VICTORY_THRESHOLD = 16; // Token value needed for victory

// === Game State ===
interface Cell {
  i: number;
  j: number;
}

const playerPosition = {
  lat: 36.9995,
  lng: -122.0533,
};

let inventory: number | null = null;

// === Map Setup ===
const map = leaflet.map(document.createElement("div"), {
  zoomControl: false,
  scrollWheelZoom: false,
  boxZoom: false,
  dragging: false,
  doubleClickZoom: false,
}).setView(playerPosition, 19);

// Append map to body
const mapElement = map.getContainer();
mapElement.id = "map";
document.body.appendChild(mapElement);

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// === UI Setup ===
const statusPanel = document.createElement("div");
statusPanel.id = "statusPanel";
statusPanel.innerHTML = "Inventory: Empty";
document.body.appendChild(statusPanel);

// === Movement Controls ===
const controlPanel = document.createElement("div");
controlPanel.id = "controlPanel";
document.body.appendChild(controlPanel);

function createButton(text: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.className = "move-btn";
  btn.addEventListener("click", onClick);
  return btn;
}

function movePlayer(dLat: number, dLng: number) {
  playerPosition.lat += dLat * TILE_DEGREES;
  playerPosition.lng += dLng * TILE_DEGREES;
  map.setView(playerPosition);
  render();
}

// Create movement buttons
const northBtn = createButton("⬆️ N", () => movePlayer(1, 0));
const southBtn = createButton("⬇️ S", () => movePlayer(-1, 0));
const eastBtn = createButton("➡️ E", () => movePlayer(0, 1));
const westBtn = createButton("⬅️ W", () => movePlayer(0, -1));

const topRow = document.createElement("div");
topRow.appendChild(northBtn);
controlPanel.appendChild(topRow);

const middleRow = document.createElement("div");
middleRow.className = "control-row";
middleRow.appendChild(westBtn);
middleRow.appendChild(eastBtn);
controlPanel.appendChild(middleRow);

const bottomRow = document.createElement("div");
bottomRow.appendChild(southBtn);
controlPanel.appendChild(bottomRow);

// === Helper Functions ===

function getCellBounds(cell: Cell): leaflet.LatLngBounds {
  const lat = cell.i * TILE_DEGREES;
  const lng = cell.j * TILE_DEGREES;

  return leaflet.latLngBounds([
    [lat, lng],
    [lat + TILE_DEGREES, lng + TILE_DEGREES],
  ]);
}

function latLngToCell(lat: number, lng: number): Cell {
  return {
    i: Math.floor(lat / TILE_DEGREES),
    j: Math.floor(lng / TILE_DEGREES),
  };
}

// === Mechanics ===
const activeRectangles: leaflet.Rectangle[] = [];
let playerMarker: leaflet.Marker | null = null;

function updateStatus() {
  if (inventory === null) {
    statusPanel.innerHTML = "Inventory: Empty";
  } else {
    statusPanel.innerHTML = `Inventory: Token Value ${inventory}`;
    if (inventory >= VICTORY_THRESHOLD) {
      statusPanel.innerHTML +=
        `<br><b>🎉 Victory! You reached ${VICTORY_THRESHOLD}!</b>`;
    } else if (inventory >= 4) {
      statusPanel.innerHTML += "<br><b>Success! You reached 4!</b>";
    }
  }
}

// State to track modified cells (collected/crafted)
// Key: "i,j", Value: number (token value) or 0 (empty)
const cellState = new Map<string, number>();

function getCellValue(i: number, j: number): number {
  const key = `${i},${j}`;
  if (cellState.has(key)) {
    return cellState.get(key)!;
  }
  // Default deterministic value
  const cellRandom = luck([i, j, "initialValue"].toString());
  if (cellRandom < PIT_SPAWN_PROBABILITY) {
    return 1; // Initial token value
  }
  return 0; // Empty
}

function setCellValue(i: number, j: number, value: number) {
  const key = `${i},${j}`;
  cellState.set(key, value);
  render(); // Re-render to show changes
}

function render() {
  // Clear existing layers
  activeRectangles.forEach((rect) => map.removeLayer(rect));
  activeRectangles.length = 0;

  const bounds = map.getBounds();
  const northWestCell = latLngToCell(bounds.getNorth(), bounds.getWest());
  const southEastCell = latLngToCell(bounds.getSouth(), bounds.getEast());

  for (let i = southEastCell.i; i <= northWestCell.i; i++) {
    for (let j = northWestCell.j; j <= southEastCell.j; j++) {
      const cellBounds = getCellBounds({ i, j });
      const value = getCellValue(i, j);

      let color = "transparent";
      if (value > 0) {
        color = "red";
      }

      const rect = leaflet.rectangle(cellBounds, {
        color: "black",
        weight: 1,
        fillColor: color,
        fillOpacity: 0.5,
      });

      rect.addTo(map);
      activeRectangles.push(rect);

      // Interaction
      rect.on("click", () => {
        // Check distance
        const playerCell = latLngToCell(playerPosition.lat, playerPosition.lng);
        const distI = Math.abs(i - playerCell.i);
        const distJ = Math.abs(j - playerCell.j);

        if (distI > INTERACTION_RANGE || distJ > INTERACTION_RANGE) {
          return;
        }

        if (value > 0) {
          // Collect or Craft
          if (inventory === null) {
            // Collect token
            inventory = value;
            setCellValue(i, j, 0);
            updateStatus();
          } else if (inventory === value) {
            // Craft: merge inventory token with cell token, doubling value
            inventory = null;
            setCellValue(i, j, value * 2);
            updateStatus();
          }
        } else {
          // Deposit token into empty cell
          if (inventory !== null) {
            setCellValue(i, j, inventory);
            inventory = null;
            updateStatus();
          }
        }
      });

      // Popup for info (optional but helpful)
      if (value > 0) {
        rect.bindTooltip(`Value: ${value}`);
      }
    }
  }

  // Player marker - remove old one first
  if (playerMarker) {
    map.removeLayer(playerMarker);
  }
  playerMarker = leaflet.marker(playerPosition);
  playerMarker.addTo(map);
  playerMarker.bindTooltip("You");
}
// Initialize game
map.whenReady(() => {
  map.invalidateSize();
  render();
});

map.on("moveend", () => {
  render();
});
