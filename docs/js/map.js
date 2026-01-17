console.log("map.js loaded");

// =======================
// 地図初期化
// =======================
const shikokuBounds = L.latLngBounds(
  [33.0, 132.8],
  [34.6, 134.0]
);

const map = L.map("map");
map.fitBounds(shikokuBounds, { padding: [1, 1] });

setTimeout(() => {
  map.invalidateSize();
}, 200);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// =======================
// クラスタ生成（★1回だけ）
// =======================
const markers = L.markerClusterGroup({
  iconCreateFunction: function (cluster) {
    const count = cluster.getChildCount();

    let size = "small";
    if (count >= 100) size = "large";
    else if (count >= 30) size = "medium";

    return L.divIcon({
      html: `<div class="cluster ${size}">${count}</div>`,
      className: "custom-cluster",
      iconSize: L.point(50, 50),
    });
  },
});

// =======================
// スポット読み込み
// =======================
fetch("./data/spots.json")
  .then(res => {
    if (!res.ok) throw new Error("spots.json not found");
    return res.json();
  })
  .then(spots => {
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
    });

    map.addLayer(markers);
  })
  .catch(err => {
    console.error(err);
    alert("spots.json の読み込みに失敗しました");
  });
