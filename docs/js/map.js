// map.js が読み込まれているか確認
console.log("map.js loaded");

// =======================
// 地図初期化
// =======================
// 四国全域の境界（southWest, northEast）
const shikokuBounds = L.latLngBounds(
  [33.0, 132.8],
  [34.6, 134.0]
);
// 地図初期化（fitBounds を使う）
const map = L.map("map");
map.fitBounds(shikokuBounds, {
  padding: [1, 1], // スマホ用の最小余白
});
// 初期表示後にサイズ再計算（超重要）
setTimeout(() => {
  map.invalidateSize();
}, 200);


// OSMタイル
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// =======================
// スポットピン表示
// =======================
fetch("./data/spots.json")
  .then((res) => {
    if (!res.ok) throw new Error("spots.json not found");
    return res.json();
  })
  .then((spots) => {
    console.log("spots:", spots.length);

    const markers = L.markerClusterGroup();

    spots.forEach((s) => {
      if (!s.lat || !s.lng) return;

      // --- ポップアップ内容（拡充） ---
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
  .catch((err) => {
    console.error(err);
    alert("spots.json の読み込みに失敗しました");
  });

// =======================
// 現在地取得ロジック
// =======================
let currentMarker = null;

// ボタンが存在するかチェック（重要）
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

        // 地図を現在地へ移動
        map.setView([lat, lng], 14);

        // 既存の現在地マーカー削除
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
