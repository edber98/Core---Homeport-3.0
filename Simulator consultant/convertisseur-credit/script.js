/*
  Tarifs verifies le 2026-03-12 depuis les pages officielles:
  - OpenAI: https://platform.openai.com/docs/pricing/
  - Anthropic: https://docs.anthropic.com/en/docs/about-claude/pricing
  - Google Gemini API: https://ai.google.dev/pricing
*/

const MODEL_PRICING = Object.freeze([
  { id: "openai-gpt-5.4", provider: "OpenAI", label: "gpt-5.4", input: 2.5, output: 15.0 },
  { id: "openai-gpt-5.4-pro", provider: "OpenAI", label: "gpt-5.4-pro", input: 30.0, output: 180.0 },
  { id: "openai-gpt-5.2", provider: "OpenAI", label: "gpt-5.2", input: 1.75, output: 14.0 },
  { id: "openai-gpt-5.1", provider: "OpenAI", label: "gpt-5.1", input: 1.25, output: 10.0 },
  { id: "openai-gpt-5", provider: "OpenAI", label: "gpt-5", input: 1.25, output: 10.0 },
  { id: "openai-gpt-5-mini", provider: "OpenAI", label: "gpt-5-mini", input: 0.25, output: 2.0 },
  { id: "openai-gpt-5-nano", provider: "OpenAI", label: "gpt-5-nano", input: 0.05, output: 0.4 },
  { id: "openai-gpt-5.2-pro", provider: "OpenAI", label: "gpt-5.2-pro", input: 21.0, output: 168.0 },
  { id: "openai-gpt-5-pro", provider: "OpenAI", label: "gpt-5-pro", input: 15.0, output: 120.0 },
  { id: "openai-gpt-4.1", provider: "OpenAI", label: "gpt-4.1", input: 2.0, output: 8.0 },
  { id: "openai-gpt-4.1-mini", provider: "OpenAI", label: "gpt-4.1-mini", input: 0.4, output: 1.6 },
  { id: "openai-gpt-4.1-nano", provider: "OpenAI", label: "gpt-4.1-nano", input: 0.1, output: 0.4 },
  { id: "openai-gpt-4o", provider: "OpenAI", label: "gpt-4o", input: 2.5, output: 10.0 },
  { id: "openai-gpt-4o-mini", provider: "OpenAI", label: "gpt-4o-mini", input: 0.15, output: 0.6 },
  { id: "openai-gpt-4o-2024-05-13", provider: "OpenAI", label: "gpt-4o-2024-05-13", input: 5.0, output: 15.0 },
  { id: "openai-o1", provider: "OpenAI", label: "o1", input: 15.0, output: 60.0 },
  { id: "openai-o1-pro", provider: "OpenAI", label: "o1-pro", input: 150.0, output: 600.0 },
  { id: "openai-o3", provider: "OpenAI", label: "o3", input: 2.0, output: 8.0 },
  { id: "openai-o3-pro", provider: "OpenAI", label: "o3-pro", input: 20.0, output: 80.0 },
  { id: "anthropic-claude-opus-4.6", provider: "Anthropic", label: "claude-opus-4.6", input: 5.0, output: 25.0 },
  { id: "anthropic-claude-sonnet-4.6", provider: "Anthropic", label: "claude-sonnet-4.6", input: 3.0, output: 15.0 },
  { id: "anthropic-claude-haiku-4.5", provider: "Anthropic", label: "claude-haiku-4.5", input: 1.0, output: 5.0 },
  { id: "anthropic-claude-sonnet-4.5", provider: "Anthropic", label: "claude-sonnet-4.5", input: 3.0, output: 15.0 },
  { id: "anthropic-claude-opus-4.5", provider: "Anthropic", label: "claude-opus-4.5", input: 5.0, output: 25.0 },
  { id: "anthropic-claude-opus-4.1", provider: "Anthropic", label: "claude-opus-4.1", input: 15.0, output: 75.0 },
  { id: "anthropic-claude-sonnet-4", provider: "Anthropic", label: "claude-sonnet-4", input: 3.0, output: 15.0 },
  { id: "google-gemini", provider: "Google", label: "gemini", input: 2.0, output: 12.0 },
  { id: "google-gemini-large-context", provider: "Google", label: "gemini-large-context", input: 4.0, output: 18.0 }
]);

