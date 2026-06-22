// ── WELCOME MODAL ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const welcomeModal = document.getElementById("welcome-modal");

  document.getElementById("modal-close").addEventListener("click", () => {
    welcomeModal.classList.add("hidden");
  });

  document.getElementById("modal-got-it").addEventListener("click", () => {
    welcomeModal.classList.add("hidden");
  });
});

// ── CONFIG ────────────────────────────────────────────────────────

mapboxgl.accessToken =
  "pk.eyJ1IjoiYWx0YW1pcmFub2syIiwiYSI6ImNtb2MzMzhzOTA4MHkycXE0Zmk5aG0zMmEifQ.BeyBfi3_gakB9akyJJQNjQ";
const POINTS_TILESET = "altamiranok2.cp3x3391qaj7"; // tileset ID.
const POINTS_LAYER = "34bdbfd5dc856387ce40";
const HOOD_TILESET = "altamiranok2.dh00odk5"; // tileset ID
const HOOD_LAYER = "Neighborhood_Boundaries-b864oj";
const FORM_LINK =
  "https://airtable.com/appRU0PaWuoADSbJv/paghsljxDjaHPjacX/form";

const BUSINESS_TYPE_GROUPS = {
  "Creation/Production": [
    "Advertising / Marketing Agency",
    "Architecture Firm",
    "Design Agency",
    "Electronic Publication",
    "Art Studio",
    "Artist/Creative (Individual)",
    "Film/Video Business",
    "Independent Press",
    "Makerspace",
    "Literary Magazine",
    "Manufacturer (Creative Product)",
    "Mobile/Video Game Business",
    "Newspaper",
    "Performing Group",
    "Periodical",
    "Radio Station",
    "Recording Studio",
    "Television Station",
  ],
  "Distribution (Creative Entity)": [
    "Arts Center",
    "Cinema",
    "Cultural Series Organization",
    "Fair / Festival",
    "Gallery / Exhibition Space",
    "Library",
    "Museum (Art)",
    "Museum (Other)",
    "Performance Facility",
    "Retail Store (Creative Products)",
  ],
  "Distribution (Related Entity)": [
    "Coffeehouse / Restaurant / Nightclub",
    "Community Service Organization",
    "Healthcare Facility",
    "Parks and Recreation Department",
    "Religious Organization",
    "School (K-12 Arts Program/Department)",
    "School Committee",
    "Senior Center",
    "Social Services Organization",
  ],
  "Education/Training": [
    "Arts Camp / Institute (short-term experience)",
    "School (Higher Ed Arts Program / Department)",
    "School of the Arts",
  ],
  "Support (Creative Entity)": [
    "Artist Booking / Management Agency",
    "Artist Colony",
    "Arts Council / Agency",
    "Arts Service Organization",
    "Cultural Heritage Organization",
    "Guild / Union / Professional Association",
    "Historical Society / Commission",
    "Humanities Council / Agency",
    "Record Label",
  ],
  "Support (Related Entity)": [
    "Business Service Organization",
    "Foundation / Endowed Organization",
    "Government Department",
    "Individual - Non-Artist",
    "Tourism Office",
  ],
  Unclassified: [],
};

// Business type → color mapping
const TYPE_COLORS = {
  "Creation/Production": "#FF5B9C",
  "Distribution (Creative Entity)": "#FF8C42",
  "Distribution (Related Entity)": "#FFC93C",
  "Education/Training": "#60b47d",
  "Support (Creative Entity)": "#5da6fe",
  "Support (Related Entity)": "#C77DFF",
  Unclassified: "#B5A99E",
};
function colorForType(type) {
  return TYPE_COLORS[type] || TYPE_COLORS["Unclassified"];
}

let selectedPCXNID = null;

// ── MAP INIT ──────────────────────────────────────────────────────
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/light-v11",
  center: [-122.648, 45.524],
  zoom: 11.95,
});

map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));

