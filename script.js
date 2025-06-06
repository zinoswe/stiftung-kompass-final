let stiftungen = [];
let plzDb = {};

// Lade die Stiftungsdaten
fetch("stiftungen.json")
  .then((res) => res.json())
  .then((data) => (stiftungen = data));

// Lade die PLZ-Datenbank (mit Städten ab 10.000 EW)
fetch("plz-db.json")
  .then((res) => res.json())
  .then((data) => (plzDb = data));

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Erdradius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function searchStiftungen() {
  const input = document.getElementById("search").value.trim().toLowerCase();
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  // Eingabe mit PLZ oder Ort vergleichen
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

  // Regionale Stiftungen (nur wenn in Niedersachsen/Bayern)
  const regionals = stiftungen
    .filter(
      (s) =>
        s.typ === "regional" &&
        s.lat && s.lon &&
        s.bundesland.toLowerCase() === bundesland.toLowerCase()
    )
    .map((s) => ({
      ...s,
      dist: haversine(lat, lon, s.lat, s.lon),
    }))
    .filter((s) => s.dist <= 50)
    .sort((a, b) => a.dist - b.dist);

  const bundesweit = stiftungen.filter((s) => s.typ === "bundesweit");

  if (isRegio && regionals.length > 0) {
    resultsDiv.innerHTML += `
      <h2 class="text-xl font-bold text-blue-700 mt-4 mb-2">🔹 Regionale Stiftungen in Ihrer Nähe</h2>`;
    regionals.forEach((s) => {
      resultsDiv.innerHTML += renderStiftung(s, true);
    });
  }

  if (bundesweit.length > 0) {
    resultsDiv.innerHTML += `
      <h2 class="text-xl font-bold text-gray-700 mt-8 mb-2">🌍 Bundesweite Stiftungen</h2>`;
    bundesweit.forEach((s) => {
      resultsDiv.innerHTML += renderStiftung(s, false);
    });
  }

  if (!isRegio && !bundesweit.length) {
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
      <p class="mt-2 text-gray-800 leading-relaxed">
        ${s.beschreibung.slice(0, 400)}...
      </p>
      ${
        s.link
          ? `<a href="${s.link}" target="_blank" class="inline-block mt-3 text-blue-600 hover:underline">🔗 Zum Antrag / Infos</a>`
          : ""
      }
    </div>
  `;
}