const MODEL_MAP = new Map(MODEL_PRICING.map((model) => [model.id, model]));
const PROVIDERS = [...new Set(MODEL_PRICING.map((model) => model.provider))];

const v1Dom = {
  scenarioList: document.querySelector("#scenario-list-v1"),
  comparisonBody: document.querySelector("#comparison-body-v1"),
  template: document.querySelector("#scenario-template-v1"),
  addButton: document.querySelector("#add-scenario-v1"),
  resetButton: document.querySelector("#reset-scenarios-v1"),
  kinnRateField: document.querySelector('[data-v1-global="kinn-rate"]'),
  marginField: document.querySelector('[data-v1-global="margin"]')
};

const v2Dom = {
  scenarioList: document.querySelector("#scenario-list-v2"),
  comparisonBody: document.querySelector("#comparison-body-v2"),
  template: document.querySelector("#scenario-template-v2"),
  addButton: document.querySelector("#add-scenario-v2"),
  resetButton: document.querySelector("#reset-scenarios-v2")
};

let scenarioCounterV1 = 0;
let scenarioCounterV2 = 0;

const MODEL_TOKEN_RATE_UNIT = 1000000;
const KINN_CREDIT_RATE_UNIT = 1000;
const FIXED_V2_CREDITS_PER_DOLLAR = 50;

const moneyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 6
});

const integerFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0
});

const compactNumberFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2
});

function parseLocaleNumber(rawValue) {
  if (typeof rawValue !== "string") {
    return Number.NaN;
  }

  const compactValue = rawValue
    .trim()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/'/g, "");

  if (!compactValue) {
    return Number.NaN;
  }

  const commaCount = (compactValue.match(/,/g) || []).length;
  const dotCount = (compactValue.match(/\./g) || []).length;
  let normalized = compactValue;

  if (commaCount && dotCount) {
    const lastComma = compactValue.lastIndexOf(",");
    const lastDot = compactValue.lastIndexOf(".");
    normalized = lastComma > lastDot
      ? compactValue.replace(/\./g, "").replace(",", ".")
      : compactValue.replace(/,/g, "");
  } else if (commaCount > 1) {
    normalized = compactValue.replace(/,/g, "");
  } else if (dotCount > 1) {
    normalized = compactValue.replace(/\./g, "");
  } else if (commaCount === 1) {
    normalized = compactValue.replace(",", ".");
  }

  if (!normalized) {
    return Number.NaN;
  }

  return Number(normalized);
}

function formatMoney(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return moneyFormatter.format(value);
}

function formatSignedMoney(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  if (value > 0) {
    return `+${formatMoney(value)}`;
  }

  return formatMoney(value);
}

function formatCredits(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  if (Math.abs(value) >= 1000) {
    return integerFormatter.format(value);
  }

  return compactNumberFormatter.format(value);
}

