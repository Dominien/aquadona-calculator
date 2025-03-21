// ---------------------------------------------------------
// 1) Constants & helper functions
// ---------------------------------------------------------
console.log("Initializing constants...");
const SPUELUNG_SAISONAL_M3 = 3.5;
const SPUELUNG_JAEHRLICH_M3 = 6.5;
const HYGIENE_REINIGUNG_KOSTEN = 1000;
const DOPPELBEPROBUNG_KOSTEN = 500;

// Default values for the calculator
const DEFAULT_WATER_CONSUMPTION_ML = 300;
const DEFAULT_WATER_PRICE = 2.13;
const DEFAULT_WASTEWATER_PRICE = 2.41;
const DEFAULT_POPULATION = 40000;
const DEFAULT_USAGE_PERCENT = 7;

const PLASTIC_FACTOR = 1;

// New CO₂ factors (grams per liter)
const CO2_PLASTIC_PER_LITER = 200;    // 200g CO₂ per liter (plastic)
const CO2_WATER_PER_LITER = 0.35;     // 0.35g CO₂ per liter (water)

function parseNumber(value) {
  console.log(`Parsing value: ${value}`);
  // If value is empty, return 0
  if (!value || value.trim() === '') {
    return 0;
  }
  
  // First remove all non-numeric characters except decimal separators, minus and plus signs
  let sanitized = value.replace(/[^\d.,\-+]/g, '');
    
  // Handle both comma and period as decimal separators
  // Replace all commas with periods for proper parsing
  sanitized = sanitized.replace(/,/g, '.');
  
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

function formatNumber(val) {
  // If the value is a whole number, set fraction digits to 0
  if (val === Math.floor(val)) {
    return val.toLocaleString('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  } else {
    // Otherwise, limit to one decimal place
    return val.toLocaleString('de-DE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }
}

function formatPlasticBottles(val) {
  // Remove any decimal places and format without commas
  return val.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).replace(/\./g, ''); // Remove thousand separators for plastic bottles
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
    'menschen-gesamt',
    'benutzung-prozent',
    'ml-pro-betaetigung',
    'trinkwasserpreis',
    'entsorgung-preis'
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
    mlProBetaetigung: parseNumber(document.getElementById('ml-pro-betaetigung').value) || DEFAULT_WATER_CONSUMPTION_ML,
    trinkwasserpreis: parseNumber(document.getElementById('trinkwasserpreis').value) || DEFAULT_WATER_PRICE,
    entsorgungPreis: parseNumber(document.getElementById('entsorgung-preis').value) || DEFAULT_WASTEWATER_PRICE
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
  // Ensure we don't lose small numbers by using Math.max to have a minimum value
  const wasserverbrauchJahrOHNE = Math.max((betaetigungenJahr * inputs.mlProBetaetigung) / 1_000_000, 0.01);
  const wasserverbrauchSaisOHNE = Math.max((betaetigungenSaisons * inputs.mlProBetaetigung) / 1_000_000, 0.01);
  
  // GES calculations (water usage + flushing)
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

  // Total costs (without sampling costs)
  // For year-round operation, only water costs apply
  const gesamtJahr = wasserKostenJahr;
  
  // For seasonal operation, only include water costs (no additional costs)
  const gesamtSaisonal = wasserKostenSaisonal;
  
  // Create or update the hinweis-preis element
  setTimeout(() => {
    let hinweisElement = document.querySelector('.hinweis-preis');
    
    // Always ensure the hinweis element is visible even if it exists
    if (hinweisElement) {
      hinweisElement.style.display = 'block';
    }
    
    // If the element doesn't exist, create it
    if (!hinweisElement) {
      hinweisElement = document.createElement('div');
      hinweisElement.className = 'hinweis-preis';
      
      // Style the hinweis element
      hinweisElement.style.display = 'block'; // Override display:none
      hinweisElement.style.color = '#666';
      hinweisElement.style.fontStyle = 'italic';
      hinweisElement.style.fontSize = '0.5em';
      hinweisElement.style.marginTop = '15px';
      hinweisElement.style.marginBottom = '15px';
      hinweisElement.style.padding = '10px';
      hinweisElement.style.backgroundColor = '#f8f8f8';
      hinweisElement.style.borderLeft = '3px solid #4a90e2';
      hinweisElement.style.borderRadius = '3px';
      
      // Add to the page
      const priceContainer = document.getElementById('full-year-gesamt-price').closest('.inner_grid-calc-ergebnis');
      if (priceContainer) {
        priceContainer.appendChild(hinweisElement);
      }
    }
    
    // Set the content
    hinweisElement.innerHTML = 'Hinweis: Zusätzliche Kosten für die Beprobung fallen weiterhin an und müssen separat berücksichtigt werden.';
  }, 500);
  console.log("Total costs:", { gesamtJahr, gesamtSaisonal });

  // Environmental calculations - Including flushing water
  const literVerbrauchJahr = wasserverbrauchJahrGES * 1000; // Include flushing water
  const literVerbrauchSaison = wasserverbrauchSaisonGES * 1000; // Include flushing water
  
  const co2PlasticJahr = literVerbrauchJahr * CO2_PLASTIC_PER_LITER;
  const co2WaterJahr = literVerbrauchJahr * CO2_WATER_PER_LITER;
  const co2EinsparungJahr = Math.max((co2PlasticJahr - co2WaterJahr) / 1_000_000, 0.1); // grams to tonnes, minimum 0.1
  
  const co2PlasticSaison = literVerbrauchSaison * CO2_PLASTIC_PER_LITER;
  const co2WaterSaison = literVerbrauchSaison * CO2_WATER_PER_LITER;
  const co2EinsparungSaison = Math.max((co2PlasticSaison - co2WaterSaison) / 1_000_000, 0.1); // minimum 0.1

  // Plastic savings
  const plasticSavedSaison = literVerbrauchSaison * PLASTIC_FACTOR;
  const plasticSavedJahr = literVerbrauchJahr * PLASTIC_FACTOR;

  console.log("Environmental impact:", {
    literVerbrauchJahr,
    literVerbrauchSaison,
    co2EinsparungJahr,
    co2EinsparungSaison,
    plasticSavedSaison,
    plasticSavedJahr
  });

  // ---------------------------------------------------------
  // Update DOM with results
  // ---------------------------------------------------------
  console.log("\nUpdating DOM elements...");
  
  // 1) Costs
  document.getElementById('saison-gesamt-price').textContent = formatMoney(gesamtSaisonal);
  document.getElementById('full-year-gesamt-price').textContent = formatMoney(gesamtJahr);
  
  // 2) CO₂
  document.getElementById('saison-tonnen-c02').textContent = `${formatNumber(co2EinsparungSaison)} Tonnen CO₂`;
  document.getElementById('full-tonnen-c02').textContent = `${formatNumber(co2EinsparungJahr)} Tonnen CO₂`;
  
  // 3) Plastic bottles
  document.getElementById('plastic-bootles-saison').textContent = formatPlasticBottles(plasticSavedSaison);
  document.getElementById('plastic-bootles-gesamt').textContent = formatPlasticBottles(plasticSavedJahr);
  
  // 4) Water consumption (total including flushing)
  document.getElementById('liter-verbrauch-saison').textContent = formatNumber(literVerbrauchSaison);
  document.getElementById('liter-verbrauch-full').textContent = formatNumber(literVerbrauchJahr);
  document.getElementById('m3-verbrauch-saison').textContent = formatNumber(wasserverbrauchSaisonGES);
  document.getElementById('m3-verbrauch-full').textContent = formatNumber(wasserverbrauchJahrGES);
  
  // 5) Additional flushing consumption
  document.getElementById('m3-spuelung-saison').textContent = formatNumber(SPUELUNG_SAISONAL_M3);
  document.getElementById('m3-spuelung-gesamt').textContent = formatNumber(SPUELUNG_JAEHRLICH_M3);

  // ---------------------------------------------------------
  // Update sliders (visual bars) for comparison
  // ---------------------------------------------------------
  console.log("\nUpdating sliders...");
  const sliderPairs = [
    // Cost sliders
    { 
      saison: gesamtSaisonal, 
      fullYear: gesamtJahr, 
      saisonSliderId: 'saison-gesamt-price-range', 
      fullYearSliderId: 'full-year-gesamt-price-range' 
    },
    // CO₂ sliders
    { 
      saison: co2EinsparungSaison, 
      fullYear: co2EinsparungJahr, 
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
    // m³ consumption sliders (with flushing)
    { 
      saison: wasserverbrauchSaisonGES, 
      fullYear: wasserverbrauchJahrGES, 
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

    if (saisonSlider) {
      saisonSlider.style.transition = 'width 0.8s ease-in-out'; // smooth animation
      void saisonSlider.offsetWidth; // reflow to reset
      saisonSlider.style.width = `${saisonPercentage}%`;
    }  

    if (fullYearSlider) {
      fullYearSlider.style.transition = 'width 0.8s ease-in-out';
      void fullYearSlider.offsetWidth;
      fullYearSlider.style.width = `${fullYearPercentage}%`;
    }

    if (!saisonSlider) console.error(`Slider not found: ${pair.saisonSliderId}`);
    if (!fullYearSlider) console.error(`Slider not found: ${pair.fullYearSliderId}`);
  });

  console.log("--- Calculation complete ---\n");
});


// ---------------------------------------------------------
// 4) Format input fields with thousand separators
// ---------------------------------------------------------
function formatInputWithSeparators(input) {
  // Get the cursor position
  const start = input.selectionStart;
  const end = input.selectionEnd;
  
  // Get the raw value without separators
  let value = input.value.replace(/\./g, '');
  
  // Only format if we have a valid number
  if (value && /^\d+$/.test(value)) {
    // Format with dots as thousand separators
    const formattedValue = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = formattedValue;
    
    // Calculate new cursor position
    const addedSeparators = formattedValue.length - value.length;
    const newPosition = start + (addedSeparators > 0 ? 1 : 0);
    
    // Set the cursor position
    input.setSelectionRange(newPosition, newPosition);
  }
}

// Add event listeners to numeric inputs that need thousand separators
document.addEventListener("DOMContentLoaded", function() {
  const populationInput = document.getElementById('menschen-gesamt');
  if (populationInput) {
    populationInput.addEventListener('input', function() {
      formatInputWithSeparators(this);
    });
  }
});

// ---------------------------------------------------------
// 5) Slider functionality (unchanged)
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    const rangeSliderWrapperClass = "wrapper-step-range_slider"; // Class for the slider wrapper
    const inputId = "benutzung-prozent"; // ID of the input field
    const sliderMaxValue = 100; // Maximum percentage value
    
    // Set default values
    document.getElementById('ml-pro-betaetigung').value = DEFAULT_WATER_CONSUMPTION_ML;
    document.getElementById('trinkwasserpreis').value = DEFAULT_WATER_PRICE.toString().replace('.', ',');
    document.getElementById('entsorgung-preis').value = DEFAULT_WASTEWATER_PRICE.toString().replace('.', ',');
    document.getElementById('menschen-gesamt').value = DEFAULT_POPULATION.toLocaleString('de-DE').replace(/,/g, '.');
    
    // Set default range slider value
    const rangeHandle = document.querySelector('[fs-rangeslider-element="handle"]');
    const rangeDisplayValue = document.querySelector('[fs-rangeslider-element="display-value"]');
    const rangeFill = document.querySelector('[fs-rangeslider-element="fill-2"]');
    
    if (rangeHandle && rangeDisplayValue) {
        // Set the display value
        rangeDisplayValue.textContent = DEFAULT_USAGE_PERCENT.toString();
        
        // Set the input value
        document.getElementById('benutzung-prozent').value = DEFAULT_USAGE_PERCENT.toString();
        
        // Set the handle position
        const percentage = (DEFAULT_USAGE_PERCENT / sliderMaxValue) * 100;
        rangeHandle.style.left = `${percentage}%`;
        
        // Set the fill width
        if (rangeFill) {
            rangeFill.style.width = `${percentage}%`;
        }
        
        // Set the aria value
        rangeHandle.setAttribute('aria-valuenow', DEFAULT_USAGE_PERCENT.toString());
    }
    
    // Update slider max value
    const wrapper = document.querySelector(`.${rangeSliderWrapperClass}`);
    if (wrapper) {
        wrapper.setAttribute("fs-rangeslider-max", sliderMaxValue.toString());
        
        // Update the max value display in the UI
        const maxValueDisplay = document.querySelector('.range-block.right .range-slider-text_below');
        if (maxValueDisplay) {
            maxValueDisplay.textContent = sliderMaxValue.toString();
        }
    }

    // Function to update the range slider position based on the input value
    function updateRangeSliderPosition(value, withTransition) {
        const wrapper = document.querySelector(`.${rangeSliderWrapperClass}`);
        const handle = wrapper.querySelector(".range-slider_handle");
        const fill = wrapper.querySelector(".range-slider_fill");

        const min = parseFloat(wrapper.getAttribute("fs-rangeslider-min"));
        const max = parseFloat(wrapper.getAttribute("fs-rangeslider-max"));

        const percentage = ((value - min) / (max - min)) * 100;

        if (withTransition) {
            handle.style.transition = "left 0.3s ease";
            fill.style.transition = "width 0.3s ease";
        } else {
            handle.style.transition = "none";
            fill.style.transition = "none";
        }

        handle.style.left = `${Math.min(Math.max(percentage, 0), 100)}%`;
        fill.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`;
    }

    // Function to set the input value based on the slider handle text
    function setInputValue() {
        const handleText = document.querySelector(`.${rangeSliderWrapperClass} .inside-handle-text`).textContent;
        document.getElementById(inputId).value = handleText;
    }

    // Function to set the slider handle text based on the input value
    function setHandleText() {
        const inputValue = document.getElementById(inputId).value;
        const handleText = document.querySelector(`.${rangeSliderWrapperClass} .inside-handle-text`);
        handleText.textContent = inputValue;
        updateRangeSliderPosition(inputValue, true);
    }

    // Function to add event listeners for handle movement
    function addHandleMovementListener() {
        const handle = document.querySelector(`.${rangeSliderWrapperClass} .range-slider_handle`);
        const slider = document.querySelector(`.${rangeSliderWrapperClass} .track-range-slider`);

        handle.addEventListener("mousedown", function () {
            updateRangeSliderPosition(document.getElementById(inputId).value, false);
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });

        handle.addEventListener("touchstart", function () {
            updateRangeSliderPosition(document.getElementById(inputId).value, false);
            document.addEventListener("touchmove", onTouchMove);
            document.addEventListener("touchend", onTouchEnd);
        });

        slider.addEventListener("click", function (event) {
            const rect = slider.getBoundingClientRect();
            const offsetX = event.clientX - rect.left;
            const percentage = (offsetX / slider.clientWidth) * 100;
            const wrapper = document.querySelector(`.${rangeSliderWrapperClass}`);
            const min = parseFloat(wrapper.getAttribute("fs-rangeslider-min"));
            const max = parseFloat(wrapper.getAttribute("fs-rangeslider-max"));
            const value = Math.round(min + (percentage / 100) * (max - min));

            document.getElementById(inputId).value = value;
            setHandleText();
        });

        function onMouseMove() {
            setInputValue();
        }

        function onMouseUp() {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        }

        function onTouchMove() {
            setInputValue();
        }

        function onTouchEnd() {
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
        }
    }

    // Function to add event listener for input field changes
    function addInputFieldListener() {
        const inputField = document.getElementById(inputId);
        inputField.addEventListener("input", function () {
            if (inputField.value.length > 3) {
                inputField.value = inputField.value.slice(0, 3);
            }
            setHandleText();
            setTimeout(() => {
                const handle = document.querySelector(`.${rangeSliderWrapperClass} .range-slider_handle`);
                const fill = document.querySelector(`.${rangeSliderWrapperClass} .range-slider_fill`);
                handle.style.transition = "none";
                fill.style.transition = "none";
            }, 300);
        });
    }

    // Function to observe changes to the handle text and input field value
    function observeChanges() {
        const handleTextElement = document.querySelector(`.${rangeSliderWrapperClass} .inside-handle-text`);
        const inputElement = document.getElementById(inputId);

        const observer = new MutationObserver(() => {
            if (inputElement.value !== handleTextElement.textContent) {
                inputElement.value = handleTextElement.textContent;
            }
        });

        observer.observe(handleTextElement, { childList: true, subtree: true });

        inputElement.addEventListener("input", () => {
            if (inputElement.value !== handleTextElement.textContent) {
                handleTextElement.textContent = inputElement.value;
                updateRangeSliderPosition(inputElement.value, true);
            }
        });
    }

    // Initialize the slider and input field
    setInputValue(); // Set initial value
    addHandleMovementListener(); // Add handle movement listeners
    addInputFieldListener(); // Add input field listener
    observeChanges(); // Observe changes to keep input and handle in sync
});
