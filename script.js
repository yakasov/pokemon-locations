const P = new Pokedex.Pokedex();
const ids = {};
const inputs = [
  "Victini",
  "Tepig",
  "Pignite",
  "Emboar",
  "Oshawott",
  "Dewott",
  "Samurott",
  "Sunflora",
  "Flaaffy",
  "Ampharos",
  "Lucario",
  "Magmar",
  "Magmortar",
  "Elekid",
  "Electabuzz",
  "Electivire",
  "Swoobat",
  "Conkeldurr",
  "Skitty",
  "Petilil",
  "Lilligant",
  "Cleffa",
  "Espeon",
  "Umbreon",
  "Leafeon",
  "Glaceon",
  "Darmanitan",
  "Rufflet",
  "Braviary",
  "Mandibuzz",
  "Cofagrigus",
  "Tirtouga",
  "Carracosta",
  "Budew",
  "Solosis",
  "Duosion",
  "Reuniclus",
  "Pinsir",
  "BlitzleSwanna",
  "Escavalier",
  "Accelgor",
  "Probopass",
  "Claydol",
  "Galvantula",
  "Ferrothorn",
  "Eelektross",
  "Fraxure",
  "Haxorus",
  "Beheeyem",
  "Lampent",
  "Chandelure",
  "Tornadus",
  "Thundurus",
  "Landorus",
  "Drapion",
  "Numel",
  "Camerupt",
  "Drifloon",
  "Shuppet",
  "Wingull",
  "Bisharp",
  "Tympole",
  "Weavile",
  "Vanillite",
  "Swinub",
  "Beldum",
  "Golett",
  "Deino",
  "Hydreigon",
  "Slakoth",
  "Igglybuff",
  "Larvitar",
  "Reshiram",
  "Keldeo",
  "Meloetta",
  "Genesect",
];
const noEncounters = [];
const noEntries = [];
const versions = ["platinum", "black", "white", "black-2", "white-2"];

async function getIdsCSV() {
  (await fetch("./ids.csv").then((r) => r.text()))
    .split("\r\n")
    .map((e) => e.split(","))
    .forEach((e) => (ids[`${e[1]}`] = e[0]));
}

async function buildEncounterInfo(k, version) {
  let encounterInfo = [];
  let encounterAreaData;

  try {
    if (!noEntries.includes(k)) {
      encounterAreaData = (await P.getPokemonEncounterAreasByName(k)).filter(
        (e) => e.version_details.some((ve) => ve.version.name === version)
      );
    } else {
      return [];
    }
  } catch (e) {
    if (!noEntries.includes(k)) {
      noEntries.push(k);
    }

    return [];
  }

  for (const l of encounterAreaData) {
    const locationAreaData = await P.getLocationArea(
      l.location_area.url.split("/").slice(-2)[0]
    );
    const locationText = locationAreaData.names.length
      ? locationAreaData.names.find((n) => n.language.name === "en").name
      : locationAreaData.name;

    const details = l.version_details.find((ve) => ve.version.name === version)
      .encounter_details[0];
    const levelText =
      details.min_level === details.max_level
        ? `Level ${details.min_level}`
        : `Levels ${details.min_level} - ${details.max_level}`;
    const conditionText = details.condition_values.length
      ? `Conditions: ${details.condition_values.map((c) => c.name).join(", ")}`
      : "";

    encounterInfo.push([
      version,
      locationText,
      `${details.chance < 10 ? "&numsp;" : ""}${details.chance}% chance`,
      levelText,
      conditionText,
    ]);
  }

  return encounterInfo;
}

async function createDivs() {
  let divs = [];
  Object.entries(ids).forEach(async ([k, v]) => {
    if (inputs.includes(k)) {
      const encounterInfo = [];
      for (const version of versions) {
        encounterInfo.push(...(await buildEncounterInfo(k, version)));
      }

      if (!encounterInfo.length) {
        if (!noEntries.includes(k)) {
          noEncounters.push(k);
        }

        return;
      }

      let encounterText = "";
      for (let i = 0; i < 5; i++) {
        encounterText += `<div class="subcol${i}">
              <p>
                ${encounterInfo.map((e) => e[i]).join("<br />")}
              </p>
            </div>`;
      }

      divs.push([
        v,
        `<div class="max-width">
          <div class="name-column">
            <p>
              <b>#${v}:</b> ${k}
            </p>
          </div>
          <div class="encounter-column">
            <p style="margin-bottom: 0"><b>Encounter Info:</b></p>
            <div class="max-width">
              ${encounterText}
            </div>
          </div>
          <div class="third-width">

          </div>
        </div>`,
      ]);

      document.body.innerHTML =
        `
          <p><b>Unknown entries:</b> ${noEntries.join(", ")}</p>
          <p><b>Unavailable encounters:</b> ${noEncounters.join(", ")}</p>
          <p>Unknown entries could not be found through the API (when looking for encounters). Check your spelling, and make sure they are wild, encounterable Pokémon.<br />Unavailable encounters have no data attached to them for the given games.</p>
        ` +
        divs
          .sort((a, b) => a[0] - b[0])
          .map((d) => d[1])
          .join("");
    }
  });
}

(async () => {
  await getIdsCSV();
  await createDivs();
})();
