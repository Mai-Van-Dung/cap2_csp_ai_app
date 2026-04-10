import { Platform } from "react-native";

const DEFAULT_LAN_HOSTS = ["192.168.1.15", "192.168.1.10", "192.168.1.100"];
export const DEFAULT_SOCKET_PORT = 5000;

const readEnv = (...keys) => {
  for (const key of keys) {
    const value = typeof process !== "undefined" ? process.env?.[key] : "";
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const stripTrailingSlash = (value) => value.replace(/\/+$/, "");

const getWebHostname = () => {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return "";
  }

  return window.location?.hostname || "";
};

const buildHostCandidates = ({ port, includeLocalhost = false } = {}) => {
  const hosts = [];
  const webHost = getWebHostname();

  if (webHost) hosts.push(webHost);
  hosts.push(...DEFAULT_LAN_HOSTS);

  if (includeLocalhost && Platform.OS === "web") {
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
  } catch (error) {
    return "";
  }
};

const buildCandidateUrlsFromBase = (baseUrl, path) => {
  if (!baseUrl) return [];
  const normalizedBase = stripTrailingSlash(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return [`${normalizedBase}${normalizedPath}`];
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
    "EXPO_PUBLIC_BACKEND_BASE_URL",
    "VITE_BACKEND_BASE_URL",
  );

  if (backendBaseUrl) {
    return [`${stripTrailingSlash(backendBaseUrl)}/api`];
  }

  return buildHostCandidates({
    port: 5003,
    includeLocalhost: Platform.OS === "web",
  }).map((baseUrl) => `${stripTrailingSlash(baseUrl)}/api`);
};

export const getCameraBaseCandidates = () => {
  const explicitCameraBaseUrl = readEnv(
    "EXPO_PUBLIC_CAMERA_BASE_URL",
    "VITE_CAMERA_BASE_URL",
  );

  if (explicitCameraBaseUrl) {
    return [stripTrailingSlash(explicitCameraBaseUrl)];
  }

  const backendBaseUrl = readEnv(
    "EXPO_PUBLIC_BACKEND_BASE_URL",
    "VITE_BACKEND_BASE_URL",
  );

  if (backendBaseUrl) {
    return [stripTrailingSlash(backendBaseUrl)];
  }

  return buildHostCandidates({
    port: 5000,
    includeLocalhost: Platform.OS === "web",
  });
};

export const getSocketBaseCandidates = () => {
  const explicitSocketBaseUrl = readEnv(
    "EXPO_PUBLIC_SOCKET_BASE_URL",
    "VITE_SOCKET_BASE_URL",
  );

  if (explicitSocketBaseUrl) {
    return [stripTrailingSlash(explicitSocketBaseUrl)];
  }

  return getCameraBaseCandidates();
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
