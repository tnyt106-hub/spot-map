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

//地図レイヤ切り替えロジック
const baseMaps = {
  "１": L.tileLayer("https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"),
  "地理": L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"),
  "標準": L.tileLayer("https://{s}.tile.openstreetmap.jp/{z}/{x}/{y}.png"),
  "航空写真": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}")
};
baseMaps["標準"].addTo(map);
L.control.layers(baseMaps).addTo(map);
const markers = L.markerClusterGroup();

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

        // 現在地へ移動
        map.setView([lat, lng], 14);

        // 既存マーカー削除
        if (currentMarker) {
          map.removeLayer(currentMarker);
        }

        // 現在地マーカー
        currentMarker = L.marker([lat, lng], {
          title: "現在地",
        })
          .addTo(map)
          .bindPopup("📍 現在地")
          .openPopup();
      },
      (err) => {
        alert("現在地を取得できませんでした");
        console.error(err);
      }
    );
  });
} else {
  console.warn("locate-btn が見つかりません");
}

