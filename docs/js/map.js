console.log("map.js loaded");

// =======================
// GA4 helper（最小）
// =======================
function gaPageView(pagePath, title) {
  if (typeof window.gtag !== "function") return; // GA未読込なら何もしない
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_title: title
  });
}

function gaEvent(name, params = {}) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

// =======================
// 地図下スポット表示欄
// =======================
function renderSpotPanel(spot) {
  const panel = document.getElementById("spot-panel");
  if (!panel) return; // HTML側が未設置なら何もしない

  const title = panel.querySelector(".spot-panel__title");
  const cat = document.getElementById("spot-panel-category");
  const area = document.getElementById("spot-panel-area");
  const desc = document.getElementById("spot-panel-desc");
  const google = document.getElementById("spot-panel-google");
  const detail = document.getElementById("spot-panel-detail");

  panel.classList.remove("is-empty");

  const name = spot.name ?? "名称不明";
  title.textContent = name;

  cat.textContent = spot.category ? `#${spot.category}` : "";
  area.textContent =
    (spot.prefecture || spot.municipality)
      ? `${spot.prefecture ?? ""}${spot.municipality ? " " + spot.municipality : ""}`
      : "";

  desc.textContent = spot.description ?? "";

  // Google（ルート検索）
  google.href = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;

  // 詳細ページ（後で作る想定：spot_idが無いなら非表示）
  if (spot.spot_id) {
    detail.href = `./spot/${encodeURIComponent(spot.spot_id)}.html`;
    detail.style.display = "inline-block";
  } else {
    detail.style.display = "none";
  }

  // GA（任意：スポット表示）
  gaEvent("select_content", { content_type: "spot", item_id: spot.spot_id ?? name });
}

// =======================
// 地図下スポット閉じる
// =======================
function clearSpotPanel() {
  const panel = document.getElementById("spot-panel");
  if (!panel) return;

  panel.classList.add("is-empty");

  const title = panel.querySelector(".spot-panel__title");
  if (title) title.textContent = "スポット未選択";

  const cat = document.getElementById("spot-panel-category");
  const area = document.getElementById("spot-panel-area");
  const desc = document.getElementById("spot-panel-desc");

  if (cat) cat.textContent = "";
  if (area) area.textContent = "";
  if (desc) desc.textContent = "";

  // 検索で絞り込み中でも、全件表示に戻す
  markers.clearLayers();
  markerEntries.forEach(e => markers.addLayer(e.marker));

  // 地図を四国全体に戻す
  map.fitBounds(shikokuBounds, { padding: [7, 7] });

  // 開いているポップアップも閉じる（任意だけど気持ちいい）
  map.closePopup();
}

// =======================
// 地図初期化
// =======================
const shikokuBounds = L.latLngBounds(
  [32.82, 132.10],  // 南：32.75 → 32.82（少し詰める）
  [34.52, 134.45]   // 北：34.60 → 34.52（少し詰める）
);
const map = L.map("map", {
  zoomControl: false,
  maxBounds: shikokuBounds,
  maxBoundsViscosity: 1.0
});
map.fitBounds(shikokuBounds, { padding: [7, 7] });

gaPageView("/map", document.title);// GA4 helper（最小）
setTimeout(() => {
  map.invalidateSize();
}, 200);

//地図レイヤ切り替えロジック
const baseMaps = {
  "標準1": L.tileLayer("https://{s}.tile.openstreetmap.jp/{z}/{x}/{y}.png",
    {attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}),
  "標準2": L.tileLayer("https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    {attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles © HOT'}),
  "地理": L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
    {attribution: '© <a href="https://www.gsi.go.jp/">国土地理院</a>'}),
  "航空写真": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {attribution: 'Tiles © <a href="https://www.esri.com/">Esri</a>'})
};

baseMaps["標準1"].addTo(map);
L.control.layers(baseMaps).addTo(map);

const markers = L.markerClusterGroup({
    // 1. 集約の範囲（ピクセル単位）: 
    maxClusterRadius: 40, 
    // 2. クラスタリングを解除するズームレベル
    disableClusteringAtZoom: 16,
    // 3. クラスタをクリックした際に、その範囲までズームするアニメーションの有効化
    showCoverageOnHover: false,
    // 4. マーカーが重なっている場合にクモの巣状に広げる設定
    spiderfyOnMaxZoom: false
});


// =======================
// 検索ボックス用
// =======================
let allSpots = [];
let markerEntries = [];

