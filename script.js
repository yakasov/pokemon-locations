const P = new Pokedex.Pokedex();
const ids = {};
const noEncounters = [];
const noEntries = [];
const versions = [
  "red",
  "blue",
  "yellow",
  "gold",
  "silver",
  "crystal",
  "ruby",
  "sapphire",
  "emerald",
  "firered",
  "leafgreen",
  "diamond",
  "pearl",
  "platinum",
  "heartgold",
  "soulsilver",
  "black",
  "white",
  "black-2",
  "white-2",
  "x",
  "y",
  "omega-ruby",
  "alpha-sapphire",
  "sun",
  "moon",
  "ultra-sun",
  "ultra-moon",
  "lets-go-pikachu",
  "lets-go-eevee",
  "sword",
  "shield",
  "the-isle-of-armor",
  "the-crown-tundra",
  "brilliant-diamond",
  "shining-pearl",
  "legends-arceus",
  "scarlet",
  "violet",
  "the-teal-mask",
  "the-indigo-disk",
];
const neatenedVersions = versions.map(neatenName);
const fetchedVersions = [];
let selectedVersions = [];
let inputs;

async function getVersions() {
  (await P.getVersions()).results
    .map((v) => v.name)
    .forEach((v) => fetchedVersions.push(v));

  const unknownDiv = document.getElementById("gen0");
  fetchedVersions.forEach((v) => {
    if (!versions.includes(v)) {
      unknownDiv.innerHTML += `
      <tr class="row-width">
        <td>
          <input type="checkbox" onchange="updateVersion('${v}')" />
          ${neatenName(v)}
        </td>
      </tr>
    `;
    }
  });
}

function updateVersion(v) {
  if (selectedVersions.includes(v)) {
    selectedVersions = selectedVersions.filter((e) => e !== v);
  } else {
    selectedVersions.push(v);
  }
}

function loadFromLocalStorage() {
  let load = JSON.parse(localStorage.getItem("pokemon"));
  if (load) {
    document.getElementById("inputTextArea").value = load.inputs.join("\n");
    selectedVersions = load.selectedVersions;
    selectedVersions.forEach(
      (v) => (document.getElementById(`checkbox-${v}`).checked = true)
    );
  }
}

function saveToLocalStorage() {
  localStorage.setItem(
    "pokemon",
    JSON.stringify({
      inputs,
      selectedVersions,
    })
  );
}

async function getPokemon() {
  // Convert to Set to remove duplicate entries
  inputs = [
    ...new Set(
      document.getElementById("inputTextArea").value.split("\n").map(neatenName)
    ),
  ];
  saveToLocalStorage();
  await getIdsCSV();
  await createDivs();
}

async function getIdsCSV() {
  // Converts ids.csv from 001,Bulbasaur into { Bulbasaur: "001", ... } dict
  // will need fetching when more Pokemon release
  (await fetch("./ids.csv").then((r) => r.text()))
    .replaceAll("\r", "")
    .split("\n")
    .map((e) => e.split(","))
    .forEach((e) => (ids[`${e[1]}`] = e[0]));
}

async function buildEncounterInfo(k, version) {
  let encounterInfo = [];
  let encounterAreaData;

  try {
    if (!noEntries.includes(k)) {
      encounterAreaData = (await P.getPokemonEncounterAreas(ids[k])).filter(
        (e) => e.version_details.some((ve) => ve.version.name === version)
      );
    } else {
      return [];
    }
  } catch (e) {
    // Happens if getPokemonEncounterAreas returns a 404
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
      neatenName(version),
      locationText,
      `${details.chance < 10 ? "&numsp;" : ""}${details.chance}% chance`,
      levelText,
      conditionText,
    ]);
  }

  return encounterInfo;
}

function neatenName(s) {
  s = s
    .replaceAll("-", " ")
    .split(" ")
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(" ")
    .trim();
  return s === "Xd"
    ? "XD"
    : s.includes("Lets Go")
    ? `Let's Go, ${s.split(" ").slice(-1)[0]}!`
    : s;
}