let allFeatures = [];
let activeFilter = null;
let activePopup = null;
let activeTypeFilter = null;
let typeCounts = { groups: {}, types: {} };
let selectedListingId = null;
let neighborhoodData = null;

map.on("load", () => {
  // ── Neighborhood polygons ───────────────────────────────────────
  map.addSource("neighborhoods", {
    type: "geojson",
    data: "neighborhoods.geojson",
    generateId: true,
  });

  map.addLayer({
    id: "neighborhoods-fill",
    type: "fill",
    source: "neighborhoods",
    paint: {
      "fill-color": "#73b4d9",
      "fill-opacity": 0.06,
    },
  });

  map.addLayer({
    id: "neighborhoods-outline",
    type: "line",
    source: "neighborhoods",
    paint: {
      "line-color": "#6d6962",
      "line-width": 0.5,
      "line-opacity": 0.2,
    },
  });

  map.addLayer({
    id: "neighborhoods-hover",
    type: "fill",
    source: "neighborhoods",
    paint: {
      "fill-color": "#507f99",
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        0.08,
        0,
      ],
    },
  });

  fetch("neighborhoods.geojson")
    .then((res) => res.json())
    .then((data) => {
      neighborhoodData = data;
    });

  // ── COUNTY BOUNDARIES ───────────────────────────────────────────
  map.addSource("counties", {
    type: "vector",
    url: "mapbox://altamiranok2.33ot66gd",
  });

  map.addLayer({
    id: "counties-line",
    type: "line",
    source: "counties",
    "source-layer": "BLM_OR_County_Boundaries_Poly-1wtoil",
    layout: { visibility: "none" },
    paint: {
      "line-color": "#3c4d71",
      "line-width": 1,
      "line-opacity": 0.5,
    },
  });

  // ── METRO BOUNDARY ──────────────────────────────────────────────
  map.addSource("metro", {
    type: "vector",
    url: "mapbox://altamiranok2.bol77rav",
  });

  map.addLayer({
    id: "metro-line",
    type: "line",
    source: "metro",
    "source-layer": "Metro_Boundary-991jfx",
    layout: { visibility: "none" },
    paint: {
      "line-color": "#343790",
      "line-width": 2,
      "line-opacity": 0.7,
    },
  });

  // ── CITY LIMITS ─────────────────────────────────────────────────
  map.addSource("cities", {
    type: "vector",
    url: "mapbox://altamiranok2.bwu3gyn8",
  });

  map.addLayer({
    id: "cities-line",
    type: "line",
    source: "cities",
    "source-layer": "City_Limits-3h18fk",
    layout: { visibility: "none" },
    paint: {
      "line-color": "#6A9BB8",
      "line-width": 1,
      "line-opacity": 0.5,
    },
  });
  // ── Creative businesses points ──────────────────────────────────
  map.addSource("businesses", {
    type: "vector",
    url: `mapbox://${POINTS_TILESET}`,
  });

  map.addLayer({
    id: "businesses-points",
    type: "circle",
    source: "businesses",
    "source-layer": POINTS_LAYER,
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        1.2,
        14,
        2.2,
        17,
        3.5,
      ],
      "circle-color": [
        "match",
        ["get", "Business Type Classified"],
        ...Object.entries(TYPE_COLORS).flatMap(([k, v]) =>
          k === "Unclassified" ? [] : [k, v],
        ),
        TYPE_COLORS["Unclassified"],
      ],
      "circle-opacity": 0.7,
      "circle-stroke-width": 1,
      "circle-stroke-color": [
        "match",
        ["get", "Business Type Classified"],
        ...Object.entries(TYPE_COLORS).flatMap(([k, v]) =>
          k === "Unclassified" ? [] : [k, v],
        ),
        TYPE_COLORS["Unclassified"],
      ],
      "circle-stroke-opacity": 0.6,
    },
  });

  // ── BUSINESS LABELS ─────────────────────────────────────────────
  map.addLayer({
    id: "businesses-labels",
    type: "symbol",
    source: "businesses",
    "source-layer": POINTS_LAYER,
    minzoom: 14.5,
    layout: {
      "text-field": ["get", "Display Name"],
      "text-font": ["DIN Pro Regular", "Arial Unicode MS Regular"],
      "text-size": 14,
      "text-offset": [0, -1.1],
      "text-anchor": "bottom",
      "text-optional": true,
      "text-allow-overlap": false,
      "text-padding": 6,
    },
    paint: {
      "text-color": "#464440",
      "text-halo-color": "#464440",
      "text-halo-width": 0.1,
    },
  });

  // Load features for sidebar
  map.once("idle", () => {
    calculateTypeCounts();
    updateSidebar();
  });

  setupSearch();

  // ── Neighborhood hover ──────────────────────────────────────────
  let hoveredHoodId = null;
  const tooltip = document.getElementById("neighborhood-tooltip");

  map.on("mousemove", "neighborhoods-fill", (e) => {
    map.getCanvas().style.cursor = "pointer";
    if (e.features.length > 0) {
      if (hoveredHoodId !== null) {
        map.setFeatureState(
          { source: "neighborhoods", id: hoveredHoodId },
          { hover: false },
        );
      }
      hoveredHoodId = e.features[0].id;
      map.setFeatureState(
        { source: "neighborhoods", id: hoveredHoodId },
        { hover: true },
      );

      // Tooltip only shows when zoomed out; highlight always works
      if (map.getZoom() > 13) {
        tooltip.style.display = "none";
      } else {
        const mapRect = map.getCanvas().getBoundingClientRect();
        tooltip.style.left = mapRect.left + e.point.x + 12 + "px";
        tooltip.style.top = mapRect.top + e.point.y + 12 + "px";
        const name =
          e.features[0].properties.MAPLABEL ||
          e.features[0].properties.NAME ||
          "Neighborhood";
        tooltip.style.display = "block";
        tooltip.textContent = name;
      }
    }
  });

  map.on("mouseleave", "neighborhoods-fill", () => {
    map.getCanvas().style.cursor = "";
    if (hoveredHoodId !== null) {
      map.setFeatureState(
        {
          source: "neighborhoods",
          id: hoveredHoodId,
        },
        { hover: false },
      );
    }
    hoveredHoodId = null;
    tooltip.style.display = "none";
  });

  // ── Neighborhood click → zoom to neighborhood ─────────────────
  map.on("click", "neighborhoods-fill", (e) => {
    if (e.features.length > 0 && neighborhoodData) {
      const clickedName = e.features[0].properties.MAPLABEL;

      // Find the full feature in the raw GeoJSON by name
      const fullFeature = neighborhoodData.features.find(
        (f) => f.properties.MAPLABEL === clickedName,
      );

      if (fullFeature) {
        const bbox = turf_bbox(fullFeature.geometry);
        map.fitBounds(bbox, { padding: 40, duration: 800 });
      }
    }
  });

  document.getElementById("home-button").addEventListener("click", () => {
    map.flyTo({
      center: [-122.648, 45.524],
      zoom: 11.95,
      duration: 800,
    });
  });

  // ── Business point click → popup ────────────────────────────────
  map.on("click", "businesses-points", (e) => {
    const props = e.features[0].properties;
    const id = props["PCXN ID"] || props["PCXN_ID"] || "";

    // Find the matching listing item in the sidebar
    const item = document.querySelector(`.listing-item[data-id="${id}"]`);

    if (item) {
      // Trigger a click on the listing to expand and highlight it
      item.click();
    }
  });

  map.on("mouseenter", "businesses-points", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "businesses-points", () => {
    map.getCanvas().style.cursor = "";
  });

  // Update sidebar when map moves
  map.on("moveend", updateSidebar);

  let hoverPopup = null;

  map.on("mouseenter", "businesses-points", (e) => {
    map.getCanvas().style.cursor = "pointer";
    const props = e.features[0].properties;
    const name = props["Display Name"] || "Unknown";

    hoverPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      anchor: "bottom",
    })
      .setLngLat(e.lngLat)
      .setHTML(
        `<div class="popup-name"><span class="popup-dot" style="background:${colorForType(props["Business Type Classified"] || "Unclassified")}"></span>${name}</div>`,
      )
      .addTo(map);
  });

  map.on("mouseleave", "businesses-points", () => {
    map.getCanvas().style.cursor = "";
    if (hoverPopup) {
      hoverPopup.remove();
      hoverPopup = null;
    }
  });
  // ── INTERACTIVE LEGEND ──────────────────────────────────────────
  document
    .querySelectorAll("#map-legend input[type=checkbox]")
    .forEach((box) => {
      box.addEventListener("change", (e) => {
        const layerId = e.target.dataset.layer;
        const visibility = e.target.checked ? "visible" : "none";
        map.setLayoutProperty(layerId, "visibility", visibility);
      });
    });

  const legendToggle = document.getElementById("legend-toggle");
  const legendBody = document.getElementById("legend-body");

  legendToggle.addEventListener("click", () => {
    legendBody.classList.toggle("collapsed");
    legendToggle.classList.toggle("collapsed");
  });
});

