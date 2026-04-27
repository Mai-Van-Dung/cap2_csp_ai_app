import { Platform } from "react-native";

const DEFAULT_FLASK_PORT = 5000;
const DEFAULT_NODE_PORT = 5003;
const DISCOVERY_PATH = "/api/connection-info";
const DISCOVERY_TIMEOUT_MS = 2800;
const DISCOVERY_CACHE_TTL_MS = 2 * 60 * 1000;

export const DEFAULT_SOCKET_PORT = DEFAULT_FLASK_PORT;

let cachedConnectionInfo = null;
let cachedConnectionInfoAt = 0;
let discoveryInFlight = null;

const readEnv = (...keys) => {
  for (const key of keys) {
    const value = typeof process !== "undefined" ? process.env?.[key] : "";
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const stripTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");
const unique = (arr) => [...new Set(arr.filter(Boolean))];
const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || ""));

const shouldIncludeLocalhostSeeds = () => {
  const allowLocalhost = readEnv(
    "EXPO_PUBLIC_ALLOW_LOCALHOST_SEED",
    "VITE_ALLOW_LOCALHOST_SEED",
  );
  return Platform.OS === "web" || allowLocalhost.toLowerCase() === "true";
};

const getWebHostname = () => {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return "";
  }

  return window.location?.hostname || "";
};

const getSeedHosts = () => {
  const fromCsv = readEnv(
    "EXPO_PUBLIC_DISCOVERY_SEED_HOSTS",
    "VITE_DISCOVERY_SEED_HOSTS",
  )
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const fromSingle = readEnv(
    "EXPO_PUBLIC_DISCOVERY_SEED_HOST",
    "VITE_DISCOVERY_SEED_HOST",
  );

  const hosts = [
    getWebHostname(),
    ...fromCsv,
    fromSingle,
    readEnv("EXPO_PUBLIC_CAMERA_DEV_HOST", "VITE_CAMERA_DEV_HOST"),
  ];

  if (Platform.OS === "android") {
    hosts.push("10.0.2.2");
  }

  if (shouldIncludeLocalhostSeeds()) {
    hosts.push("localhost", "127.0.0.1");
  }

  return unique(hosts);
};

const buildHostCandidates = ({ port, includeLocalhost = false } = {}) => {
  const hosts = [...getSeedHosts()];
  const webHost = getWebHostname();

  if (webHost) hosts.push(webHost);

  if (includeLocalhost && shouldIncludeLocalhostSeeds()) {
    hosts.push("localhost", "127.0.0.1");
  }

  return [...new Set(hosts)].map((host) => `http://${host}:${port}`);
};

const deriveApiBaseFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname
      .replace(/\/alerts\/?$/, "")
      .replace(/\/+$/, "");
    parsed.pathname = pathname || "/";
    return stripTrailingSlash(parsed.toString());
  } catch {
    return "";
  }
};

const toOrigin = (value) => {
  if (!value) return "";
  try {
    return stripTrailingSlash(new URL(value).origin);
  } catch {
    return "";
  }
};

