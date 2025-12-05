import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";
import "./style.css";

// === Constants ===
const TILE_DEGREES = 1e-4;
const PIT_SPAWN_PROBABILITY = 0.1;

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
mapElement.style.width = "100%";
mapElement.style.height = "100vh";
document.body.appendChild(mapElement);

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// === UI Setup ===
const statusPanel = document.createElement("div");
statusPanel.style.position = "absolute";
statusPanel.style.top = "10px";
statusPanel.style.left = "10px";
statusPanel.style.zIndex = "1000";
statusPanel.style.backgroundColor = "white";
statusPanel.style.padding = "10px";
statusPanel.style.border = "1px solid #ccc";
statusPanel.style.borderRadius = "5px";
statusPanel.innerHTML = "Inventory: Empty";
document.body.appendChild(statusPanel);

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

function updateStatus() {
  if (inventory === null) {
    statusPanel.innerHTML = "Inventory: Empty";
  } else {
    statusPanel.innerHTML = `Inventory: Token Value ${inventory}`;
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
      const bounds = getCellBounds({ i, j });
      const value = getCellValue(i, j);

      let color = "transparent";
      if (value > 0) {
        color = "red"; // Token present
      }

      const rect = leaflet.rectangle(bounds, {
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

        if (distI > 1 || distJ > 1) {
          console.log("Too far");
          return;
        }

        console.log(
          `Clicked cell (${i}, ${j}). Value: ${value}. Inventory: ${inventory}`,
        );

        if (value > 0) {
          // Collect or Craft
          if (inventory === null) {
            // Collect
            console.log("Collecting token");
            inventory = value;
            setCellValue(i, j, 0);
            updateStatus();
          } else if (inventory === value) {
            // Craft
            console.log("Crafting token");
            // inventory += value; // This line was redundant/confusing in previous logic
            // updateStatus();
            // setCellValue(i, j, 0);

            // Correct crafting logic:
            // 1. Remove token from inventory (it merges into the cell)
            inventory = null;
            // 2. Cell value doubles
            setCellValue(i, j, value * 2);
            updateStatus();
          }
        } else {
          // Deposit?
          if (inventory !== null) {
            console.log("Depositing token");
            setCellValue(i, j, inventory);
            inventory = null;
            updateStatus();
          } else {
            console.log("Cannot deposit: inventory empty");
          }
        }
        console.log(`End click. Inventory: ${inventory}`);
      });

      // Popup for info (optional but helpful)
      if (value > 0) {
        rect.bindTooltip(`Value: ${value}`);
      }
    }
  }

  // Player marker
  const playerMarker = leaflet.marker(playerPosition);
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