function createPopupContent(spot) {
  const container = document.createElement("div");
  container.className = "popup-content";

  const title = document.createElement("strong");
  title.textContent = spot.name ?? "名称不明";
  container.appendChild(title);
  container.appendChild(document.createElement("br"));

  if (spot.category) {
    const category = document.createElement("span");
    category.style.fontSize = "0.8em";
    category.style.color = "#666";
    category.textContent = spot.category;
    container.appendChild(category);
    container.appendChild(document.createElement("br"));
  }

  if (spot.image) {
    const image = document.createElement("img");
    image.src = spot.image;
    image.alt = spot.name ?? "スポット画像";
    image.style.width = "100%";
    image.style.height = "auto";
    image.style.marginTop = "5px";
    image.style.borderRadius = "4px";
    container.appendChild(image);
  }

  if (spot.description) {
    const description = document.createElement("p");
    description.style.margin = "8px 0";
    description.style.fontSize = "0.9em";
    description.textContent = spot.description;
    container.appendChild(description);
  }

  const links = document.createElement("div");
  links.style.marginTop = "10px";
  links.style.display = "flex";
  links.style.gap = "5px";
  links.style.flexWrap = "wrap";

  if (spot.url) {
    const detailLink = document.createElement("a");
    detailLink.href = spot.url;
    detailLink.target = "_blank";
    detailLink.rel = "noopener noreferrer";
    detailLink.className = "popup-link-btn";
    detailLink.textContent = "詳細を見る";
    links.appendChild(detailLink);
  }

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
  const routeLink = document.createElement("a");
  routeLink.href = googleMapsUrl;
  routeLink.target = "_blank";
  routeLink.rel = "noopener noreferrer";
  routeLink.className = "popup-link-btn route-btn";
  routeLink.textContent = "Googleマップでルート検索";
  links.appendChild(routeLink);

  container.appendChild(links);

  return container;
}
// =======================
// スポット読み込み
// =======================
fetch("./data/spots.json")
  .then(res => {
    if (!res.ok) throw new Error("spots.json not found");
    return res.json();
  })
  .then(spots => {
    allSpots = spots;   // 検索ボックス用
    console.log("spots:", spots.length);

    spots.forEach(s => {
      if (!s.lat || !s.lng) return;
      const popupContent = createPopupContent(s);
      const marker = L.marker([s.lat, s.lng]).bindPopup(popupContent);
      marker.on("click", () => renderSpotPanel(s)); // 地図下表示用
      markers.addLayer(marker);

     markerEntries.push({ marker, name: s.name ?? "", spot: s });//検索ボックス用
    });

        map.addLayer(markers);

    // ×閉じるボタン（ここで有効化：markerEntriesが埋まった後）
    const closeBtn = document.getElementById("spot-panel-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        clearSpotPanel();
      });
    }

  })
  .catch(err => {
    console.error(err);
    alert("spots.json の読み込みに失敗しました");
  });

// =======================
// 現在地取得ロジック
// =======================
let currentMarker = null;

const locateBtn = document.getElementById("locate-btn");

if (locateBtn) {
  locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("このブラウザは位置情報に対応していません");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      map.flyTo([lat, lng], 14, { duration: 0.7 });

      if (currentMarker) map.removeLayer(currentMarker);

      currentMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup("📍 現在地")
        .openPopup();
    },
    (err) => {
      // ★ 初回許可待ちの可能性が高い
      if (err.code === err.PERMISSION_DENIED) {
        alert(
          "位置情報の使用が許可されていない可能性があります。\n" +
          "ブラウザの設定から許可してください。"
        );
      } else {
        alert(
          "位置情報を取得できませんでした。\n" +
          "端末の設定を確認後、再実行してください。"
        );
      }
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    }
  );
});

} else {
  console.warn("locate-btn が見つかりません");
}

// =======================
// 検索ボックス処理
// =======================
const searchInput = document.getElementById("search-input");
const suggestions = document.getElementById("search-suggestions");
const clearBtn = document.getElementById("search-clear");

function updateClearButton() {
  if (!clearBtn) return;
  clearBtn.style.display = searchInput.value.trim() ? "block" : "none";
}
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearSuggestions();
    updateClearButton();

    // 全件に戻す（既存の×と同じ効果）
    clearSpotPanel();  // ※あなたのclearSpotPanelは全件復帰＋fitBoundsまでやってるのでこれでOK

    searchInput.focus();
  });
}

function clearSuggestions() {
  suggestions.innerHTML = "";
}

function focusMarker(marker, spot) {
  markers.clearLayers();
  markers.addLayer(marker);
  map.flyTo(marker.getLatLng(), 15);
  marker.openPopup();
  if (spot) renderSpotPanel(spot); // 地図下更新用
}

function showSuggestions(keyword) {
  clearSuggestions();
  if (!keyword) return;

  const hits = markerEntries
    .filter(e => e.name.includes(keyword))
    .slice(0, 5);

  hits.forEach(e => {
    const li = document.createElement("li");
    li.textContent = e.name;
    li.addEventListener("click", () => {
      focusMarker(e.marker, e.spot); // ←spotも渡す(地図下表示用)
      clearSuggestions();
    });
    suggestions.appendChild(li);
  });
}
searchInput.addEventListener("input", () => {
  updateClearButton();
  showSuggestions(searchInput.value.trim());
});
function executeSearch() {
  const keyword = searchInput.value.trim();
  clearSuggestions();

  markers.clearLayers();
  let firstHit = null;
  let firstHitSpot = null;

  markerEntries.forEach(e => {
    if (e.name.includes(keyword)) {
      markers.addLayer(e.marker);
      if (!firstHit) {
        firstHit = e.marker;
        firstHitSpot = e.spot;
      }
    }
  });

  if (firstHit) {
    map.flyTo(firstHit.getLatLng(), 15);
    firstHit.openPopup();
    if (firstHitSpot) renderSpotPanel(firstHitSpot);
  }
  updateClearButton();

}

searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") executeSearch();
});

updateClearButton();