const mapBaseToPort = (value, port) => {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.hostname}:${port}`;
  } catch {
    return "";
  }
};

const buildCandidateUrlsFromBase = (baseUrl, path) => {
  if (!baseUrl) return [];
  const normalizedBase = stripTrailingSlash(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return [`${normalizedBase}${normalizedPath}`];
};

const withTimeout = async (
  url,
  options = {},
  timeoutMs = DISCOVERY_TIMEOUT_MS,
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const tryReadConnectionInfo = async (baseUrl) => {
  const base = stripTrailingSlash(baseUrl || "");
  if (!isHttpUrl(base)) return null;

  try {
    const response = await withTimeout(`${base}${DISCOVERY_PATH}`, {
      method: "GET",
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const extractConnectionCandidates = (payload) => {
  const cameraViewerUrl =
    payload?.camera?.viewer_url || payload?.camera?.viewerUrl || "";
  const socketHandshakeUrl =
    payload?.socket?.handshake_url || payload?.socket?.handshakeUrl || "";

  const candidates = [
    payload?.preferred_base_url,
    ...(Array.isArray(payload?.base_candidates) ? payload.base_candidates : []),
    toOrigin(cameraViewerUrl),
    toOrigin(socketHandshakeUrl),
  ]
    .map((value) => stripTrailingSlash(String(value || "").trim()))
    .filter(isHttpUrl);

  return {
    preferredBaseUrl: stripTrailingSlash(
      String(payload?.preferred_base_url || "").trim(),
    ),
    baseCandidates: unique(candidates),
    cameraViewerUrl,
    socketHandshakeUrl,
  };
};

const normalizeConnectionInfo = ({
  status = "success",
  preferredBaseUrl = "",
  baseCandidates = [],
  cameraViewerUrl = "",
  socketHandshakeUrl = "",
} = {}) => {
  const normalizedPreferredBaseUrl = stripTrailingSlash(
    String(preferredBaseUrl || "").trim(),
  );
  const normalizedBaseCandidates = unique(
    (Array.isArray(baseCandidates) ? baseCandidates : [])
      .map((value) => stripTrailingSlash(String(value || "").trim()))
      .filter(isHttpUrl),
  );

  const normalizedCameraViewerUrl = String(cameraViewerUrl || "").trim();
  const normalizedSocketHandshakeUrl = String(socketHandshakeUrl || "").trim();

  const resolvedPreferredBaseUrl =
    normalizedPreferredBaseUrl ||
    toOrigin(normalizedCameraViewerUrl) ||
    toOrigin(normalizedSocketHandshakeUrl) ||
    normalizedBaseCandidates[0] ||
    "";

  const resolvedCameraViewerUrl =
    normalizedCameraViewerUrl ||
    (resolvedPreferredBaseUrl
      ? `${resolvedPreferredBaseUrl}/viewer/camera?label=${encodeURIComponent("Camera chinh")}`
      : "");

  const resolvedSocketHandshakeUrl =
    normalizedSocketHandshakeUrl ||
    (resolvedPreferredBaseUrl ? `${resolvedPreferredBaseUrl}` : "");

  return {
    status,
    preferred_base_url: resolvedPreferredBaseUrl,
    base_candidates: normalizedBaseCandidates,
    camera: {
      viewer_path: "/viewer/camera",
      video_feed_path: "/video_feed",
      status_path: "/status",
      viewer_url: resolvedCameraViewerUrl,
    },
    socket: {
      path: getSocketPath(),
      event: "new_alert",
      handshake_url: resolvedSocketHandshakeUrl,
    },
    preferredBaseUrl: resolvedPreferredBaseUrl,
    baseCandidates: normalizedBaseCandidates,
    cameraViewerUrl: resolvedCameraViewerUrl,
    socketHandshakeUrl: resolvedSocketHandshakeUrl,
  };
};

const buildDiscoverySeedBaseUrls = () => {
  const hosts = getSeedHosts();
  const explicitCameraBaseUrl = readEnv(
    "EXPO_PUBLIC_CAMERA_PUBLIC_BASE_URL",
    "VITE_CAMERA_PUBLIC_BASE_URL",
    "EXPO_PUBLIC_CAMERA_BASE_URL",
    "VITE_CAMERA_BASE_URL",
  );
  const explicitBackendBaseUrl = readEnv(
    "EXPO_PUBLIC_BACKEND_URL",
    "EXPO_PUBLIC_BACKEND_BASE_URL",
    "VITE_BACKEND_BASE_URL",
  );
  const explicitAlertsApiUrl = readEnv(
    "EXPO_PUBLIC_ALERTS_API_URL",
    "VITE_ALERTS_API_URL",
  );
  const derivedApiBase = deriveApiBaseFromUrl(explicitAlertsApiUrl);
  const explicitPublicBaseUrl = readEnv(
    "EXPO_PUBLIC_PUBLIC_BASE_URL",
    "VITE_PUBLIC_BASE_URL",
    "EXPO_PUBLIC_BACKEND_BASE_URL",
    "VITE_BACKEND_BASE_URL",
  );

  return unique(
    [
      stripTrailingSlash(explicitCameraBaseUrl),
      stripTrailingSlash(
        mapBaseToPort(explicitBackendBaseUrl, DEFAULT_FLASK_PORT),
      ),
      stripTrailingSlash(mapBaseToPort(derivedApiBase, DEFAULT_FLASK_PORT)),
      stripTrailingSlash(explicitPublicBaseUrl),
      ...hosts.map((host) => `http://${host}:${DEFAULT_FLASK_PORT}`),
      ...buildHostCandidates({
        port: DEFAULT_FLASK_PORT,
        includeLocalhost: Platform.OS === "web",
      }),
    ].filter(isHttpUrl),
  );
};

