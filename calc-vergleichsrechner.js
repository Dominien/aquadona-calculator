 // ---------------------------------------------------------
  // 1) Constants & helper functions
  // ---------------------------------------------------------
  const SPUELUNG_SAISONAL_M3     = 3.5;   // Fix: Saisonal Spülung in m³
  const SPUELUNG_JAEHRLICH_M3    = 6.5;   // Fix: Jährlich Spülung in m³
  const HYGIENE_REINIGUNG_KOSTEN = 1000;  // Fix: Hygienische Reinigung (Saisonal)
  const DOPPELBEPROBUNG_KOSTEN   = 500;   // Fix: Doppelbeprobung (Saisonal)

  // We approximate 52.14 Wochen in 365 Tagen and ~25.71 Wochen in 180 Tagen
  const WEEKS_IN_YEAR   = 52.1429; 
  const WEEKS_IN_SEASON = 180 / 7; // ~25.7143

  // Example CO₂ factor: 0.13 kg CO₂ per liter => 0.00013 Tonnen per liter
  const CO2_FACTOR = 0.00013;
  // 1 Liter Wasser = 1 Plastikflasche gespart (simple assumption)
  const PLASTIC_FACTOR = 1;

  // Helper: Safely parse text to float (remove "€", "ml", "m³", etc.)
  function parseNumber(value) {
    let sanitized = value
      .replace(/[^\d.,\-+]/g, '')   // remove currency symbols, text, etc.
      .replace(',', '.');          // convert commas to periods
    return parseFloat(sanitized) || 0;
  }

  // Helper: Format numbers/money in “DE” notation
  function formatMoney(val) {
    return val.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' €';
  }
  function formatNumber(val, fraction=3) {
    return val.toLocaleString('de-DE', {
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction
    });
  }

  // ---------------------------------------------------------
  // 2) Sync usage input from slider handle
  // ---------------------------------------------------------
  function syncUsageFromSlider() {
    const sliderHandle = document.querySelector('[fs-rangeslider-element="handle"]');
    const usageInput   = document.getElementById('benutzung-prozent');
    if(!sliderHandle || !usageInput) return;

    // read the slider handle's aria-valuenow
    let sliderVal = sliderHandle.getAttribute('aria-valuenow');
    // fallback to inside text if needed
    if(!sliderVal || isNaN(parseFloat(sliderVal))) {
      let textEl = sliderHandle.querySelector('[fs-rangeslider-element="display-value"]');
      if(textEl) sliderVal = textEl.innerText;
    }
    usageInput.value = sliderVal || '0';
  }

  // ---------------------------------------------------------
  // 3) Main calculation on button click
  // ---------------------------------------------------------
  document.getElementById('calc-all').addEventListener('click', function(e) {
    e.preventDefault();

    // a) Sync the “Nutzung in Prozent” input from slider
    syncUsageFromSlider();

    // b) Check that all required fields are filled
    const requiredFields = [
      'menschen-gesamt',
      'benutzung-prozent',
      'ml-pro-betaetigung',
      'trinkwasserpreis',
      'entsorgung-preis',
      'beprobung-kosten-gesamt',
      'beprobung-kosten-saisonal',
      'beprobung-times-ganz',
      'beprobung-times-saisonal'
    ];
    const missingFields = requiredFields.filter((id) => {
      const val = document.getElementById(id)?.value.trim();
      return !val; // empty
    });

    if(missingFields.length > 0) {
      alert('Bitte alle Felder ausfüllen, bevor Sie berechnen.');
      return;
    }

    // ---------------------------------------------
    // c) Gather inputs as numbers
    // ---------------------------------------------
    const menschenGesamt           = parseNumber(document.getElementById('menschen-gesamt').value);
    const benutzungProzent         = parseNumber(document.getElementById('benutzung-prozent').value);
    const mlProBetaetigung         = parseNumber(document.getElementById('ml-pro-betaetigung').value);
    const trinkwasserpreis         = parseNumber(document.getElementById('trinkwasserpreis').value);
    const entsorgungPreis          = parseNumber(document.getElementById('entsorgung-preis').value);
    const beprobungKostenJaehrlich = parseNumber(document.getElementById('beprobung-kosten-gesamt').value);
    const beprobungKostenSaisonal  = parseNumber(document.getElementById('beprobung-kosten-saisonal').value);
    const beprobungTimesJaehrlich  = parseNumber(document.getElementById('beprobung-times-ganz').value);
    const beprobungTimesSaisonal   = parseNumber(document.getElementById('beprobung-times-saisonal').value);

    // ---------------------------------------------
    // d) Compute usage basics
    // ---------------------------------------------
    // Menschen pro Monat
    const menschenProMonat = menschenGesamt * (benutzungProzent / 100);
    // Menschen pro Tag
    const menschenProTag = menschenProMonat / 30;
    // Betätigungen pro Tag (jeder nutzt 2x)
    const betaetigungenDaily = menschenProTag * 2;
    // Betätigungen Gesamt (Jahr vs Saisonal)
    const betaetigungenJahr    = betaetigungenDaily * 365;
    const betaetigungenSaisons = betaetigungenDaily * 180;

    // ---------------------------------------------
    // e) Wasserverbrauch (m³) – ohne Spülung
    // ---------------------------------------------
    // ml => Liter => m³ => /1,000,000
    const wasserverbrauchJahrOHNE = (betaetigungenJahr    * mlProBetaetigung) / 1_000_000;
    const wasserverbrauchSaisOHNE = (betaetigungenSaisons * mlProBetaetigung) / 1_000_000;

    // + Spülung
    const wasserverbrauchJahrGES   = wasserverbrauchJahrOHNE  + SPUELUNG_JAEHRLICH_M3;
    const wasserverbrauchSaisonGES = wasserverbrauchSaisOHNE  + SPUELUNG_SAISONAL_M3;

    // ---------------------------------------------
    // f) Wasser-Kosten (Trink + Entsorgung)
    // ---------------------------------------------
    const wasserPreisProM3 = trinkwasserpreis + entsorgungPreis;
    const wasserKostenJahr     = wasserverbrauchJahrGES   * wasserPreisProM3;
    const wasserKostenSaisonal = wasserverbrauchSaisonGES * wasserPreisProM3;

    // ---------------------------------------------
    // g) Beprobungskosten
    //    "4" => alle 4 Wochen => 52.14 / 4 = 13.035 beprobungen pro Jahr
    // ---------------------------------------------
    const anzahlBeprobungenJahr = WEEKS_IN_YEAR   / beprobungTimesJaehrlich;
    const anzahlBeprobungenSais = WEEKS_IN_SEASON / beprobungTimesSaisonal;

    const beprobungJahr     = anzahlBeprobungenJahr * beprobungKostenJaehrlich;
    const beprobungSaisonal = anzahlBeprobungenSais * beprobungKostenSaisonal;

    // ---------------------------------------------
    // h) Gesamtkosten
    // ---------------------------------------------
    // Ganzjahr: beprobung + wasserkosten
    const gesamtJahr = beprobungJahr + wasserKostenJahr;
    // Saisonal: beprobung + wasserkosten + 1000 + 500
    const gesamtSaisonal = beprobungSaisonal + wasserKostenSaisonal 
      + HYGIENE_REINIGUNG_KOSTEN + DOPPELBEPROBUNG_KOSTEN;

    // ---------------------------------------------
    // i) CO₂-Einsparung + Plastikflaschen
    // ---------------------------------------------
    const literVerbrauchJahr   = wasserverbrauchJahrGES   * 1000;
    const literVerbrauchSaison = wasserverbrauchSaisonGES * 1000;
    
    const co2TonnenJahr   = literVerbrauchJahr   * CO2_FACTOR;
    const co2TonnenSaison = literVerbrauchSaison * CO2_FACTOR;

    const plasticSaved = (literVerbrauchJahr + literVerbrauchSaison) * PLASTIC_FACTOR;

    // ---------------------------------------------
    // j) Write results to DOM
    // ---------------------------------------------
    document.getElementById('saison-gesamt-price').textContent    = formatMoney(gesamtSaisonal);
    document.getElementById('full-year-gesamt-price').textContent = formatMoney(gesamtJahr);

    document.getElementById('saison-tonnen-c02').textContent = formatNumber(co2TonnenSaison) + ' Tonnen C02';
    document.getElementById('full-tonnen-c02').textContent   = formatNumber(co2TonnenJahr)   + ' Tonnen C02';

    document.getElementById('plastic-bootles').textContent = formatNumber(plasticSaved);

    document.getElementById('liter-verbrauch-saison').textContent = formatNumber(literVerbrauchSaison);
    document.getElementById('liter-verbrauch-full').textContent   = formatNumber(literVerbrauchJahr);

    document.getElementById('m3-verbrauch-saison').textContent = formatNumber(wasserverbrauchSaisonGES);
    document.getElementById('m3-verbrauch-full').textContent   = formatNumber(wasserverbrauchJahrGES);

    document.getElementById('m3-spuelung-saison').textContent = formatNumber(SPUELUNG_SAISONAL_M3);
    document.getElementById('m3-spuelung-gesamt').textContent = formatNumber(SPUELUNG_JAEHRLICH_M3);
  });