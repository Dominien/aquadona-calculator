// ---------------------------------------------------------
// 1) Constants & helper functions
// ---------------------------------------------------------
console.log("Initializing constants...");
const SPUELUNG_SAISONAL_M3 = 3.5;
const SPUELUNG_JAEHRLICH_M3 = 6.5;
const HYGIENE_REINIGUNG_KOSTEN = 1000;
const DOPPELBEPROBUNG_KOSTEN = 500;

const WEEKS_IN_YEAR = 52.1429;
const WEEKS_IN_SEASON = 180 / 7;
const CO2_FACTOR = 0.00013;
const PLASTIC_FACTOR = 1;

function parseNumber(value) {
  console.log(`Parsing value: ${value}`);
  let sanitized = value
    .replace(/[^\d.,\-+]/g, '')
    .replace(',', '.');
  const result = parseFloat(sanitized) || 0;
  console.log(`Parsed result: ${result}`);
  return result;
}

function formatMoney(val) {
  return val.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' €';
}

function formatNumber(val, fraction = 3) {
  return val.toLocaleString('de-DE', {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction
  });
}

// ---------------------------------------------------------
// 2) Sync usage input from slider handle
// ---------------------------------------------------------
function syncUsageFromSlider() {
  console.log("Syncing slider value...");
  const sliderHandle = document.querySelector('[fs-rangeslider-element="handle"]');
  const usageInput = document.getElementById('benutzung-prozent');
  
  if (!sliderHandle || !usageInput) {
    console.error("Slider handle or usage input not found!");
    return;
  }

  let sliderVal = sliderHandle.getAttribute('aria-valuenow');
  if (!sliderVal || isNaN(parseFloat(sliderVal))) {
    const textEl = sliderHandle.querySelector('[fs-rangeslider-element="display-value"]');
    sliderVal = textEl?.innerText || '0';
  }
  
  console.log(`Setting usage input to: ${sliderVal}`);
  usageInput.value = sliderVal;
}

