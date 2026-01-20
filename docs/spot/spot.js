// spot.js はスポット詳細ページの描画を担当する
// 依存を最小限にして、GitHub Pages でも動作するようにしている

// URL から spot_id を取得する
const params = new URLSearchParams(window.location.search);
const spotId = params.get("spot_id");

// 描画に使うDOMをまとめて取得する
const errorSection = document.getElementById("spot-error");
const contentSection = document.getElementById("spot-content");
const titleElement = document.getElementById("spot-title");
const descriptionElement = document.getElementById("spot-description");
const categoryElement = document.getElementById("spot-category");
const areaElement = document.getElementById("spot-area");
const googleLinkElement = document.getElementById("spot-google-link");

// meta description を更新するための取得（存在しない場合は null になる）
const metaDescription = document.querySelector('meta[name="description"]');

// 要素の表示/非表示を一貫させるためのヘルパー
function toggleElement(element, isVisible) {
  if (!element) return;
  element.hidden = !isVisible;
}

// テキストをセットしつつ、空なら非表示にする
function setTextOrHide(element, value) {
  if (!element) return;
  if (value) {
    element.textContent = value;
    element.hidden = false;
  } else {
    element.textContent = "";
    element.hidden = true;
  }
}

// エラー表示に切り替える（spot_id 不正やデータ取得失敗時）
function showError(message) {
  if (errorSection) {
    const messageElement = errorSection.querySelector(".spot-error__text");
    if (messageElement && message) {
      messageElement.textContent = message;
    }
  }
  toggleElement(errorSection, true);
  toggleElement(contentSection, false);
}

// spot_id が無い場合は早めにエラーを出す
if (!spotId) {
  showError("スポットIDが指定されていません。トップページから再度お試しください。");
} else {
  // データを取得して、該当するスポットを描画する
  fetch("../data/spots.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("spots.json not found");
      }
      return response.json();
    })
    .then((spots) => {
      if (!Array.isArray(spots)) {
        throw new Error("spots data is invalid");
      }

      // spot_id が一致するデータを探す
      const spot = spots.find((item) => String(item.spot_id) === String(spotId));
      if (!spot) {
        showError("該当するスポットが見つかりませんでした。");
        return;
      }

      // 表示をメインコンテンツに切り替える
      toggleElement(errorSection, false);
      toggleElement(contentSection, true);

      const spotName = spot.name ?? "名称未設定";
      setTextOrHide(titleElement, spotName);

      // カテゴリは # を付けて表示する
      setTextOrHide(categoryElement, spot.category ? `#${spot.category}` : "");

      // 自治体の表示は pref/municipality を連結する
      const areaText =
        spot.prefecture || spot.municipality
          ? `${spot.prefecture ?? ""}${spot.municipality ? ` ${spot.municipality}` : ""}`.trim()
          : "";
      setTextOrHide(areaElement, areaText);

      // 説明文が無い場合は非表示
      setTextOrHide(descriptionElement, spot.description ?? "");

      // Google マップへのリンクを生成する
      if (googleLinkElement) {
        let googleUrl = "";
        if (spot.google_url) {
          googleUrl = spot.google_url;
        } else if (spot.lat && spot.lng) {
          googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
        }
        if (googleUrl) {
          googleLinkElement.href = googleUrl;
          googleLinkElement.hidden = false;
        } else {
          googleLinkElement.hidden = true;
        }
      }

      // タイトルと meta description をスポットに合わせて更新する
      document.title = `${spotName}｜四国おすすめスポットマップ`;
      if (metaDescription) {
        const descriptionText = spot.description
          ? spot.description
          : `${spotName}の詳細ページです。`;
        metaDescription.setAttribute("content", descriptionText);
      }
    })
    .catch((error) => {
      console.error(error);
      showError("スポット情報の取得に失敗しました。時間をおいて再度お試しください。");
    });
}
