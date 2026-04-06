const EVENTHUB_PREFIX = "/eventhub";

function buildCorsHeaders(request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-barowo-admin-key",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}

function withCors(response, request) {
  const headers = new Headers(response.headers);
  const corsHeaders = buildCorsHeaders(request);

  Object.keys(corsHeaders).forEach((key) => {
    headers.set(key, corsHeaders[key]);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function jsonResponse(body, init = {}, request = null) {
  const response = new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });

  return request ? withCors(response, request) : response;
}

function isSecretValid(request, env) {
  if (!env.TELEGRAM_WEBHOOK_SECRET) {
    return true;
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === env.TELEGRAM_WEBHOOK_SECRET;
}

function getAppsScriptBaseUrl(env) {
  if (!env.APPS_SCRIPT_WEBHOOK_URL) {
    throw new Error("Missing APPS_SCRIPT_WEBHOOK_URL");
  }

  return env.APPS_SCRIPT_WEBHOOK_URL;
}

function buildAppsScriptUrl(env, params) {
  const url = new URL(getAppsScriptBaseUrl(env));

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function callAppsScriptJson(url, init = {}) {
  const response = await fetch(url, {
    method: init.method || "GET",
    headers: init.headers || {},
    body: init.body,
    redirect: "follow"
  });

  const responseText = await response.text();
  let json;

  try {
    json = JSON.parse(responseText);
  } catch (error) {
    throw new Error("Apps Script returned non-JSON response");
  }

  return {
    status: response.status,
    json
  };
}

async function forwardTelegramUpdateToAppsScript(update, env) {
  const form = new URLSearchParams();
  form.set("telegram_payload", JSON.stringify(update));
  form.set("relay_token", env.APPS_SCRIPT_RELAY_SECRET || "");

  const response = await callAppsScriptJson(getAppsScriptBaseUrl(env), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: form.toString()
  });

  if (response.status !== 200) {
    throw new Error("Apps Script forward failed: " + response.status);
  }

  if (!response.json || response.json.ok !== true) {
    throw new Error("Apps Script handler rejected update");
  }
}

function mapEventHubErrorStatus(payload) {
  const error = payload && payload.error ? payload.error : "";
  if (error === "portal_not_found" || error === "event_not_found" || error === "file_not_found") {
    return 404;
  }

  if (error === "forbidden" || error === "unauthorized_relay") {
    return 403;
  }

  if (error === "file_too_large" || error === "invalid_file_type" || error === "file_payload_incomplete" || error === "file_title_required" || error === "event_id_required") {
    return 400;
  }

  return 500;
}

function getAdminKey(request, url, body) {
  return request.headers.get("x-barowo-admin-key") ||
    url.searchParams.get("admin_key") ||
    (body && body.admin_key) ||
    "";
}

async function handleEventHubGet(request, env, url) {
  const path = url.pathname;

  if (path.startsWith(`${EVENTHUB_PREFIX}/portal/`)) {
    const token = decodeURIComponent(path.substring(`${EVENTHUB_PREFIX}/portal/`.length));
    const response = await callAppsScriptJson(buildAppsScriptUrl(env, {
      eventhub: "portal",
      token
    }));

    if (!response.json || response.json.ok !== true) {
      return jsonResponse(response.json || { ok: false, error: "portal_failed" }, {
        status: mapEventHubErrorStatus(response.json)
      }, request);
    }

    return jsonResponse(response.json, {}, request);
  }

  if (path === `${EVENTHUB_PREFIX}/admin/events`) {
    const response = await callAppsScriptJson(buildAppsScriptUrl(env, {
      eventhub: "admin_events",
      search: url.searchParams.get("search") || "",
      admin_key: getAdminKey(request, url)
    }));

    if (!response.json || response.json.ok !== true) {
      return jsonResponse(response.json || { ok: false, error: "admin_events_failed" }, {
        status: mapEventHubErrorStatus(response.json)
      }, request);
    }

    return jsonResponse(response.json, {}, request);
  }

  if (path.startsWith(`${EVENTHUB_PREFIX}/admin/events/`)) {
    const eventId = decodeURIComponent(path.substring(`${EVENTHUB_PREFIX}/admin/events/`.length));
    const response = await callAppsScriptJson(buildAppsScriptUrl(env, {
      eventhub: "admin_event",
      event_id: eventId,
      admin_key: getAdminKey(request, url)
    }));

    if (!response.json || response.json.ok !== true) {
      return jsonResponse(response.json || { ok: false, error: "admin_event_failed" }, {
        status: mapEventHubErrorStatus(response.json)
      }, request);
    }

    return jsonResponse(response.json, {}, request);
  }

  if (path.startsWith(`${EVENTHUB_PREFIX}/files/`)) {
    const fileId = decodeURIComponent(path.substring(`${EVENTHUB_PREFIX}/files/`.length));
    const response = await callAppsScriptJson(buildAppsScriptUrl(env, {
      eventhub: "file",
      file_id: fileId,
      token: url.searchParams.get("token") || "",
      admin_key: getAdminKey(request, url),
      download: url.searchParams.get("download") || ""
    }));

    if (!response.json || response.json.ok !== true || !response.json.file_url) {
      return jsonResponse(response.json || { ok: false, error: "file_access_failed" }, {
        status: mapEventHubErrorStatus(response.json)
      }, request);
    }

    return withCors(Response.redirect(response.json.file_url, 302), request);
  }

  return jsonResponse({ ok: false, error: "Not Found" }, { status: 404 }, request);
}

async function handleEventHubPost(request, env, url) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, { status: 400 }, request);
  }

  const adminKey = getAdminKey(request, url, body);
  let action = "";

  if (url.pathname === `${EVENTHUB_PREFIX}/admin/files/upload`) {
    action = "upload_event_file";
  } else if (url.pathname === `${EVENTHUB_PREFIX}/admin/files/visibility`) {
    action = "mark_file_visible";
  } else if (url.pathname === `${EVENTHUB_PREFIX}/admin/files/delete`) {
    action = "delete_event_file";
  } else {
    return jsonResponse({ ok: false, error: "Not Found" }, { status: 404 }, request);
  }

  const response = await callAppsScriptJson(getAppsScriptBaseUrl(env), {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      ...body,
      admin_key: adminKey,
      eventhub_action: action
    })
  });

  if (!response.json || response.json.ok !== true) {
    return jsonResponse(response.json || { ok: false, error: "eventhub_post_failed" }, {
      status: mapEventHubErrorStatus(response.json)
    }, request);
  }

  return jsonResponse(response.json, {}, request);
}

