console.log("map.js loaded");

// =======================
// 地図初期化
// =======================
const shikokuBounds = L.latLngBounds(
  [33.0, 132.8],
  [34.6, 134.0]
);

const map = L.map("map", {zoomControl: false});
map.fitBounds(shikokuBounds, { padding: [1, 1] });

setTimeout(() => {
  map.invalidateSize();
}, 200);

//地図レイヤ切り替えロジック
const baseMaps = {
  "標準1": L.tileLayer("https://{s}.tile.openstreetmap.jp/{z}/{x}/{y}.png"),
  "標準2": L.tileLayer("https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"),
  "地理": L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"),
  "航空写真": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}")
};
baseMaps["標準1"].addTo(map);
L.control.layers(baseMaps).addTo(map);
const markers = L.markerClusterGroup();


// =======================
// 検索ボックス用
// =======================
let allSpots = [];
let markerEntries = [];

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

      const popupHtml = `
        <div style="min-width:200px">
          <b>${s.name ?? "名称不明"}</b><br>
          <small>${s.category ?? ""}</small><br><br>
          ${s.image ? `<img src="${s.image}" style="width:100%;border-radius:4px"><br><br>` : ""}
          ${s.description ? `<div>${s.description}</div><br>` : ""}
          ${s.url ? `<a href="${s.url}" target="_blank">詳細を見る</a>` : ""}
        </div>
      `;

      const marker = L.marker([s.lat, s.lng]).bindPopup(popupHtml);
      markers.addLayer(marker);

      markerEntries.push({marker,name: s.name ?? ""});//検索ボックス用
    });

    map.addLayer(markers);
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

    map.flyTo([lat, lng], 14, { animate: true });

    if (currentMarker) map.removeLayer(currentMarker);

    currentMarker = L.marker([lat, lng])
      .addTo(map)
      .bindPopup("📍 現在地")
      .openPopup();
  },
  (err) => {
    alert("現在地を取得できませんでした");
  },
  {
    enableHighAccuracy: false, // ★最重要
    timeout: 8000,
    maximumAge: 300000         // 5分キャッシュ
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
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.trim();

    markers.clearLayers();

    if (!keyword) {
      markerEntries.forEach(e => markers.addLayer(e.marker));
      return;
    }

    let firstHit = null;

    markerEntries.forEach(e => {
      if (e.name.includes(keyword)) {
        markers.addLayer(e.marker);
        if (!firstHit) firstHit = e.marker;
      }
    });

    if (firstHit) {
      map.setView(firstHit.getLatLng(), 15);
    }
  });
}
