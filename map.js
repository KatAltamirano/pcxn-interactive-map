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
const POINTS_TILESET = "altamiranok2.57dgc1ba"; // tileset ID.
const POINTS_LAYER = "pcxn_map_data_0430-dny64l";
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

// Business type → color mapping (expand as needed)
const TYPE_COLORS = {
  "Creation/Production": "#FF5B9C", // pink
  "Distribution (Creative Entity)": "#FF8C42", // orange
  "Distribution (Related Entity)": "#FFC93C", // bright marigold
  "Education/Training": "#60b47d", // lime green
  "Support (Creative Entity)": "#5da6fe", // sky blue
  "Support (Related Entity)": "#C77DFF", // lavender
  Unclassified: "#B5A99E", // warm gray
};

// ── MAP INIT ──────────────────────────────────────────────────────
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/light-v11",
  center: [-122.676, 45.523],
  zoom: 11,
});

map.addControl(new mapboxgl.NavigationControl(), "top-right");

let allFeatures = [];
let activeFilter = null;
let activePopup = null;
let activeTypeFilter = null;
let typeCounts = { groups: {}, types: {} };
let selectedListingId = null;

map.on("load", () => {
  // ── Neighborhood polygons ───────────────────────────────────────
  map.addSource("neighborhoods", {
    type: "vector",
    url: `mapbox://${HOOD_TILESET}`,
  });

  map.addLayer({
    id: "neighborhoods-fill",
    type: "fill",
    source: "neighborhoods",
    "source-layer": HOOD_LAYER,
    paint: {
      "fill-color": "#4A6741",
      "fill-opacity": 0.06,
    },
  });

  map.addLayer({
    id: "neighborhoods-outline",
    type: "line",
    source: "neighborhoods",
    "source-layer": HOOD_LAYER,
    paint: {
      "line-color": "#4A6741",
      "line-width": 1,
      "line-opacity": 0.4,
    },
  });

  map.addLayer({
    id: "neighborhoods-hover",
    type: "fill",
    source: "neighborhoods",
    "source-layer": HOOD_LAYER,
    paint: {
      "fill-color": "#4A6741",
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        0.08,
        0,
      ],
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
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 7],
      "circle-color": [
        "match",
        ["get", "Business Type Classified"],
        "Creation/Production",
        "#FF5B9C",
        "Distribution (Creative Entity)",
        "#FF8C42",
        "Distribution (Related Entity)",
        "#FFC93C",
        "Education/Training",
        "#5FCC85",
        "Support (Creative Entity)",
        "#C77DFF",
        "Support (Related Entity)",
        "#5FA8FF",
        "#B5A99E",
      ],
      "circle-opacity": 0.85,
      "circle-stroke-width": 0.5,
      "circle-stroke-color": "white",
    },
  });

  // Load features for sidebar
  map.once("idle", () => {
    calculateTypeCounts();
    updateSidebar();
  });

  // ── Neighborhood hover ──────────────────────────────────────────
  let hoveredHoodId = null;
  const tooltip = document.getElementById("neighborhood-tooltip");

  map.on("mousemove", "neighborhoods-fill", (e) => {
    if (map.getZoom() > 11.5) {
      tooltip.style.display = "none";
      return;
    }
    map.getCanvas().style.cursor = "pointer";
    if (e.features.length > 0) {
      if (hoveredHoodId !== null) {
        map.setFeatureState(
          {
            source: "neighborhoods",
            sourceLayer: HOOD_LAYER,
            id: hoveredHoodId,
          },
          { hover: false },
        );
      }
      hoveredHoodId = e.features[0].id;
      map.setFeatureState(
        {
          source: "neighborhoods",
          sourceLayer: HOOD_LAYER,
          id: hoveredHoodId,
        },
        { hover: true },
      );
      const mapRect = map.getCanvas().getBoundingClientRect();
      tooltip.style.left = mapRect.left + e.point.x + 12 + "px";
      tooltip.style.top = mapRect.top + e.point.y + 12 + "px";
      const name =
        e.features[0].properties.NAME ||
        e.features[0].properties.name ||
        "Neighborhood";
      tooltip.style.display = "block";
      tooltip.textContent = name;
      console.log("hovering id:", hoveredHoodId);
    }
  });

  map.on("mouseleave", "neighborhoods-fill", () => {
    map.getCanvas().style.cursor = "";
    if (hoveredHoodId !== null) {
      map.setFeatureState(
        {
          source: "neighborhoods",
          sourceLayer: HOOD_LAYER,
          id: hoveredHoodId,
        },
        { hover: false },
      );
    }
    hoveredHoodId = null;
    tooltip.style.display = "none";
  });

  // ── Neighborhood click → zoom ───────────────────────────────────
  map.on("click", "neighborhoods-fill", (e) => {
    if (e.features.length > 0) {
      const bbox = turf_bbox(e.features[0].geometry);
      map.fitBounds(bbox, { padding: 40, duration: 800 });
    }
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
      offset: 10,
    })
      .setLngLat(e.lngLat)
      .setHTML(`<div class="popup-name">${name}</div>`)
      .addTo(map);
  });

  map.on("mouseleave", "businesses-points", () => {
    map.getCanvas().style.cursor = "";
    if (hoverPopup) {
      hoverPopup.remove();
      hoverPopup = null;
    }
  });
});

// ── POPUP ─────────────────────────────────────────────────────────
function showPopup(lngLat, props) {
  if (activePopup) activePopup.remove();

  const name = props["Display Name"] || props["Display.Name"] || "Unknown";
  const type =
    props["Primary_Business_Type"] || props["Primary Business Type"] || "";
  const website = props["Website"] || "";
  const source = props["Source"] || "";
  const sector = props["Sector_Original"] || props["Sector..Original."] || "";

  const websiteHTML = website
    ? `<a class="popup-link" href="${website}" target="_blank">Visit Website →</a>`
    : `<a class="popup-link" href="${FORM_LINK}" target="_blank">Claim This Listing →</a>`;

  const html = `
  <div class="popup-name">${name}</div>
`;

  activePopup = new mapboxgl.Popup({
    closeButton: true,
    maxWidth: "280px",
  })
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(map);
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
    header.textContent = `${group} (${groupCount})`;
    header.classList.toggle("active", activeTypeFilter === group);

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
      const typeCount = typeCounts.types[type] || 0;
      typeEl.textContent = `${type} (${typeCount})`;
      typeEl.classList.toggle("active", activeTypeFilter === type);

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
    <div class="listing-type">${classifiedType || "Unclassified"}</div>    ${discipline ? `<div class="listing-discipline">${discipline}</div>` : ""}
    <div class="listing-detail ${id === selectedListingId ? "open" : ""}" id="detail-${id}">
    <div class="detail-row">
    <span class="detail-key">Business Type</span>
    <span class="detail-value">${primaryType || '<em class="empty">Not yet classified</em>'}</span>  </div>
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
        map.flyTo({ center: coords, zoom: 15, duration: 600 });
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