async function handleEventHubRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }), request);
  }

  if (request.method === "GET") {
    return handleEventHubGet(request, env, url);
  }

  if (request.method === "POST") {
    return handleEventHubPost(request, env, url);
  }

  return jsonResponse({ ok: false, error: "Method Not Allowed" }, { status: 405 }, request);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith(EVENTHUB_PREFIX)) {
      try {
        return await handleEventHubRequest(request, env);
      } catch (error) {
        console.error("eventhub_request_failed", {
          message: error.message,
          path: url.pathname
        });
        return jsonResponse({ ok: false, error: "EventHub upstream unavailable" }, { status: 502 }, request);
      }
    }

    if (request.method === "GET") {
      return jsonResponse({
        ok: true,
        service: "barowo-telegram-relay",
        path: url.pathname
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method Not Allowed" }, { status: 405 });
    }

    if (!isSecretValid(request, env)) {
      return jsonResponse({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    let update;
    try {
      update = await request.json();
    } catch (error) {
      return jsonResponse({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    ctx.waitUntil(
      forwardTelegramUpdateToAppsScript(update, env).catch((error) => {
        console.error("forward_to_apps_script_failed", {
          message: error.message,
          updateId: update && typeof update.update_id === "number" ? update.update_id : null
        });
      })
    );

    return jsonResponse({ ok: true, accepted: true });
  }
};
