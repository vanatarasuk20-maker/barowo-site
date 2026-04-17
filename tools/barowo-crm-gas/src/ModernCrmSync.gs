const LEGACY_LEAD_STAGE = Object.freeze({
  NEW: "new",
  ASSIGNED: "assigned",
  OFFER_DRAFT: "offer_draft",
  OFFER_SENT: "offer_sent",
  CONTRACT_GENERATED: "contract_generated",
  SIGNED: "signed",
  SPAM: "spam",
  DELETED: "deleted"
});

function normalizeComparablePhone_(value) {
  return (value || "")
    .toString()
    .replace(/^'/, "")
    .replace(/\s+/g, "")
    .replace(/[^\d+]/g, "");
}

function normalizeComparableEmail_(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase();
}

function inferLegacyLeadStage_(row) {
  const explicitStage = (row[COL.LEAD_STATUS - 1] || "").toString().trim();
  if (explicitStage) {
    return explicitStage;
  }

  if ((row[COL.SPAM - 1] || "").toString() === "YES") {
    return LEGACY_LEAD_STAGE.SPAM;
  }

  if ((row[COL.UMOWA - 1] || "").toString() === "YES") {
    return LEGACY_LEAD_STAGE.SIGNED;
  }

  if ((row[COL.OFERTA - 1] || "").toString() === "YES") {
    return LEGACY_LEAD_STAGE.OFFER_SENT;
  }

  if ((row[COL.ASSIGNED - 1] || "").toString().trim()) {
    return LEGACY_LEAD_STAGE.ASSIGNED;
  }

  return LEGACY_LEAD_STAGE.NEW;
}

function setLegacyLeadStage_(sheet, rowNumber, stage) {
  if (!sheet || rowNumber < 2 || !stage) {
    return;
  }

  sheet.getRange(rowNumber, COL.LEAD_STATUS).setValue(stage);
}

function getLegacyLeadStageLabel_(stage) {
  const labels = {};
  labels[LEGACY_LEAD_STAGE.NEW] = "Nowy lead";
  labels[LEGACY_LEAD_STAGE.ASSIGNED] = "Przypisany";
  labels[LEGACY_LEAD_STAGE.OFFER_DRAFT] = "Szkic oferty";
  labels[LEGACY_LEAD_STAGE.OFFER_SENT] = "Oferta wysłana";
  labels[LEGACY_LEAD_STAGE.CONTRACT_GENERATED] = "Umowa wygenerowana";
  labels[LEGACY_LEAD_STAGE.SIGNED] = "Podpisane / booked";
  labels[LEGACY_LEAD_STAGE.SPAM] = "Spam";
  labels[LEGACY_LEAD_STAGE.DELETED] = "Usunięty";
  return labels[stage] || "Nowy lead";
}

function mapLegacyStageToPortalStatus_(stage) {
  switch (stage) {
    case LEGACY_LEAD_STAGE.SIGNED:
      return "BOOKED";
    case LEGACY_LEAD_STAGE.CONTRACT_GENERATED:
      return "DOCS_READY";
    case LEGACY_LEAD_STAGE.OFFER_SENT:
    case LEGACY_LEAD_STAGE.OFFER_DRAFT:
      return "OFFER_READY";
    case LEGACY_LEAD_STAGE.ASSIGNED:
      return "QUALIFIED";
    case LEGACY_LEAD_STAGE.SPAM:
    case LEGACY_LEAD_STAGE.DELETED:
      return "CLOSED";
    case LEGACY_LEAD_STAGE.NEW:
    default:
      return "NEW_LEAD";
  }
}

function getPortalNextActionFromLegacyStage_(stage) {
  switch (stage) {
    case LEGACY_LEAD_STAGE.SIGNED:
      return "Wydarzenie jest potwierdzone. Dalsze dokumenty pojawią się tutaj.";
    case LEGACY_LEAD_STAGE.CONTRACT_GENERATED:
      return "Zapoznaj się z przygotowaną umową.";
    case LEGACY_LEAD_STAGE.OFFER_SENT:
      return "Zapoznaj się z naszą ofertą i wróć do nas z pytaniami.";
    case LEGACY_LEAD_STAGE.OFFER_DRAFT:
      return "Przygotowujemy dla Ciebie ofertę.";
    case LEGACY_LEAD_STAGE.ASSIGNED:
      return "Twój opiekun przeprowadza teraz ofertowanie.";
    case LEGACY_LEAD_STAGE.SPAM:
    case LEGACY_LEAD_STAGE.DELETED:
      return "Portal jest nieaktywny.";
    case LEGACY_LEAD_STAGE.NEW:
    default:
      return "Weryfikujemy zgłoszenie i wrócimy do Ciebie możliwie szybko.";
  }
}

function generatePortalToken_() {
  return Utilities.getUuid().replace(/-/g, "").substring(0, 24);
}

function slugifyTeamName_(name) {
  return (name || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getSchemaFieldIndex_(schema, fieldName) {
  return schema.headers.indexOf(fieldName);
}

function findSchemaRowByField_(schema, fieldName, value) {
  const fieldIndex = getSchemaFieldIndex_(schema, fieldName);
  if (fieldIndex < 0 || value === null || value === undefined || value === "") {
    return -1;
  }

  const sheet = getOrCreateSheet_(schema);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return -1;
  }

  const columnValues = sheet.getRange(2, fieldIndex + 1, lastRow - 1, 1).getValues();
  const comparableValue = value.toString();

  for (let index = 0; index < columnValues.length; index += 1) {
    if ((columnValues[index][0] || "").toString() === comparableValue) {
      return index + 2;
    }
  }

  return -1;
}

function upsertSchemaRecord_(schema, keyField, keyValue, record) {
  const sheet = getOrCreateSheet_(schema);
  const row = schema.headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : "";
  });
  const existingRow = findSchemaRowByField_(schema, keyField, keyValue);

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    return existingRow;
  }

  sheet.appendRow(row);
  return sheet.getLastRow();
}

