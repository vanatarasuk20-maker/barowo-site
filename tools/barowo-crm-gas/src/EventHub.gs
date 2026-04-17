const EVENTHUB_STATUS_ORDER = Object.freeze({
  NEW_LEAD: 0,
  QUALIFIED: 1,
  OFFER_READY: 2,
  DOCS_READY: 3,
  BOOKED: 4,
  READY_FOR_EVENT: 5,
  EVENT_COMPLETED: 6,
  CLOSED: 7
});

const EVENTHUB_ALLOWED_FILE_TYPES = Object.freeze([
  "contract",
  "offer",
  "brief",
  "other"
]);

function isEventHubGetRequest_(e) {
  return !!(e && e.parameter && e.parameter.eventhub);
}

function parseJsonPostBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return null;
  }

  const contentType = (e.postData.type || "").toLowerCase();
  if (contentType.indexOf("application/json") !== 0) {
    return null;
  }

  return JSON.parse(e.postData.contents);
}

function isEventHubPostRequest_(payload) {
  return !!(payload && payload.eventhub_action);
}

function handleEventHubGetRequest_(e) {
  const action = (e.parameter.eventhub || "").toString().trim();

  switch (action) {
    case "portal": {
      const portalPayload = getPortalPayloadByToken_(e.parameter.token || "");
      return renderJson_(!portalPayload.error, portalPayload);
    }
    case "admin_events":
      requireEventHubAdmin_(e.parameter.admin_key || "");
      return renderJson_(true, {
        events: listAdminPortalEvents_(e.parameter.search || "")
      });
    case "admin_event": {
      requireEventHubAdmin_(e.parameter.admin_key || "");
      const adminEventPayload = getAdminPortalEventPayload_(e.parameter.event_id || "");
      return renderJson_(!adminEventPayload.error, adminEventPayload);
    }
    case "file": {
      const filePayload = resolveEventFileAccess_(e.parameter);
      return renderJson_(!filePayload.error, filePayload);
    }
    default:
      return renderJson_(false, {
        error: "unknown_eventhub_action",
        action: action
      });
  }
}

function handleEventHubPostRequest_(payload) {
  const action = (payload.eventhub_action || "").toString().trim();

  switch (action) {
    case "upload_event_file":
      requireEventHubAdmin_(payload.admin_key || "");
      return renderJson_(true, uploadPortalEventFile_(payload));
    case "mark_file_visible":
      requireEventHubAdmin_(payload.admin_key || "");
      return renderJson_(true, markPortalFileVisible_(payload.file_id || "", payload.visible));
    case "delete_event_file":
      requireEventHubAdmin_(payload.admin_key || "");
      return renderJson_(true, deletePortalFile_(payload.file_id || ""));
    default:
      return renderJson_(false, {
        error: "unknown_eventhub_post_action",
        action: action
      });
  }
}

function requireEventHubAdmin_(providedKey) {
  const config = getBarowoConfig_();
  if (!config.eventHubAdminKey) {
    throw new Error("eventhub_admin_key_missing");
  }

  if (!providedKey || providedKey !== config.eventHubAdminKey) {
    throw new Error("forbidden");
  }
}

function normalizeSearchValue_(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase();
}

function toBooleanString_(value) {
  return value === true || value === "true" || value === "1" ? "true" : "false";
}

function isTrueValue_(value) {
  return toBooleanString_(value) === "true";
}

function mapSchemaRowToObject_(schema, row) {
  const record = {};
  schema.headers.forEach(function (header, index) {
    record[header] = row[index] !== undefined ? row[index] : "";
  });
  return record;
}

function getSchemaObjects_(schema) {
  const sheet = getOrCreateSheet_(schema);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, schema.headers.length).getValues();
  return rows.map(function (row) {
    return mapSchemaRowToObject_(schema, row);
  });
}

function getSchemaObjectAndRow_(schema, fieldName, value) {
  const rowNumber = findSchemaRowByField_(schema, fieldName, value);
  if (rowNumber < 2) {
    return null;
  }

  const row = getOrCreateSheet_(schema).getRange(rowNumber, 1, 1, schema.headers.length).getValues()[0];
  return {
    rowNumber: rowNumber,
    record: mapSchemaRowToObject_(schema, row)
  };
}

function writeSchemaObject_(schema, rowNumber, record) {
  const row = schema.headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : "";
  });
  getOrCreateSheet_(schema).getRange(rowNumber, 1, 1, row.length).setValues([row]);
}

function formatPortalDateLabel_(value) {
  const normalized = formatDate(value);
  return normalized || "";
}