function formatTokens(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return integerFormatter.format(value);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return compactNumberFormatter.format(value);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${compactNumberFormatter.format(value)}%`;
}

function formatMargin(value, profitRate) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  const label = `${compactNumberFormatter.format(value)}x`;
  return Number.isFinite(profitRate)
    ? `${label} (${formatPercent(profitRate)})`
    : label;
}

function formatModelRateTag(value, suffix = "") {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return suffix
    ? `${formatMoney(value)} / 1M ${suffix}`
    : `${formatMoney(value)} / 1M`;
}

function formatKinnRateTag(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return `${formatMoney(value)} / ${formatTokens(KINN_CREDIT_RATE_UNIT)} credits`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildModelOptions(selectedId) {
  const groups = PROVIDERS.map((provider) => {
    const providerOptions = MODEL_PRICING
      .filter((model) => model.provider === provider)
      .map((model) => {
        const selected = model.id === selectedId ? " selected" : "";
        const optionLabel = `${model.label} (${formatMoney(model.input)} in / ${formatMoney(model.output)} out)`;
        return `<option value="${model.id}"${selected}>${escapeHtml(optionLabel)}</option>`;
      })
      .join("");

    return `<optgroup label="${provider}">${providerOptions}</optgroup>`;
  }).join("");

  const customSelected = selectedId === "custom" ? " selected" : "";
  return `${groups}<option value="custom"${customSelected}>Modele personnalise</option>`;
}

function getBaseDraft() {
  return {
    modelId: "openai-gpt-4o-mini",
    tokenType: "input",
    customName: "",
    customInput: "",
    customOutput: ""
  };
}

function fillCommonScenarioFields(card, draft) {
  const modelField = card.querySelector('[data-field="model"]');
  const tokenTypeField = card.querySelector('[data-field="tokenType"]');
  const customNameField = card.querySelector('[data-field="customName"]');
  const customInputField = card.querySelector('[data-field="customInput"]');
  const customOutputField = card.querySelector('[data-field="customOutput"]');

  if (modelField) {
    modelField.innerHTML = buildModelOptions(draft.modelId);
  }

  if (tokenTypeField) {
    tokenTypeField.value = draft.tokenType || "input";
  }

  if (customNameField) {
    customNameField.value = draft.customName || "";
  }

  if (customInputField) {
    customInputField.value = draft.customInput || "";
  }

  if (customOutputField) {
    customOutputField.value = draft.customOutput || "";
  }
}

function refreshScenarioLabels(list) {
  [...list.children].forEach((card, index) => {
    card.querySelector(".scenario-index").textContent = `Scenario ${String(index + 1).padStart(2, "0")}`;
  });
}

function syncCustomFields(card) {
  const customFields = card.querySelector(".custom-fields");
  const modelField = card.querySelector('[data-field="model"]');

  if (!customFields || !modelField) {
    return;
  }

  const isCustom = modelField.value === "custom";
  customFields.classList.toggle("is-hidden", !isCustom);
}

function bindScenarioCard(card, list, createDefaultCard, recalculate) {
  card.addEventListener("input", () => {
    syncCustomFields(card);
    recalculate();
  });

  card.addEventListener("change", () => {
    syncCustomFields(card);
    recalculate();
  });

  card.querySelector('[data-action="remove"]').addEventListener("click", () => {
    card.remove();

    if (!list.children.length) {
      createDefaultCard();
      return;
    }

    refreshScenarioLabels(list);
    recalculate();
  });
}

function resolveModel(card, tokenType) {
  const modelId = card.querySelector('[data-field="model"]').value;
  const isCustom = modelId === "custom";
  let label = "";
  let modelRate = Number.NaN;
  const notes = [];

  if (isCustom) {
    const customName = card.querySelector('[data-field="customName"]').value.trim();
    const customInput = parseLocaleNumber(card.querySelector('[data-field="customInput"]').value);
    const customOutput = parseLocaleNumber(card.querySelector('[data-field="customOutput"]').value);

    label = customName || "Modele personnalise";
    modelRate = tokenType === "input" ? customInput : customOutput;

    if (!customName) {
      notes.push("Ajoute un nom pour identifier le modele perso.");
    }
  } else {
    const model = MODEL_MAP.get(modelId);
    label = model ? `${model.provider} - ${model.label}` : "Modele inconnu";
    modelRate = model ? model[tokenType] : Number.NaN;
  }

  if (!Number.isFinite(modelRate) || modelRate < 0) {
    notes.push(`Renseigne un tarif ${tokenType} valide pour ce modele.`);
  }

  return {
    label,
    modelRate,
    notes
  };
}

function getScenarioStatus(benefit) {
  if (!Number.isFinite(benefit)) {
    return "--";
  }

  if (benefit > 0) {
    return "Benefice";
  }

  if (benefit < 0) {
    return "Perte";
  }

  return "Equilibre";
}

function getDefaultDraftV1() {
  return {
    ...getBaseDraft(),
    modelId: "openai-gpt-5.2",
    tokenType: "input",
    tokens: "510509"
  };
}

function getInitialDraftsV1() {
  return [
    getDefaultDraftV1(),
    {
      ...getBaseDraft(),
      modelId: "openai-gpt-5.2",
      tokenType: "output",
      tokens: "2435"
    }
  ];
}

function snapshotCardDraftV1(card) {
  return {
    modelId: card.querySelector('[data-field="model"]').value,
    tokenType: card.querySelector('[data-field="tokenType"]').value,
    tokens: card.querySelector('[data-field="tokens"]').value,
    customName: card.querySelector('[data-field="customName"]').value,
    customInput: card.querySelector('[data-field="customInput"]').value,
    customOutput: card.querySelector('[data-field="customOutput"]').value
  };
}

function createScenarioCardV1(draft = getDefaultDraftV1()) {
  const fragment = v1Dom.template.content.cloneNode(true);
  const card = fragment.querySelector(".scenario-row");
  scenarioCounterV1 += 1;
  card.dataset.scenarioId = String(scenarioCounterV1);

  fillCommonScenarioFields(card, draft);
  card.querySelector('[data-field="tokens"]').value = draft.tokens || "510509";

  v1Dom.scenarioList.appendChild(fragment);
  const insertedCard = v1Dom.scenarioList.lastElementChild;
  bindScenarioCard(insertedCard, v1Dom.scenarioList, () => createScenarioCardV1(), recalculateV1);
  syncCustomFields(insertedCard);
  refreshScenarioLabels(v1Dom.scenarioList);
  recalculateV1();
}

function readScenarioV1(card, kinnRate, margin) {
  const tokenType = card.querySelector('[data-field="tokenType"]').value;
  const tokens = parseLocaleNumber(card.querySelector('[data-field="tokens"]').value);
  const { label, modelRate, notes } = resolveModel(card, tokenType);

  if (!Number.isFinite(tokens) || tokens < 0) {
    notes.push("Renseigne un nombre de tokens valide.");
  }

  if (!Number.isFinite(kinnRate) || kinnRate <= 0) {
    notes.push("Renseigne un prix Kinn credits superieur a 0.");
  }

  if (!Number.isFinite(margin) || margin <= 0) {
    notes.push("Renseigne une marge superieure a 0.");
  }

  const spentPrice = Number.isFinite(tokens) && tokens >= 0 && Number.isFinite(modelRate)
    ? (tokens / MODEL_TOKEN_RATE_UNIT) * modelRate
    : Number.NaN;

  const billedPrice = Number.isFinite(spentPrice) && Number.isFinite(margin) && margin > 0
    ? spentPrice * margin
    : Number.NaN;

  const kinnCredits = Number.isFinite(billedPrice) && Number.isFinite(kinnRate) && kinnRate > 0
    ? (billedPrice / kinnRate) * KINN_CREDIT_RATE_UNIT
    : Number.NaN;

  return {
    label,
    tokenType,
    tokens,
    modelRate,
    spentPrice,
    billedPrice,
    kinnRate,
    kinnCredits,
    note: notes.join(" ")
  };
}

function updateScenarioCardV1(card, data) {
  const note = card.querySelector('[data-output="note"]');

  if (note) {
    note.textContent = data.note;
  }
}

function renderComparisonTableV1(rows) {
  const cheapestRows = rows.filter((row) => Number.isFinite(row.spentPrice));
  const cheapestValue = cheapestRows.length
    ? Math.min(...cheapestRows.map((row) => row.spentPrice))
    : Number.NaN;

  v1Dom.comparisonBody.innerHTML = rows.map((row, index) => {
    const isCheapest = Number.isFinite(row.spentPrice) && row.spentPrice === cheapestValue;
    const badge = isCheapest ? '<span class="table-badge">Le moins cher</span>' : "";

    return `
      <tr>
        <td>
          <strong>Scenario ${String(index + 1).padStart(2, "0")}</strong>
          ${badge}
        </td>
        <td>${escapeHtml(row.label)}</td>
        <td>${row.tokenType}</td>
        <td>${formatTokens(row.tokens)}</td>
        <td>${formatModelRateTag(row.modelRate, row.tokenType)}</td>
        <td>${formatMoney(row.spentPrice)}</td>
        <td>${formatKinnRateTag(row.kinnRate)}</td>
        <td>${formatCredits(row.kinnCredits)}</td>
      </tr>
    `;
  }).join("");
}

function updateSummaryV1(rows) {
  const totalSpent = rows.reduce((sum, row) => sum + (Number.isFinite(row.spentPrice) ? row.spentPrice : 0), 0);
  const totalBilled = rows.reduce((sum, row) => sum + (Number.isFinite(row.billedPrice) ? row.billedPrice : 0), 0);
  const totalCredits = rows.reduce((sum, row) => sum + (Number.isFinite(row.kinnCredits) ? row.kinnCredits : 0), 0);

  document.querySelector('[data-v1-summary="scenario-count"]').textContent = formatTokens(rows.length);
  document.querySelector('[data-v1-summary="model-spent"]').textContent = formatMoney(totalSpent);
  document.querySelector('[data-v1-summary="total-credits"]').textContent = formatCredits(totalCredits);
  document.querySelector('[data-v1-summary="total-spent"]').textContent = formatMoney(totalBilled);
}

function recalculateV1() {
  const kinnRate = parseLocaleNumber(v1Dom.kinnRateField.value);
  const margin = parseLocaleNumber(v1Dom.marginField.value);

  const rows = [...v1Dom.scenarioList.children].map((card) => {
    const data = readScenarioV1(card, kinnRate, margin);
    updateScenarioCardV1(card, data);
    return data;
  });

  renderComparisonTableV1(rows);
  updateSummaryV1(rows);
}

function resetScenariosV1() {
  v1Dom.scenarioList.innerHTML = "";
  scenarioCounterV1 = 0;
  v1Dom.kinnRateField.value = "50";
  v1Dom.marginField.value = "2.5";
  getInitialDraftsV1().forEach((draft) => {
    createScenarioCardV1(draft);
  });
}

function getDefaultDraftV2() {
  return {
    usedCredits: "500",
    purchasedCredits: "1000",
    salePrice: "50"
  };
}

function snapshotCardDraftV2(card) {
  return {
    usedCredits: card.querySelector('[data-field="usedCredits"]').value,
    purchasedCredits: card.querySelector('[data-field="purchasedCredits"]').value,
    salePrice: card.querySelector('[data-field="salePrice"]').value
  };
}

function createScenarioCardV2(draft = getDefaultDraftV2()) {
  const fragment = v2Dom.template.content.cloneNode(true);
  const card = fragment.querySelector(".scenario-row");
  scenarioCounterV2 += 1;
  card.dataset.scenarioId = String(scenarioCounterV2);

  card.querySelector('[data-field="usedCredits"]').value = draft.usedCredits || "500";
  card.querySelector('[data-field="purchasedCredits"]').value = draft.purchasedCredits || "1000";
  card.querySelector('[data-field="salePrice"]').value = draft.salePrice || "50";

  v2Dom.scenarioList.appendChild(fragment);
  const insertedCard = v2Dom.scenarioList.lastElementChild;
  bindScenarioCard(insertedCard, v2Dom.scenarioList, () => createScenarioCardV2(), recalculateV2);
  refreshScenarioLabels(v2Dom.scenarioList);
  recalculateV2();
}

function readScenarioV2(card) {
  const usedCredits = parseLocaleNumber(card.querySelector('[data-field="usedCredits"]').value);
  const purchasedCredits = parseLocaleNumber(card.querySelector('[data-field="purchasedCredits"]').value);
  const salePrice = parseLocaleNumber(card.querySelector('[data-field="salePrice"]').value);
  const notes = [];

  if (!Number.isFinite(usedCredits) || usedCredits < 0) {
    notes.push("Renseigne un nombre de credits utilises valide.");
  }

  if (!Number.isFinite(purchasedCredits) || purchasedCredits <= 0) {
    notes.push("Renseigne un nombre de credits achetes superieur a 0.");
  }

  if (!Number.isFinite(salePrice) || salePrice < 0) {
    notes.push("Renseigne un prix paye valide.");
  }

  const modelCost = Number.isFinite(usedCredits) && usedCredits >= 0
    ? usedCredits / FIXED_V2_CREDITS_PER_DOLLAR
    : Number.NaN;

  const billedPerThousandCredits = Number.isFinite(salePrice) && Number.isFinite(purchasedCredits) && purchasedCredits > 0
    ? (salePrice / purchasedCredits) * KINN_CREDIT_RATE_UNIT
    : Number.NaN;

  const remainingCredits = Number.isFinite(usedCredits) && usedCredits >= 0 && Number.isFinite(purchasedCredits) && purchasedCredits > 0
    ? purchasedCredits - usedCredits
    : Number.NaN;

  const benefit = Number.isFinite(modelCost) && Number.isFinite(salePrice)
    ? salePrice - modelCost
    : Number.NaN;

  const margin = Number.isFinite(modelCost) && modelCost > 0 && Number.isFinite(salePrice)
    ? salePrice / modelCost
    : Number.NaN;

  const profitRate = Number.isFinite(modelCost) && modelCost > 0 && Number.isFinite(benefit)
    ? (benefit / modelCost) * 100
    : Number.NaN;

  if (Number.isFinite(remainingCredits) && remainingCredits < 0) {
    notes.push("Les credits utilises depassent les credits achetes.");
  }

  return {
    usedCredits,
    purchasedCredits,
    salePrice,
    modelCost,
    billedPerThousandCredits,
    remainingCredits,
    benefit,
    margin,
    profitRate,
    status: getScenarioStatus(benefit),
    note: notes.join(" ")
  };
}

function updateScenarioCardV2(card, data) {
  const note = card.querySelector('[data-output="note"]');

  if (!note) {
    return;
  }

  const messages = [];

  if (data.note) {
    messages.push(data.note);
  }

  if (Number.isFinite(data.remainingCredits)) {
    messages.push(`Restants ${formatCredits(data.remainingCredits)} credits.`);
  }

  if (Number.isFinite(data.benefit)) {
    messages.push(`${data.status} ${formatSignedMoney(data.benefit)}.`);
  }

  if (Number.isFinite(data.margin)) {
    messages.push(`Marge ${formatMargin(data.margin, data.profitRate)}.`);
  }

  note.textContent = messages.join(" ");
}

function renderComparisonTableV2(rows) {
  const comparableRows = rows.filter((row) => Number.isFinite(row.benefit));
  const bestBenefit = comparableRows.length
    ? Math.max(...comparableRows.map((row) => row.benefit))
    : Number.NaN;

  v2Dom.comparisonBody.innerHTML = rows.map((row, index) => {
    const isBest = Number.isFinite(row.benefit) && row.benefit === bestBenefit;
    const badge = isBest ? '<span class="table-badge">La plus rentable</span>' : "";

    return `
      <tr>
        <td>
          <strong>Scenario ${String(index + 1).padStart(2, "0")}</strong>
          ${badge}
        </td>
        <td>${formatCredits(row.usedCredits)}</td>
        <td>${formatMoney(row.modelCost)}</td>
        <td>${formatCredits(row.purchasedCredits)}</td>
        <td>${formatMoney(row.salePrice)}</td>
        <td>${formatMoney(row.billedPerThousandCredits)}</td>
        <td>${formatCredits(row.remainingCredits)}</td>
        <td>${formatSignedMoney(row.benefit)}</td>
        <td>${formatMargin(row.margin, row.profitRate)}</td>
      </tr>
    `;
  }).join("");
}

function updateSummaryV2(rows) {
  const totalUsedCredits = rows.reduce((sum, row) => sum + (Number.isFinite(row.usedCredits) && row.usedCredits >= 0 ? row.usedCredits : 0), 0);
  const totalModelCost = rows.reduce((sum, row) => sum + (Number.isFinite(row.modelCost) ? row.modelCost : 0), 0);
  const totalPurchasedCredits = rows.reduce((sum, row) => sum + (Number.isFinite(row.purchasedCredits) && row.purchasedCredits > 0 ? row.purchasedCredits : 0), 0);
  const totalBilled = rows.reduce((sum, row) => sum + (Number.isFinite(row.salePrice) && row.salePrice >= 0 ? row.salePrice : 0), 0);
  const totalBenefit = rows.reduce((sum, row) => sum + (Number.isFinite(row.benefit) ? row.benefit : 0), 0);
  const globalMargin = totalModelCost > 0
    ? totalBilled / totalModelCost
    : Number.NaN;
  const globalProfitRate = totalModelCost > 0
    ? (totalBenefit / totalModelCost) * 100
    : Number.NaN;

  document.querySelector('[data-v2-summary="scenario-count"]').textContent = formatTokens(rows.length);
  document.querySelector('[data-v2-summary="used-credits"]').textContent = formatCredits(totalUsedCredits);
  document.querySelector('[data-v2-summary="model-cost"]').textContent = formatMoney(totalModelCost);
  document.querySelector('[data-v2-summary="purchased-credits"]').textContent = formatCredits(totalPurchasedCredits);
  document.querySelector('[data-v2-summary="total-billed"]').textContent = formatMoney(totalBilled);
  document.querySelector('[data-v2-summary="total-benefit"]').textContent = formatSignedMoney(totalBenefit);
  document.querySelector('[data-v2-summary="global-margin"]').textContent = formatMargin(globalMargin, globalProfitRate);
}

function recalculateV2() {
  const rows = [...v2Dom.scenarioList.children].map((card) => {
    const data = readScenarioV2(card);
    updateScenarioCardV2(card, data);
    return data;
  });

  renderComparisonTableV2(rows);
  updateSummaryV2(rows);
}

function resetScenariosV2() {
  v2Dom.scenarioList.innerHTML = "";
  scenarioCounterV2 = 0;
  createScenarioCardV2(getDefaultDraftV2());
}

v1Dom.addButton.addEventListener("click", () => {
  const lastCard = v1Dom.scenarioList.lastElementChild;
  const draft = lastCard ? snapshotCardDraftV1(lastCard) : getDefaultDraftV1();
  createScenarioCardV1(draft);
});

v1Dom.resetButton.addEventListener("click", resetScenariosV1);
v1Dom.kinnRateField.addEventListener("input", recalculateV1);
v1Dom.marginField.addEventListener("input", recalculateV1);

v2Dom.addButton.addEventListener("click", () => {
  const lastCard = v2Dom.scenarioList.lastElementChild;
  const draft = lastCard ? snapshotCardDraftV2(lastCard) : getDefaultDraftV2();
  createScenarioCardV2(draft);
});

v2Dom.resetButton.addEventListener("click", resetScenariosV2);

resetScenariosV1();
resetScenariosV2();