async function getEvoAndHatchText(k) {
  const speciesData = await P.getPokemonSpeciesByName(k);
  if (!speciesData.evolution_chain) {
    return "";
  }

  const evolutionChainData = (
    await P.getEvolutionChainById(
      speciesData.evolution_chain.url.split("/").slice(-2)[0]
    )
  ).chain;
  if (!evolutionChainData) {
    return "";
  }

  const [chain, evoDetails] = expandChain(evolutionChainData, k);
  const locationInChain = chain.indexOf(k);
  const canHatch = speciesData.hatch_counter > 0;
  const chainString =
    locationInChain !== 0
      ? chain.slice(0, locationInChain + 1).join(" -> ")
      : "";
  const hatchString =
    locationInChain == 0 && canHatch && chain.length > 1
      ? `Hatch from Egg of ${chain.slice(1).join(" or ")}`
      : "";
  return [chainString, evoDetails.slice(0, locationInChain), hatchString];

  /*
    Quick note in case this breaks in the future (likely):
    This is a pretty naive approach to figuring out the evolution details.

    Essentially, when generating the evolution details list,
    it throws together a string of Pokémon: details. In a chain of 3 Pokémon,
    where each evolution has a requirement, if we want to see just the requirements for 
    the first evolution, we can just use the locationInChain var and slice the 
    evolution details list, slicing up to the required Pokémon (so a chain of 3 Pokémon
    with 2 evolution details will be sliced to just be the first element, which works).

    This approach will completely break if a chain of 3 has only one evolution detail - for example,
    if Pokémon 1 -> 2 for some reason doesn't have a detail (even thought it should have a level-up trigger),
    then Pokémon 2 -> 3 detail will be shown for evolving into Pokémon 2. This is a pretty fringe case
    I think, but I'm writing this when it inevitably breaks and I don't understand why.

    It could be this case never, ever happens if every Pokémon has proper evolution details set up,
    but there is definitely a chance that's not true. I dunno.
  */
}

function expandChain(e, k, arr = [], evoDetails = []) {
  arr.push(neatenName(e.species.name));
  if (e.evolves_to.length) {
    const evolvesTo =
      e.evolves_to.length > 1
        ? e.evolves_to.filter((ev) => neatenName(ev.species.name) === k)[0]
        : e.evolves_to[0];
    if (evolvesTo) {
      evoDetails = getAdditionalEvoInfo(evolvesTo, evoDetails);
      return expandChain(evolvesTo, k, arr, evoDetails);
    }
  }

  return [arr, evoDetails];
}

function getAdditionalEvoInfo(details, evoDetails) {
  const specificDetails = Object.entries(
    Object.values(details.evolution_details)[0]
  ).filter(([, v]) => v !== null && v !== false && v !== "");
  if (specificDetails.length) {
    evoDetails.push(
      `${neatenName(details.species.name)}: ${specificDetails
        .map(([k, v]) => `${k}: ${v.name ?? v}`)
        .join(", ")}`
    );
  }

  return evoDetails;
}

async function createDivs() {
  let divs = [];
  inputs.forEach(async (k) => {
    const v = ids[k];
    if (v) {
      const encounterInfo = [];
      for (const version of selectedVersions) {
        encounterInfo.push(...(await buildEncounterInfo(k, version)));
      }

      const [chainString, evoDetails, hatchString] = await getEvoAndHatchText(
        k
      );

      if (!encounterInfo.length && !chainString && !hatchString) {
        if (!noEntries.includes(k)) {
          noEncounters.push(k);
        }

        return;
      }

      encounterInfo.sort(
        (a, b) => neatenedVersions.indexOf(a) - neatenedVersions.indexOf(b)
      );
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
            ${
              encounterInfo.length
                ? `<p style="margin-bottom: 0;"><b>Encounter Info:</b></p>
              <div class="max-width">
                ${encounterText}
              </div>`
                : ""
            }

            ${
              chainString
                ? `<p style="margin-bottom: 0"><b>Evolution Info:</b></p>
              <div class="max-width">
                <p>
                  ${chainString}<br />
                  ${evoDetails.join("<br />")}
                </p>
              </div>`
                : ""
            }

            ${
              hatchString
                ? `<p style="margin-bottom: 0"><b>Hatch Info:</b></p>
              <div class="max-width">
                <p>
                  ${hatchString}
                </p>
              </div>`
                : ""
            }
          </div>
        </div>
        <hr class="solid-line" />`,
      ]);

      document.body.innerHTML =
        `
          <p><b>Unknown entries:</b> ${noEntries.join(", ")}</p>
          <p><b>Unavailable encounters:</b> ${noEncounters.join(", ")}</p>
          <p>Unknown entries could not be found through the API (when looking for encounters) - make sure your spelling is correct.<br />Unavailable encounters have no data attached to them for the given games - they may be distribution only, or simply not exist in the given list of games.</p>
        ` +
        divs
          .sort((a, b) => a[0] - b[0])
          .map((d) => d[1])
          .join("");
    } else {
      noEntries.push(k);
    }
  });
}