function buildPortalEventDto_(record) {
  return {
    id: record.event_id || "",
    token: record.token || "",
    eventId: record.event_id || "",
    clientName: record.client_name || "",
    eventType: record.event_type || "",
    eventDate: formatPortalDateLabel_(record.event_date),
    city: record.city || "",
    guestsCount: record.guests_count || "",
    packageName: record.package_name || "",
    durationHours: record.duration_hours || "",
    status: record.status || "NEW_LEAD",
    nextAction: record.next_action || "",
    summary: record.summary || "",
    managerName: record.manager_name || "",
    managerEmail: record.manager_email || "",
    managerPhone: record.manager_phone || "",
    isActive: isTrueValue_(record.is_active),
    createdAt: record.created_at || "",
    updatedAt: record.updated_at || record.created_at || ""
  };
}

function buildPortalFileDto_(record) {
  return {
    id: record.file_id || "",
    eventId: record.event_id || "",
    title: record.title || record.file_name || "Plik",
    type: record.type || "other",
    storageKey: record.storage_key || "",
    fileName: record.file_name || "",
    mimeType: record.mime_type || "",
    size: record.size || "",
    uploadedAt: record.created_at || "",
    visibleToClient: isTrueValue_(record.visible_to_client),
    uploadedBy: record.uploaded_by || "",
    storageDriver: record.storage_driver || "",
    updatedAt: record.updated_at || record.created_at || ""
  };
}

function findPortalEventByToken_(token) {
  if (!token) {
    return null;
  }
  return getSchemaObjectAndRow_(BAROWO_SHEET_SCHEMAS.portalEvents, "token", token);
}

function findPortalEventById_(eventId) {
  if (!eventId) {
    return null;
  }
  return getSchemaObjectAndRow_(BAROWO_SHEET_SCHEMAS.portalEvents, "event_id", eventId);
}

function findPortalFileById_(fileId) {
  if (!fileId) {
    return null;
  }
  return getSchemaObjectAndRow_(BAROWO_SHEET_SCHEMAS.portalFiles, "file_id", fileId);
}

function listPortalFilesByEventId_(eventId, includeHidden) {
  return getSchemaObjects_(BAROWO_SHEET_SCHEMAS.portalFiles)
    .filter(function (record) {
      if ((record.event_id || "") !== eventId) {
        return false;
      }

      return includeHidden ? true : isTrueValue_(record.visible_to_client);
    })
    .sort(function (left, right) {
      return (right.created_at || "").localeCompare(left.created_at || "");
    });
}

function countVisiblePortalFiles_(eventId) {
  return listPortalFilesByEventId_(eventId, false).length;
}

function getPortalPayloadByToken_(token) {
  const result = findPortalEventByToken_(token);
  if (!result) {
    return {
      error: "portal_not_found"
    };
  }

  if (!isTrueValue_(result.record.is_active)) {
    return {
      error: "portal_disabled"
    };
  }

  return {
    portal: buildPortalEventDto_(result.record),
    files: listPortalFilesByEventId_(result.record.event_id, false).map(buildPortalFileDto_)
  };
}

function listAdminPortalEvents_(searchTerm) {
  const query = normalizeSearchValue_(searchTerm);
  return getSchemaObjects_(BAROWO_SHEET_SCHEMAS.portalEvents)
    .filter(function (record) {
      if (!query) {
        return true;
      }

      const haystack = [
        record.client_name,
        record.event_type,
        record.city,
        record.status,
        record.manager_name,
        record.event_id,
        record.token,
        record.event_date
      ].join(" ").toLowerCase();

      return haystack.indexOf(query) >= 0;
    })
    .sort(function (left, right) {
      return (right.updated_at || right.created_at || "").localeCompare(left.updated_at || left.created_at || "");
    })
    .slice(0, 30)
    .map(function (record) {
      const portal = buildPortalEventDto_(record);
      portal.documentsCount = countVisiblePortalFiles_(record.event_id);
      portal.portalUrl = getBarowoConfig_().portalBaseUrl.replace(/\/$/, "") + "/" + (record.token || "");
      return portal;
    });
}

function getAdminPortalEventPayload_(eventId) {
  const result = findPortalEventById_(eventId);
  if (!result) {
    return {
      error: "event_not_found"
    };
  }

  const portal = buildPortalEventDto_(result.record);
  portal.portalUrl = getBarowoConfig_().portalBaseUrl.replace(/\/$/, "") + "/" + (result.record.token || "");

  return {
    portal: portal,
    files: listPortalFilesByEventId_(eventId, true).map(buildPortalFileDto_)
  };
}