// ---------------------------------------------------------
// 3) Main calculation on button click
// ---------------------------------------------------------
document.getElementById('calc-all').addEventListener('click', function (e) {
  e.preventDefault();
  console.log("\n--- Starting calculation ---");

  // Sync slider value
  syncUsageFromSlider();

  // Validate required fields
  console.log("Validating required fields...");
  const requiredFields = [
    'menschen-gesamt', 'benutzung-prozent', 'ml-pro-betaetigung',
    'trinkwasserpreis', 'entsorgung-preis', 'beprobung-kosten-gesamt',
    'beprobung-kosten-saisonal', 'beprobung-times-ganz', 'beprobung-times-saisonal'
  ];

  const missingFields = requiredFields.filter(id => {
    const el = document.getElementById(id);
    const val = el?.value.trim();
    if (!val) console.warn(`Missing value for field: ${id}`);
    return !val;
  });

  if (missingFields.length > 0) {
    console.error("Validation failed: Missing required fields");
    alert('Bitte alle Felder ausfüllen, bevor Sie berechnen.');
    return;
  }

  // Parse inputs
  console.log("\nParsing inputs:");
  const inputs = {
    menschenGesamt: parseNumber(document.getElementById('menschen-gesamt').value),
    benutzungProzent: parseNumber(document.getElementById('benutzung-prozent').value),
    mlProBetaetigung: parseNumber(document.getElementById('ml-pro-betaetigung').value),
    trinkwasserpreis: parseNumber(document.getElementById('trinkwasserpreis').value),
    entsorgungPreis: parseNumber(document.getElementById('entsorgung-preis').value),
    beprobungKostenJaehrlich: parseNumber(document.getElementById('beprobung-kosten-gesamt').value),
    beprobungKostenSaisonal: parseNumber(document.getElementById('beprobung-kosten-saisonal').value),
    beprobungTimesJaehrlich: parseNumber(document.getElementById('beprobung-times-ganz').value),
    beprobungTimesSaisonal: parseNumber(document.getElementById('beprobung-times-saisonal').value)
  };
  console.log("Parsed inputs:", inputs);

  // Calculations
  console.log("\nPerforming calculations...");
  const menschenProMonat = inputs.menschenGesamt * (inputs.benutzungProzent / 100);
  const menschenProTag = menschenProMonat / 30;
  const betaetigungenDaily = menschenProTag * 2;
  const betaetigungenJahr = betaetigungenDaily * 365;
  const betaetigungenSaisons = betaetigungenDaily * 180;

  console.log("Basic usage stats:", {
    menschenProMonat,
    menschenProTag,
    betaetigungenDaily,
    betaetigungenJahr,
    betaetigungenSaisons
  });

  // Wasser calculations (OHNE = without flushing)
  const wasserverbrauchJahrOHNE = (betaetigungenJahr * inputs.mlProBetaetigung) / 1_000_000;
  const wasserverbrauchSaisOHNE = (betaetigungenSaisons * inputs.mlProBetaetigung) / 1_000_000;
  
  // GES calculations still needed for costs
  const wasserverbrauchJahrGES = wasserverbrauchJahrOHNE + SPUELUNG_JAEHRLICH_M3;
  const wasserverbrauchSaisonGES = wasserverbrauchSaisOHNE + SPUELUNG_SAISONAL_M3;

  console.log("Water consumption:", {
    wasserverbrauchJahrOHNE,
    wasserverbrauchSaisOHNE,
    wasserverbrauchJahrGES,
    wasserverbrauchSaisonGES
  });

  const wasserPreisProM3 = inputs.trinkwasserpreis + inputs.entsorgungPreis;
  const wasserKostenJahr = wasserverbrauchJahrGES * wasserPreisProM3;
  const wasserKostenSaisonal = wasserverbrauchSaisonGES * wasserPreisProM3;

  console.log("Water costs:", {
    wasserPreisProM3,
    wasserKostenJahr,
    wasserKostenSaisonal
  });

  const anzahlBeprobungenJahr = WEEKS_IN_YEAR / inputs.beprobungTimesJaehrlich;
  const anzahlBeprobungenSais = WEEKS_IN_SEASON / inputs.beprobungTimesSaisonal;
  const beprobungJahr = anzahlBeprobungenJahr * inputs.beprobungKostenJaehrlich;
  const beprobungSaisonal = anzahlBeprobungenSais * inputs.beprobungKostenSaisonal;

  console.log("Sampling costs:", {
    anzahlBeprobungenJahr,
    anzahlBeprobungenSais,
    beprobungJahr,
    beprobungSaisonal
  });

  const gesamtJahr = beprobungJahr + wasserKostenJahr;
  const gesamtSaisonal = beprobungSaisonal + wasserKostenSaisonal + HYGIENE_REINIGUNG_KOSTEN + DOPPELBEPROBUNG_KOSTEN;
  console.log("Total costs:", { gesamtJahr, gesamtSaisonal });

  // Environmental calculations
  const literVerbrauchJahr = wasserverbrauchJahrOHNE * 1000;
  const literVerbrauchSaison = wasserverbrauchSaisOHNE * 1000;
  const co2TonnenJahr = literVerbrauchJahr * CO2_FACTOR;
  const co2TonnenSaison = literVerbrauchSaison * CO2_FACTOR;
  const plasticSavedSaison = literVerbrauchSaison * PLASTIC_FACTOR;
  const plasticSavedJahr = literVerbrauchJahr * PLASTIC_FACTOR;

  console.log("Environmental impact:", {
    literVerbrauchJahr,
    literVerbrauchSaison,
    co2TonnenJahr,
    co2TonnenSaison,
    plasticSavedSaison,
    plasticSavedJahr
  });

  // Update DOM
  console.log("\nUpdating DOM elements...");
  document.getElementById('saison-gesamt-price').textContent = formatMoney(gesamtSaisonal);
  document.getElementById('full-year-gesamt-price').textContent = formatMoney(gesamtJahr);
  
  // CO2 displays
  document.getElementById('saison-tonnen-c02').textContent = `${formatNumber(co2TonnenSaison)} Tonnen C02`;
  document.getElementById('full-tonnen-c02').textContent = `${formatNumber(co2TonnenJahr)} Tonnen C02`;
  
  // Plastic bottle displays
  document.getElementById('plastic-bootles-saison').textContent = formatNumber(plasticSavedSaison);
  document.getElementById('plastic-bootles-gesamt').textContent = formatNumber(plasticSavedJahr);
  
  // Water consumption displays
  document.getElementById('liter-verbrauch-saison').textContent = formatNumber(literVerbrauchSaison);
  document.getElementById('liter-verbrauch-full').textContent = formatNumber(literVerbrauchJahr);
  document.getElementById('m3-verbrauch-saison').textContent = formatNumber(wasserverbrauchSaisOHNE);
  document.getElementById('m3-verbrauch-full').textContent = formatNumber(wasserverbrauchJahrOHNE);
  
  // Spülung displays
  document.getElementById('m3-spuelung-saison').textContent = formatNumber(SPUELUNG_SAISONAL_M3);
  document.getElementById('m3-spuelung-gesamt').textContent = formatNumber(SPUELUNG_JAEHRLICH_M3);

  // Update sliders
  console.log("\nUpdating sliders...");
  const sliderPairs = [
    // Cost sliders
    { 
      saison: gesamtSaisonal, 
      fullYear: gesamtJahr, 
      saisonSliderId: 'saison-gesamt-price-range', 
      fullYearSliderId: 'full-year-gesamt-price-range' 
    },
    // CO2 sliders
    { 
      saison: co2TonnenSaison, 
      fullYear: co2TonnenJahr, 
      saisonSliderId: 'saison-tonnen-c02-range', 
      fullYearSliderId: 'full-tonnen-c02-range' 
    },
    // Liter consumption sliders
    { 
      saison: literVerbrauchSaison, 
      fullYear: literVerbrauchJahr, 
      saisonSliderId: 'liter-verbrauch-saison-range', 
      fullYearSliderId: 'liter-verbrauch-full-range' 
    },
    // m³ consumption sliders (without flushing)
    { 
      saison: wasserverbrauchSaisOHNE, 
      fullYear: wasserverbrauchJahrOHNE, 
      saisonSliderId: 'm3-verbrauch-full-range-saison', 
      fullYearSliderId: 'm3-verbrauch-full-range-gesamt' 
    },
    // Spülung sliders
    { 
      saison: SPUELUNG_SAISONAL_M3, 
      fullYear: SPUELUNG_JAEHRLICH_M3, 
      saisonSliderId: 'm3-spuelung-saison-range', 
      fullYearSliderId: 'm3-spuelung-gesamt-range' 
    },
    // Plastic bottle sliders
    { 
      saison: plasticSavedSaison, 
      fullYear: plasticSavedJahr, 
      saisonSliderId: 'plastic-bootles-range-saison', 
      fullYearSliderId: 'plastic-bootles-range-year' 
    }
  ];

  sliderPairs.forEach(pair => {
    const max = Math.max(pair.saison, pair.fullYear, 1);
    const saisonPercentage = (pair.saison / max) * 100;
    const fullYearPercentage = (pair.fullYear / max) * 100;

    console.log(`Processing slider pair: ${pair.saisonSliderId} / ${pair.fullYearSliderId}`);
    console.log(`Values: Saison=${pair.saison}, FullYear=${pair.fullYear}, Max=${max}`);
    console.log(`Percentages: Saison=${saisonPercentage}%, FullYear=${fullYearPercentage}%`);

    const saisonSlider = document.getElementById(pair.saisonSliderId);
    const fullYearSlider = document.getElementById(pair.fullYearSliderId);

    if (!saisonSlider) console.error(`Slider not found: ${pair.saisonSliderId}`);
    if (!fullYearSlider) console.error(`Slider not found: ${pair.fullYearSliderId}`);

    if (saisonSlider) saisonSlider.style.width = `${saisonPercentage}%`;
    if (fullYearSlider) fullYearSlider.style.width = `${fullYearPercentage}%`;
  });

  console.log("--- Calculation complete ---\n");
});