document.addEventListener("click", (e) => {
  const legend = document.getElementById("map-legend");
  if (!legend.contains(e.target)) {
    document.getElementById("legend-body").classList.add("collapsed");
    document.getElementById("legend-toggle").classList.add("collapsed");
  }
});

// ── POPUP ─────────────────────────────────────────────────────────
function showPopup(lngLat, props) {
  if (activePopup) activePopup.remove();

  const name = props["Display Name"] || props["Display.Name"] || "Unknown";
  const classified = props["Business Type Classified"] || "Unclassified";
  const dotColor = colorForType(classified);

  selectedPCXNID = props["PCXN ID"] || null;
  if (selectedPCXNID) {
    map.setFilter("businesses-labels", [
      "!=",
      ["get", "PCXN ID"],
      selectedPCXNID,
    ]);
  }

  const html = `
  <div class="popup-name">
    <span class="popup-dot" style="background:${dotColor}"></span>${name}
  </div>
`;

  activePopup = new mapboxgl.Popup({
    closeButton: false,
    maxWidth: "280px",
    offset: 12,
    anchor: "bottom", // popup's bottom edge sits at the point
  })
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(map);

  activePopup.on("close", () => {
    selectedPCXNID = null;
    map.setFilter("businesses-labels", null);
  });
}