function resolveEventFileAccess_(params) {
  const fileId = (params.file_id || "").toString().trim();
  const token = (params.token || "").toString().trim();
  const adminKey = (params.admin_key || "").toString().trim();
  const download = isTrueValue_(params.download || false);
  const fileResult = findPortalFileById_(fileId);

  if (!fileResult) {
    return {
      error: "file_not_found"
    };
  }

  const eventResult = findPortalEventById_(fileResult.record.event_id || "");
  if (!eventResult) {
    return {
      error: "event_not_found"
    };
  }

  if (adminKey) {
    requireEventHubAdmin_(adminKey);
  } else {
    if (!token || token !== (eventResult.record.token || "")) {
      return {
        error: "forbidden"
      };
    }

    if (!isTrueValue_(eventResult.record.is_active) || !isTrueValue_(fileResult.record.visible_to_client)) {
      return {
        error: "file_not_available"
      };
    }
  }

  return {
    file_url: getEventStorageAdapter_().getSignedFileUrl(fileResult.record, {
      download: download
    })
  };
}

function validateEventFilePayload_(payload) {
  if (!payload.event_id) {
    throw new Error("event_id_required");
  }

  if (!payload.title) {
    throw new Error("file_title_required");
  }

  if (EVENTHUB_ALLOWED_FILE_TYPES.indexOf(payload.type) < 0) {
    throw new Error("invalid_file_type");
  }

  if (!payload.file_name || !payload.mime_type || !payload.base64_data) {
    throw new Error("file_payload_incomplete");
  }

  if (payload.base64_data.length > 12 * 1024 * 1024) {
    throw new Error("file_too_large");
  }
}

function touchPortalEventRecord_(eventId, overrides) {
  const result = findPortalEventById_(eventId);
  if (!result) {
    return;
  }

  const nextRecord = Object.assign({}, result.record, overrides || {}, {
    updated_at: new Date().toISOString()
  });

  writeSchemaObject_(BAROWO_SHEET_SCHEMAS.portalEvents, result.rowNumber, nextRecord);
}

function maybeAdvancePortalEventFromFile_(eventRecord, fileType, isVisibleToClient) {
  if (!eventRecord || !isVisibleToClient) {
    return;
  }

  const currentStatus = eventRecord.status || "NEW_LEAD";
  let nextStatus = currentStatus;
  let nextAction = eventRecord.next_action || "";

  if (fileType === "offer" && EVENTHUB_STATUS_ORDER[currentStatus] < EVENTHUB_STATUS_ORDER.OFFER_READY) {
    nextStatus = "OFFER_READY";
    nextAction = "Zapoznaj się z przygotowaną ofertą.";
  }

  if (fileType === "contract" && EVENTHUB_STATUS_ORDER[currentStatus] < EVENTHUB_STATUS_ORDER.DOCS_READY) {
    nextStatus = "DOCS_READY";
    nextAction = "Zapoznaj się z przygotowaną umową.";
  }

  if (nextStatus !== currentStatus || nextAction !== (eventRecord.next_action || "")) {
    touchPortalEventRecord_(eventRecord.event_id, {
      status: nextStatus,
      next_action: nextAction
    });
  }
}

function uploadPortalEventFile_(payload) {
  validateEventFilePayload_(payload);

  const eventResult = findPortalEventById_(payload.event_id);
  if (!eventResult) {
    throw new Error("event_not_found");
  }

  const storage = getEventStorageAdapter_();
  const uploaded = storage.uploadEventFile(payload.event_id, {
    fileName: payload.file_name,
    mimeType: payload.mime_type,
    base64Data: payload.base64_data
  }, {
    title: payload.title,
    type: payload.type,
    uploadedBy: payload.uploaded_by || "BAROWO Team"
  });
  const createdAt = new Date().toISOString();
  const record = {
    file_id: "file_" + Utilities.getUuid().replace(/-/g, "").substring(0, 20),
    created_at: createdAt,
    event_id: payload.event_id,
    title: payload.title,
    type: payload.type,
    storage_key: uploaded.storageKey || "",
    file_name: uploaded.fileName || payload.file_name,
    mime_type: uploaded.mimeType || payload.mime_type,
    size: uploaded.size || "",
    visible_to_client: toBooleanString_(payload.visible_to_client),
    uploaded_by: payload.uploaded_by || "BAROWO Team",
    file_url: uploaded.fileUrl || "",
    updated_at: createdAt,
    storage_driver: uploaded.storageDriver || getBarowoConfig_().eventHubStorageDriver
  };

  upsertSchemaRecord_(BAROWO_SHEET_SCHEMAS.portalFiles, "file_id", record.file_id, record);
  maybeAdvancePortalEventFromFile_(eventResult.record, record.type, isTrueValue_(record.visible_to_client));
  touchPortalEventRecord_(payload.event_id, null);

  return {
    file: buildPortalFileDto_(record),
    portal: getAdminPortalEventPayload_(payload.event_id).portal
  };
}

