let stiftungen = [];
let plzDb = {};
let dataLoaded = false;

// Lade beide JSON-Dateien parallel
Promise.all([
  fetch("stiftungen.json").then(res => res.json()),
  fetch("plz-db.json").then(res => res.json())
]).then(([stiftungenData, plzData]) => {
  stiftungen = stiftungenData;
  plzDb = plzData;
  dataLoaded = true;
}).catch(err => {
  console.error("Fehler beim Laden der Daten:", err);
  alert("Daten konnten nicht geladen werden. Bitte Seite neu laden.");
});

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function searchStiftungen() {
  if (!dataLoaded) {
    alert("Daten werden noch geladen. Bitte einen Moment warten.");
    return;
  }

  const input = document.getElementById("search").value.trim().toLowerCase();
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  const plzEntry = Object.entries(plzDb).find(
    ([plz, data]) =>
      plz === input || data.ort.toLowerCase() === input
  );

  if (!plzEntry) {
    resultsDiv.innerHTML = "<p class='text-red-500'>PLZ oder Ort nicht gefunden.</p>";
    return;
  }

  const [plz, ortInfo] = plzEntry;
  const isRegio = ["Niedersachsen", "Bayern"].includes(ortInfo.bundesland);
  const { lat, lon, bundesland } = ortInfo;

  const regionals = stiftungen
    .filter(s => s.typ === "regional" && s.lat && s.lon && s.bundesland === bundesland)
    .map(s => ({ ...s, dist: haversine(lat, lon, s.lat, s.lon) }))
    .filter(s => s.dist <= 50)
    .sort((a, b) => a.dist - b.dist);

  const bundesweit = stiftungen.filter(s => s.typ === "bundesweit");

  if (isRegio && regionals.length) {
    resultsDiv.innerHTML += <h2 class="text-xl font-bold text-blue-700">🔹 Regionale Stiftungen in Ihrer Nähe</h2>;
    regionals.forEach(s => resultsDiv.innerHTML += renderStiftung(s, true));
  }

  if (bundesweit.length) {
    resultsDiv.innerHTML += <h2 class="text-xl font-bold text-gray-700 mt-8">🌍 Bundesweite Stiftungen</h2>;
    bundesweit.forEach(s => resultsDiv.innerHTML += renderStiftung(s, false));
  }

  if (!isRegio && !regionals.length && !bundesweit.length) {
    resultsDiv.innerHTML = "<p class='text-gray-500'>Keine Stiftungen gefunden.</p>";
  }
}

function renderStiftung(s, showDist) {
  return `
    <div class="bg-blue-50 border border-blue-200 p-5 rounded-lg shadow-sm">
      <h2 class="text-xl font-bold text-blue-800">${s.name}</h2>
      <p class="text-sm text-gray-700">
        📍 Bundesland: ${s.bundesland}${showDist && s.dist ? ` – ${s.dist.toFixed(1)} km entfernt` : ""}
      </p>
      <p class="mt-2 text-gray-800">${s.beschreibung.slice(0, 400)}...</p>
      ${s.link ? <a href="${s.link}" target="_blank" class="inline-block mt-3 text-blue-600 hover:underline">🔗 Antrag / Infos</a> : ""}
    </div>
  `;
}