function buildLegacyPortalSummary_(legacyRow) {
  const parts = [];
  if (legacyRow[COL.EVENT - 1]) {
    parts.push(legacyRow[COL.EVENT - 1]);
  }
  if (legacyRow[COL.CITY - 1]) {
    parts.push(legacyRow[COL.CITY - 1]);
  }
  if (legacyRow[COL.GUESTS - 1]) {
    parts.push(legacyRow[COL.GUESTS - 1] + " os.");
  }
  if (legacyRow[COL.PACKAGE - 1]) {
    parts.push("Pakiet: " + legacyRow[COL.PACKAGE - 1]);
  }
  return parts.join(" · ");
}

function getLegacyLeadSource_(legacyRow) {
  return (legacyRow[COL.LEAD_SOURCE - 1] || legacyRow[11] || "legacy").toString().trim() || "legacy";
}

function buildStructuredLeadRawPayload_(legacyRow, websitePayload) {
  if (websitePayload) {
    return JSON.stringify(websitePayload);
  }

  return JSON.stringify({
    legacy_uid: getLeadUID(legacyRow),
    note: legacyRow[COL.NOTE - 1] || "",
    call_history: legacyRow[COL.CALLHIST - 1] || "",
    next_call: legacyRow[COL.NEXTCALL - 1] || ""
  });
}

function upsertPortalEventFromLegacyLead_(legacyRow) {
  const legacyUid = getLeadUID(legacyRow);
  if (!legacyUid) {
    return null;
  }

  const schema = BAROWO_SHEET_SCHEMAS.portalEvents;
  const existingRow = findSchemaRowByField_(schema, "legacy_uid", legacyUid);
  const sheet = getOrCreateSheet_(schema);
  const existingRecord = existingRow > 0
    ? sheet.getRange(existingRow, 1, 1, schema.headers.length).getValues()[0]
    : null;
  const existingToken = existingRecord ? existingRecord[getSchemaFieldIndex_(schema, "token")] : "";
  const stage = inferLegacyLeadStage_(legacyRow);
  const config = getBarowoConfig_();

  const record = {
    event_id: existingRecord ? existingRecord[getSchemaFieldIndex_(schema, "event_id")] : "evt_" + legacyUid,
    legacy_uid: legacyUid,
    created_at: legacyRow[1] || new Date().toISOString(),
    lead_id: legacyUid,
    client_name: legacyRow[COL.NAME - 1] || "",
    event_type: legacyRow[COL.EVENT - 1] || "",
    event_date: formatDate(legacyRow[COL.DATE - 1]),
    city: legacyRow[COL.CITY - 1] || "",
    package_name: legacyRow[COL.PACKAGE - 1] || "",
    guests_count: legacyRow[COL.GUESTS - 1] || "",
    duration_hours: legacyRow[COL.HOURS - 1] || "",
    status: mapLegacyStageToPortalStatus_(stage),
    next_action: getPortalNextActionFromLegacyStage_(stage),
    summary: buildLegacyPortalSummary_(legacyRow),
    manager_name: legacyRow[COL.ASSIGNED - 1] || "",
    manager_email: config.managerEmail,
    manager_phone: config.managerPhone,
    token: existingToken || generatePortalToken_(),
    is_active: stage !== LEGACY_LEAD_STAGE.SPAM && stage !== LEGACY_LEAD_STAGE.DELETED ? "true" : "false",
    updated_at: new Date().toISOString()
  };

  upsertSchemaRecord_(schema, "legacy_uid", legacyUid, record);
  return record;
}