function markPortalFileVisible_(fileId, visible) {
  const result = findPortalFileById_(fileId);
  if (!result) {
    throw new Error("file_not_found");
  }

  const nextRecord = Object.assign({}, result.record, {
    visible_to_client: toBooleanString_(visible),
    updated_at: new Date().toISOString()
  });

  writeSchemaObject_(BAROWO_SHEET_SCHEMAS.portalFiles, result.rowNumber, nextRecord);
  touchPortalEventRecord_(nextRecord.event_id, null);

  if (isTrueValue_(nextRecord.visible_to_client)) {
    const eventResult = findPortalEventById_(nextRecord.event_id);
    maybeAdvancePortalEventFromFile_(eventResult ? eventResult.record : null, nextRecord.type, true);
  }

  return {
    file: buildPortalFileDto_(nextRecord)
  };
}

function deletePortalFile_(fileId) {
  const result = findPortalFileById_(fileId);
  if (!result) {
    throw new Error("file_not_found");
  }

  getEventStorageAdapter_().deleteEventFile(result.record);
  getOrCreateSheet_(BAROWO_SHEET_SCHEMAS.portalFiles).deleteRow(result.rowNumber);
  touchPortalEventRecord_(result.record.event_id, null);

  return {
    deleted: true,
    fileId: fileId,
    eventId: result.record.event_id || ""
  };
}

function ensureEventHubDriveFolder_() {
  const props = PropertiesService.getScriptProperties();
  const config = getBarowoConfig_();
  if (config.eventHubDriveFolderId) {
    try {
      return DriveApp.getFolderById(config.eventHubDriveFolderId);
    } catch (error) {
      appendLog_("warn", "eventhub", "stored drive folder missing, recreating", null);
    }
  }

  const existingFolders = DriveApp.getFoldersByName(config.eventHubDriveFolderName);
  const folder = existingFolders.hasNext()
    ? existingFolders.next()
    : DriveApp.createFolder(config.eventHubDriveFolderName);

  props.setProperty("BAROWO_EVENTHUB_DRIVE_FOLDER_ID", folder.getId());
  return folder;
}

function createDriveEventStorageAdapter_() {
  return {
    uploadEventFile: function (eventId, filePayload, metadata) {
      const folder = ensureEventHubDriveFolder_();
      const bytes = Utilities.base64Decode(filePayload.base64Data);
      const blob = Utilities.newBlob(
        bytes,
        filePayload.mimeType || "application/octet-stream",
        filePayload.fileName || ("event-file-" + Date.now())
      );
      const file = folder.createFile(blob);

      file.setDescription([
        "BAROWO EventHub",
        "eventId=" + eventId,
        "title=" + (metadata.title || "")
      ].join(" | "));
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return {
        storageKey: file.getId(),
        fileName: file.getName(),
        mimeType: file.getMimeType(),
        size: file.getSize(),
        fileUrl: file.getUrl(),
        storageDriver: "drive"
      };
    },
    deleteEventFile: function (fileRecord) {
      if (!fileRecord.storage_key) {
        return;
      }

      try {
        DriveApp.getFileById(fileRecord.storage_key).setTrashed(true);
      } catch (error) {
        appendLog_("warn", "eventhub", "drive delete failed", {
          file_id: fileRecord.file_id || "",
          storage_key: fileRecord.storage_key,
          message: error.message
        });
      }
    },
    getSignedFileUrl: function (fileRecord, options) {
      if (!fileRecord.storage_key) {
        return fileRecord.file_url || "";
      }

      if (options && options.download) {
        return "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(fileRecord.storage_key);
      }

      return "https://drive.google.com/file/d/" + encodeURIComponent(fileRecord.storage_key) + "/view?usp=sharing";
    }
  };
}

function createMockEventStorageAdapter_() {
  return {
    uploadEventFile: function (eventId, filePayload) {
      return {
        storageKey: "mock_" + eventId + "_" + Date.now(),
        fileName: filePayload.fileName || "mock-file",
        mimeType: filePayload.mimeType || "application/octet-stream",
        size: Math.round((filePayload.base64Data || "").length * 0.75),
        fileUrl: "data:" + (filePayload.mimeType || "application/octet-stream") + ";base64," + (filePayload.base64Data || ""),
        storageDriver: "mock"
      };
    },
    deleteEventFile: function () {
      return;
    },
    getSignedFileUrl: function (fileRecord) {
      return fileRecord.file_url || "";
    }
  };
}

function getEventStorageAdapter_() {
  const driver = normalizeSearchValue_(getBarowoConfig_().eventHubStorageDriver || BAROWO_DEFAULTS.eventHubStorageDriver);
  if (driver === "mock") {
    return createMockEventStorageAdapter_();
  }
  return createDriveEventStorageAdapter_();
}