const resolveConnectionInfo = async () => {
  const seedBaseUrls = buildDiscoverySeedBaseUrls();
  const mergedSeedCandidates = [];

  for (const seedBaseUrl of seedBaseUrls) {
    mergedSeedCandidates.push(seedBaseUrl);
    const payload = await tryReadConnectionInfo(seedBaseUrl);
    if (!payload) continue;

    const extracted = extractConnectionCandidates(payload);
    const mergedCandidates = unique([
      ...seedBaseUrls,
      ...extracted.baseCandidates,
      seedBaseUrl,
    ]);
    const discoveredCandidates =
      extracted.baseCandidates.length > 0
        ? extracted.baseCandidates
        : [seedBaseUrl];

    const reachableCandidates = [];
    for (const candidate of discoveredCandidates) {
      const ok = await tryReadConnectionInfo(candidate);
      if (ok) {
        reachableCandidates.push(candidate);
      }
    }

    const baseCandidates =
      reachableCandidates.length > 0
        ? reachableCandidates
        : discoveredCandidates;

    return normalizeConnectionInfo({
      status: "success",
      preferredBaseUrl:
        baseCandidates.find(
          (candidate) => candidate === extracted.preferredBaseUrl,
        ) ||
        baseCandidates[0] ||
        seedBaseUrl,
      baseCandidates:
        mergedCandidates.length > 0 ? mergedCandidates : baseCandidates,
      cameraViewerUrl:
        extracted.cameraViewerUrl ||
        (baseCandidates[0]
          ? `${baseCandidates[0]}/viewer/camera?label=${encodeURIComponent("Camera chinh")}`
          : ""),
      socketHandshakeUrl:
        extracted.socketHandshakeUrl || baseCandidates[0] || "",
    });
  }

  return normalizeConnectionInfo({
    status: "fallback",
    preferredBaseUrl: mergedSeedCandidates[0] || "",
    baseCandidates: mergedSeedCandidates,
  });
};

export const refreshConnectionInfo = async ({ force = false } = {}) => {
  const cacheFresh =
    Date.now() - cachedConnectionInfoAt < DISCOVERY_CACHE_TTL_MS;
  if (!force && cacheFresh && cachedConnectionInfo) {
    return cachedConnectionInfo;
  }

  if (discoveryInFlight) {
    return discoveryInFlight;
  }

  discoveryInFlight = resolveConnectionInfo()
    .then((result) => {
      cachedConnectionInfo = result;
      cachedConnectionInfoAt = Date.now();
      return cachedConnectionInfo;
    })
    .finally(() => {
      discoveryInFlight = null;
    });

  return discoveryInFlight;
};

const getDiscoveredBaseCandidates = () => {
  const baseCandidates =
    cachedConnectionInfo?.baseCandidates ||
    cachedConnectionInfo?.base_candidates;

  return Array.isArray(baseCandidates) ? baseCandidates : [];
};