function upsertStructuredLeadFromLegacyRow_(legacyRow, options) {
  const legacyUid = getLeadUID(legacyRow);
  if (!legacyUid) {
    return null;
  }

  const stage = inferLegacyLeadStage_(legacyRow);
  const portalEvent = upsertPortalEventFromLegacyLead_(legacyRow);
  const websitePayload = options && options.websitePayload ? options.websitePayload : null;

  const record = {
    lead_id: "legacy_" + legacyUid,
    legacy_uid: legacyUid,
    created_at: legacyRow[1] || new Date().toISOString(),
    source: websitePayload && websitePayload.source ? websitePayload.source : getLegacyLeadSource_(legacyRow),
    status: stage,
    client_name: legacyRow[COL.NAME - 1] || "",
    phone: (legacyRow[COL.PHONE - 1] || "").toString().replace(/^'/, ""),
    email: legacyRow[COL.EMAIL - 1] || "",
    event_type: legacyRow[COL.EVENT - 1] || "",
    event_date: formatDate(legacyRow[COL.DATE - 1]),
    city: legacyRow[COL.CITY - 1] || "",
    guests: legacyRow[COL.GUESTS - 1] || "",
    package_name: legacyRow[COL.PACKAGE - 1] || "",
    message: legacyRow[COL.NOTE - 1] || "",
    manager_name: legacyRow[COL.ASSIGNED - 1] || "",
    portal_token: portalEvent ? portalEvent.token : "",
    portal_status: portalEvent ? portalEvent.status : "",
    utm_source: websitePayload ? (websitePayload.utm_source || "") : "",
    utm_medium: websitePayload ? (websitePayload.utm_medium || "") : "",
    utm_campaign: websitePayload ? (websitePayload.utm_campaign || "") : "",
    utm_content: websitePayload ? (websitePayload.utm_content || "") : "",
    utm_term: websitePayload ? (websitePayload.utm_term || "") : "",
    page_url: websitePayload ? (websitePayload.page_url || "") : "",
    referrer: websitePayload ? (websitePayload.referrer || "") : "",
    consent: websitePayload && websitePayload.privacy_consent ? "yes" : "",
    raw_payload: buildStructuredLeadRawPayload_(legacyRow, websitePayload)
  };

  upsertSchemaRecord_(BAROWO_SHEET_SCHEMAS.leads, "legacy_uid", legacyUid, record);
  return record;
}

function upsertStructuredContactFromLegacyRow_(legacyRow) {
  const legacyUid = getLeadUID(legacyRow);
  if (!legacyUid) {
    return null;
  }

  const record = {
    contact_id: "contact_" + legacyUid,
    legacy_uid: legacyUid,
    created_at: new Date().toISOString(),
    client_name: legacyRow[COL.NAME - 1] || "",
    phone: (legacyRow[COL.PHONE - 1] || "").toString().replace(/^'/, ""),
    email: legacyRow[COL.EMAIL - 1] || "",
    city: legacyRow[COL.CITY - 1] || "",
    last_event_type: legacyRow[COL.EVENT - 1] || "",
    last_event_date: formatDate(legacyRow[COL.DATE - 1]),
    lead_status: inferLegacyLeadStage_(legacyRow)
  };

  upsertSchemaRecord_(BAROWO_SHEET_SCHEMAS.contacts, "legacy_uid", legacyUid, record);
  return record;
}

function syncLegacyLeadToModernCrm_(legacyRow, options) {
  if (!getBarowoConfig_().enableModernSync) {
    return null;
  }
  upsertStructuredLeadFromLegacyRow_(legacyRow, options || {});
  upsertStructuredContactFromLegacyRow_(legacyRow);
  return upsertPortalEventFromLegacyLead_(legacyRow);
}

function getPortalUrlForLegacyLead_(legacyRow) {
  if (!getBarowoConfig_().enableModernSync) {
    return "";
  }
  const portalEvent = upsertPortalEventFromLegacyLead_(legacyRow);
  if (!portalEvent || !portalEvent.token) {
    return "";
  }

  return getBarowoConfig_().portalBaseUrl.replace(/\/$/, "") + "/" + portalEvent.token;
}