// ── SIDEBAR ───────────────────────────────────────────────────────
function updateSidebar() {
  const bounds = map.getBounds();
  const features = map.queryRenderedFeatures({
    layers: ["businesses-points"],
  });

  // Deduplicate by PCXN ID
  const seen = new Set();
  const unique = features.filter((f) => {
    const id =
      f.properties["PCXN_ID"] || f.properties["PCXN ID"] || Math.random();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  allFeatures = unique;

  // Build filter chips from unique business types
  //buildFilters(unique);
  renderListings(unique);
  buildBusinessTypeFilter();
}
// ── BUSINESS TYPE FILTER ──────────────────────────────────────────

function buildBusinessTypeFilter() {
  const container = document.getElementById("business-type-filter");
  container.innerHTML = "";

  // Clear button
  const clear = document.createElement("button");
  clear.className = "filter-clear";
  clear.textContent = "All Business Types";
  clear.classList.toggle("active", activeTypeFilter === null);
  clear.addEventListener("click", () => {
    activeTypeFilter = null;
    map.setFilter("businesses-points", null);
    renderListings(allFeatures);
    buildBusinessTypeFilter();
  });
  container.appendChild(clear);

  // Loop over each group
  Object.entries(BUSINESS_TYPE_GROUPS).forEach(([group, types]) => {
    // Group header
    const groupEl = document.createElement("div");
    groupEl.className = "filter-group";

    const header = document.createElement("button");
    header.className = "filter-group-header";
    const groupCount = typeCounts.groups[group] || 0;
    const groupColor = colorForType(group);

    header.innerHTML = `
  <span class="group-dot" style="background:${groupColor}"></span>
  <span class="group-label">${group} (${groupCount})</span>
`;
    header.classList.toggle("active", activeTypeFilter === group);
    header.style.setProperty("--group-color", groupColor);

    // Type list — hidden by default
    const typeList = document.createElement("div");
    typeList.className = "filter-type-list";

    // Check if this group or any of its types is active — if so expand it
    const groupIsActive =
      activeTypeFilter === group || types.includes(activeTypeFilter);
    if (groupIsActive) typeList.classList.add("expanded");

    // Click group header → filter to whole group
    header.addEventListener("click", () => {
      typeList.classList.toggle("expanded");
      if (activeTypeFilter === group) {
        activeTypeFilter = null;
        map.setFilter("businesses-points", null);
        renderListings(allFeatures);
      } else {
        activeTypeFilter = group;
        if (group === "Unclassified") {
          map.setFilter("businesses-points", [
            "any",
            ["==", ["get", "Business Type Classified"], ""],
            ["!has", "Business Type Classified"],
          ]);
          const filtered = allFeatures.filter(
            (f) => !f.properties["Business Type Classified"],
          );
          renderListings(filtered);
        } else {
          map.setFilter("businesses-points", [
            "in",
            ["get", "Business Type Classified"],
            ["literal", [group]],
          ]);
          const filtered = allFeatures.filter(
            (f) => f.properties["Business Type Classified"] === group,
          );
          renderListings(filtered);
        }
      }

      buildBusinessTypeFilter();
    });

    // Individual types
    types.forEach((type) => {
      const typeEl = document.createElement("button");
      typeEl.className = "filter-type-item";
      const groupColor = colorForType(group);
      typeEl.style.backgroundColor = `${groupColor}22`; // 22 = ~13% opacity
      typeEl.style.borderColor = `${groupColor}88`; // 88 = ~53% opacity
      typeEl.style.color = "#3a3a3a";
      const typeCount = typeCounts.types[type] || 0;
      typeEl.textContent = `${type} (${typeCount})`;
      typeEl.classList.toggle("active", activeTypeFilter === type);
      if (activeTypeFilter === type) {
        typeEl.style.backgroundColor = groupColor;
        typeEl.style.color = "white";
      }

      typeEl.addEventListener("click", (e) => {
        e.stopPropagation();
        if (activeTypeFilter === type) {
          activeTypeFilter = null;
          map.setFilter("businesses-points", null);
          renderListings(allFeatures);
        } else {
          activeTypeFilter = type;
          map.setFilter("businesses-points", [
            "==",
            ["get", "Primary Business Type"],
            type,
          ]);
          const filtered = allFeatures.filter(
            (f) => f.properties["Primary Business Type"] === type,
          );
          renderListings(filtered);
        }
        buildBusinessTypeFilter();
      });

      typeList.appendChild(typeEl);
    });

    groupEl.appendChild(header);
    groupEl.appendChild(typeList);
    container.appendChild(groupEl);
  });
}

function buildFilters(features) {
  const types = [
    ...new Set(
      features
        .map(
          (f) =>
            f.properties["Business Type Classified"] ||
            f.properties["Business Type Classified"] ||
            "",
        )
        .filter(Boolean),
    ),
  ].sort();

  const container = document.getElementById("filters");
  container.innerHTML = "";

  // All chip
  const allChip = document.createElement("button");
  allChip.className = "filter-chip" + (activeFilter === null ? " active" : "");
  allChip.textContent = "All";
  allChip.onclick = () => {
    activeFilter = null;
    buildFilters(allFeatures);
    renderListings(allFeatures);
  };
  container.appendChild(allChip);

  types.forEach((type) => {
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (activeFilter === type ? " active" : "");
    chip.textContent = type.length > 22 ? type.slice(0, 20) + "…" : type;
    chip.title = type;
    chip.onclick = () => {
      activeFilter = type;
      buildFilters(allFeatures);
      const filtered = allFeatures.filter(
        (f) =>
          (f.properties["Business Type Classified"] ||
            f.properties["Business Type Classified"]) === type,
      );
      renderListings(filtered);
    };
    container.appendChild(chip);
  });
}

function renderListings(features) {
  const container = document.getElementById("listings");
  const count = document.getElementById("result-count");

  const filtered = activeFilter
    ? features.filter(
        (f) =>
          (f.properties["Business Type Classified"] ||
            f.properties["Business Type Classified"]) === activeFilter,
      )
    : features;

  count.textContent = `${filtered.length} ${filtered.length === 1 ? "business" : "businesses"} in view`;

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="no-results">No businesses in this area.<br>Try zooming out.</div>';
    return;
  }

  container.innerHTML = "";

  filtered.forEach((f) => {
    const props = f.properties;
    const name = props["Display Name"] || props["Display.Name"] || "Unknown";
    const classifiedType = props["Business Type Classified"];
    const primaryType = props["Primary Business Type"];
    const site = props["Website"] || "";
    const id = props["PCXN ID"] || props["PCXN_ID"] || "";
    const discipline = props["Primary Discipline"];
    const services = props["Services"];
    const instagram = props["Instagram"];
    const subdisciplines = props["Subdisciplines"];
    const description = props["Description"];
    const coords = f.geometry.coordinates;
    const item = document.createElement("div");
    item.className = "listing-item";
    item.dataset.id = id;
    if (id === selectedListingId) {
      item.classList.add("active");
    }

    // Only show the three summary fields
    item.innerHTML = `
      <div class="listing-name">${name}</div>
      <div class="listing-type" style="background-color: ${colorForType(classifiedType)}22; border: 1px solid ${colorForType(classifiedType)}88; color: #3a3a3a;">${classifiedType || "Unclassified"}</div>     ${discipline ? `<div class="listing-discipline">${discipline}</div>` : ""}
      <div class="listing-detail ${id === selectedListingId ? "open" : ""}" id="detail-${id}">
      <div class="detail-row">
      <span class="detail-key">Business Type</span>
      <span class="detail-value">${primaryType || '<em class="empty">Not yet classified</em>'}</span>
     </div>
      <div class="detail-row">
      <span class="detail-key">Primary Discipline</span>
      <span class="detail-value">${discipline || '<em class="empty">Not yet classified</em>'}</span>
      </div>
      <div class="detail-row">
      <span class="detail-key">Subdisciplines</span>
      <span class="detail-value">
      ${
        subdisciplines
          ? `<div class="tag-chips">${subdisciplines
              .split(",")
              .map(
                (s) => `<span class="tag-chip discipline">${s.trim()}</span>`,
              )
              .join("")}</div>`
          : '<em class="empty">None listed</em>'
      }
    </span>
  </div>
  <div class="detail-row">
    <span class="detail-key">Services</span>
    <span class="detail-value">
      ${
        services
          ? `<div class="tag-chips">${services
              .split(",")
              .map((s) => `<span class="tag-chip service">${s.trim()}</span>`)
              .join("")}</div>`
          : '<em class="empty">None listed</em>'
      }
    </span>
  </div>
  <div class="detail-row">
    <span class="detail-key">Description</span>
    <span class="detail-value">${description || '<em class="empty">No description provided</em>'}</span>
  </div>
  <div class="detail-row">
    <span class="detail-key">Website</span>
    <span class="detail-value">
      ${site ? `<a class="detail-link" href="${site}" target="_blank" onclick="event.stopPropagation()">${site}</a>` : '<em class="empty">Not provided</em>'}
    </span>
  </div>
  <div class="detail-row">
    <span class="detail-key">Instagram</span>
    <span class="detail-value">
      ${instagram ? `<a class="detail-link" href="${instagram}" target="_blank" onclick="event.stopPropagation()">${instagram}</a>` : '<em class="empty">Not provided</em>'}
    </span>
  </div>
</div>
`;

    item.addEventListener("click", () => {
      if (selectedListingId === id) {
        selectedListingId = null;
      } else {
        selectedListingId = id;
        showPopup({ lng: coords[0], lat: coords[1] }, props);
      }
      renderListings(allFeatures);
    });

    container.appendChild(item);
  });
  if (selectedListingId) {
    const selected = document.querySelector(
      `.listing-item[data-id="${selectedListingId}"]`,
    );
    if (selected)
      selected.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function calculateTypeCounts() {
  // Query all features from the source — this gets everything, not just rendered
  const allRecords = map.querySourceFeatures("businesses", {
    sourceLayer: POINTS_LAYER,
  });

  // Deduplicate by PCXN ID
  const seen = new Set();
  const unique = allRecords.filter((f) => {
    const id =
      f.properties["PCXN.ID"] || f.properties["PCXN_ID"] || Math.random();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // Tally counts
  const groups = {};
  const types = {};

  unique.forEach((f) => {
    const group = f.properties["Business Type Classified"];
    const type = f.properties["Primary Business Type"];

    if (group) {
      groups[group] = (groups[group] || 0) + 1;
    } else {
      groups["Unclassified"] = (groups["Unclassified"] || 0) + 1;
    }

    if (type) types[type] = (types[type] || 0) + 1;
  });

  typeCounts = { groups, types };
}

function highlightListing(id) {
  document
    .querySelectorAll(".listing-item")
    .forEach((el) => el.classList.remove("active"));
  const el = document.querySelector(`.listing-item[data-id="${id}"]`);
  if (el) {
    el.classList.add("active");
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// ── TURF BBOX (inline, no import needed) ─────────────────────────
function turf_bbox(geometry) {
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;
  const coords =
    geometry.type === "Polygon"
      ? geometry.coordinates
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates.flat()
        : [];
  coords.forEach((ring) =>
    ring.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }),
  );
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}
// ── SEARCH ────────────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById("search-input");
  const resultsBox = document.getElementById("search-results");

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    resultsBox.innerHTML = "";

    if (query.length < 2) return;

    // Search all features in the source, not just rendered
    const all = map.querySourceFeatures("businesses", {
      sourceLayer: POINTS_LAYER,
    });

    // Deduplicate and filter by name match
    const seen = new Set();
    const matches = [];
    for (const f of all) {
      const name = f.properties["Display Name"] || "";
      const id = f.properties["PCXN ID"] || "";
      if (seen.has(id)) continue;
      if (name.toLowerCase().includes(query)) {
        seen.add(id);
        matches.push(f);
      }
      if (matches.length >= 8) break;
    }

    if (matches.length === 0) {
      resultsBox.innerHTML = '<div class="search-empty">No matches</div>';
      return;
    }

    matches.forEach((f) => {
      const name = f.properties["Display Name"] || "Unknown";
      const coords = f.geometry.coordinates;
      const id = f.properties["PCXN ID"] || "";

      const row = document.createElement("div");
      row.className = "search-result";
      row.textContent = name;
      row.addEventListener("click", () => {
        input.value = "";
        resultsBox.innerHTML = "";
        selectedListingId = id;
        map.flyTo({ center: coords, zoom: 15, duration: 600 });
        showPopup({ lng: coords[0], lat: coords[1] }, f.properties);
        renderListings(allFeatures);
      });
      resultsBox.appendChild(row);
    });
  });
}