const getDiscoveredSocketBase = () => {
  return toOrigin(
    cachedConnectionInfo?.socketHandshakeUrl ||
      cachedConnectionInfo?.socket?.handshake_url ||
      cachedConnectionInfo?.socket?.handshakeUrl ||
      "",
  );
};

const getNodePort = () => {
  const parsed = Number(
    readEnv("EXPO_PUBLIC_NODE_PORT", "VITE_NODE_PORT") || DEFAULT_NODE_PORT,
  );
  return Number.isFinite(parsed) ? parsed : DEFAULT_NODE_PORT;
};

const mapPythonBasesToNodeApiBases = (bases) => {
  const nodePort = getNodePort();
  return bases
    .map((base) => {
      try {
        const parsed = new URL(base);
        return `${parsed.protocol}//${parsed.hostname}:${nodePort}/api`;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
};

export const getApiBaseCandidates = () => {
  const explicitAlertsApiUrl = readEnv(
    "EXPO_PUBLIC_ALERTS_API_URL",
    "VITE_ALERTS_API_URL",
  );

  if (explicitAlertsApiUrl) {
    const derived = deriveApiBaseFromUrl(explicitAlertsApiUrl);
    if (derived) return [derived];
  }

  const backendBaseUrl = readEnv(
    "EXPO_PUBLIC_BACKEND_URL",
    "EXPO_PUBLIC_BACKEND_BASE_URL",
    "VITE_BACKEND_BASE_URL",
  );

  if (backendBaseUrl) {
    return [`${stripTrailingSlash(backendBaseUrl)}/api`];
  }

  const hosts = getSeedHosts();
  const discoveredPythonBases = getDiscoveredBaseCandidates();
  const derivedNodeApiBases = mapPythonBasesToNodeApiBases(
    discoveredPythonBases,
  );

  return unique([
    ...derivedNodeApiBases,
    ...hosts.map((host) => `http://${host}:${getNodePort()}/api`),
    ...buildHostCandidates({
      port: getNodePort(),
      includeLocalhost: Platform.OS === "web",
    }).map((baseUrl) => `${stripTrailingSlash(baseUrl)}/api`),
  ]);
};

export const getCameraBaseCandidates = () => {
  const explicitCameraBaseUrl = readEnv(
    "EXPO_PUBLIC_CAMERA_PUBLIC_BASE_URL",
    "VITE_CAMERA_PUBLIC_BASE_URL",
    "EXPO_PUBLIC_CAMERA_BASE_URL",
    "VITE_CAMERA_BASE_URL",
  );
  const candidates = [...getDiscoveredBaseCandidates()];

  if (explicitCameraBaseUrl) {
    candidates.push(stripTrailingSlash(explicitCameraBaseUrl));
  }

  const explicitBackendBaseUrl = readEnv(
    "EXPO_PUBLIC_BACKEND_URL",
    "EXPO_PUBLIC_BACKEND_BASE_URL",
    "VITE_BACKEND_BASE_URL",
  );
  const explicitAlertsApiUrl = readEnv(
    "EXPO_PUBLIC_ALERTS_API_URL",
    "VITE_ALERTS_API_URL",
  );
  const derivedApiBase = deriveApiBaseFromUrl(explicitAlertsApiUrl);

  if (explicitBackendBaseUrl) {
    candidates.push(
      stripTrailingSlash(
        mapBaseToPort(explicitBackendBaseUrl, DEFAULT_FLASK_PORT),
      ),
    );
    candidates.push(stripTrailingSlash(explicitBackendBaseUrl));
  }

  if (derivedApiBase) {
    candidates.push(
      stripTrailingSlash(mapBaseToPort(derivedApiBase, DEFAULT_FLASK_PORT)),
    );
  }

  const seedHosts = getSeedHosts();
  candidates.push(
    ...seedHosts.map((host) => `http://${host}:${DEFAULT_FLASK_PORT}`),
  );

  if (Platform.OS === "android") {
    candidates.push(`http://10.0.2.2:${DEFAULT_FLASK_PORT}`);
  }

  if (shouldIncludeLocalhostSeeds()) {
    candidates.push(
      `http://localhost:${DEFAULT_FLASK_PORT}`,
      `http://127.0.0.1:${DEFAULT_FLASK_PORT}`,
    );
  }

  candidates.push(
    ...buildHostCandidates({
      port: DEFAULT_FLASK_PORT,
      includeLocalhost: Platform.OS === "web",
    }),
  );

  return unique(candidates.map((u) => stripTrailingSlash(u)));
};

export const getSocketBaseCandidates = () => {
  const explicitSocketBaseUrl = readEnv(
    "EXPO_PUBLIC_SOCKET_BASE_URL",
    "VITE_SOCKET_BASE_URL",
  );

  const candidates = [
    ...getDiscoveredBaseCandidates(),
    getDiscoveredSocketBase(),
  ];

  if (explicitSocketBaseUrl) {
    candidates.push(stripTrailingSlash(explicitSocketBaseUrl));
  }

  const apiOrigins = getApiBaseCandidates().map(toOrigin).filter(Boolean);
  candidates.push(...apiOrigins);
  candidates.push(...getCameraBaseCandidates());
  return unique(candidates.map((u) => stripTrailingSlash(u)));
};

export const getSocketPath = () => {
  const explicitSocketPath = readEnv(
    "EXPO_PUBLIC_SOCKET_PATH",
    "VITE_SOCKET_PATH",
  );
  return explicitSocketPath || "/socket.io";
};

export const getSocketOriginFromHostname = (hostname) => {
  if (!hostname) return "";
  return `http://${hostname}:${DEFAULT_SOCKET_PORT}`;
};

export const getViewerUrl = (baseUrl, label = "Camera chinh") => {
  if (!baseUrl) return "";
  return `${stripTrailingSlash(baseUrl)}/viewer/camera?label=${encodeURIComponent(label)}`;
};

export const getVideoFeedUrl = () => {
  const explicitVideoFeedUrl = readEnv(
    "EXPO_PUBLIC_VIDEO_FEED_URL",
    "VITE_VIDEO_FEED_URL",
  );

  if (explicitVideoFeedUrl) {
    return stripTrailingSlash(explicitVideoFeedUrl);
  }

  const cameraBaseUrl = getCameraBaseCandidates()[0];
  return cameraBaseUrl ? `${stripTrailingSlash(cameraBaseUrl)}/video_feed` : "";
};

export const getAlertImageCandidates = (item) => {
  const candidates = [];

  if (Array.isArray(item?.image_urls)) {
    candidates.push(...item.image_urls.filter(Boolean));
  }

  if (item?.image_url) {
    candidates.push(item.image_url);
  }

  const rawPath = (item?.image_path || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (rawPath) {
    const publicBaseUrl = readEnv(
      "EXPO_PUBLIC_PUBLIC_BASE_URL",
      "VITE_PUBLIC_BASE_URL",
      "EXPO_PUBLIC_BACKEND_BASE_URL",
      "VITE_BACKEND_BASE_URL",
    );

    const baseCandidates = [];
    if (publicBaseUrl) {
      baseCandidates.push(stripTrailingSlash(publicBaseUrl));
    }

    baseCandidates.push(...getCameraBaseCandidates());

    const relativeVariants = rawPath.startsWith("static/")
      ? [rawPath]
      : [rawPath, `static/${rawPath}`];

    for (const baseUrl of [...new Set(baseCandidates)]) {
      for (const relPath of relativeVariants) {
        candidates.push(...buildCandidateUrlsFromBase(baseUrl, relPath));
      }
    }
  }

  return [...new Set(candidates)];
};
