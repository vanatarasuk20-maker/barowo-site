const BAROWO_SHEET_SCHEMAS = Object.freeze({
  leads: {
    name: BAROWO_DEFAULTS.leadsSheetName,
    headers: [
      "lead_id",
      "legacy_uid",
      "created_at",
      "source",
      "status",
      "client_name",
      "phone",
      "email",
      "event_type",
      "event_date",
      "city",
      "guests",
      "package_name",
      "message",
      "manager_name",
      "portal_token",
      "portal_status",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "page_url",
      "referrer",
      "consent",
      "raw_payload"
    ]
  },
  contacts: {
    name: BAROWO_DEFAULTS.contactsSheetName,
    headers: [
      "contact_id",
      "legacy_uid",
      "created_at",
      "client_name",
      "phone",
      "email",
      "city",
      "last_event_type",
      "last_event_date",
      "lead_status"
    ]
  },
  portalEvents: {
    name: BAROWO_DEFAULTS.portalEventsSheetName,
    headers: [
      "event_id",
      "legacy_uid",
      "created_at",
      "lead_id",
      "client_name",
      "event_type",
      "event_date",
      "city",
      "package_name",
      "guests_count",
      "duration_hours",
      "status",
      "next_action",
      "summary",
      "manager_name",
      "manager_email",
      "manager_phone",
      "token",
      "is_active",
      "updated_at"
    ]
  },
  portalFiles: {
    name: BAROWO_DEFAULTS.portalFilesSheetName,
    headers: [
      "file_id",
      "created_at",
      "event_id",
      "title",
      "type",
      "storage_key",
      "file_name",
      "mime_type",
      "size",
      "visible_to_client",
      "uploaded_by",
      "file_url",
      "updated_at",
      "storage_driver"
    ]
  },
  logs: {
    name: BAROWO_DEFAULTS.logsSheetName,
    headers: [
      "created_at",
      "level",
      "context",
      "message",
      "payload"
    ]
  }
});

function listBarowoSchemas_() {
  return [
    BAROWO_SHEET_SCHEMAS.leads,
    BAROWO_SHEET_SCHEMAS.contacts,
    BAROWO_SHEET_SCHEMAS.portalEvents,
    BAROWO_SHEET_SCHEMAS.portalFiles,
    BAROWO_SHEET_SCHEMAS.logs
  ];
}
