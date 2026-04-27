const trim = (value) => String(value || "").replace(/\/+$/, "");

const unique = (items) => [...new Set(items.filter(Boolean))];

const readEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const DEFAULT_FLASK_PORT = 5000;
const DEFAULT_TIMEOUT_MS = 2500;

const seedBases = () => {
  const explicitCameraBase = readEnv(
    "EXPO_PUBLIC_CAMERA_PUBLIC_BASE_URL",
    "EXPO_PUBLIC_CAMERA_BASE_URL",
  );
  const explicitBackendBase = readEnv(
    "EXPO_PUBLIC_BACKEND_URL",
    "EXPO_PUBLIC_BACKEND_BASE_URL",
  );
  const discoveryHost = readEnv(
    "EXPO_PUBLIC_DISCOVERY_SEED_HOST",
    "EXPO_PUBLIC_DISCOVERY_SEED_HOSTS",
  );
  const allowLocalhost =
    readEnv("EXPO_PUBLIC_ALLOW_LOCALHOST_SEED")?.toLowerCase() === "true";

  const hosts = unique(
    [
      explicitCameraBase,
      explicitBackendBase,
      discoveryHost ? `http://${discoveryHost}` : "",
      "http://10.0.2.2:5000",
      allowLocalhost ? "http://localhost:5000" : "",
      allowLocalhost ? "http://127.0.0.1:5000" : "",
    ].map(trim),
  );

  return hosts;
};

const fetchWithTimeout = async (url, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { method: "GET", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const fetchConnectionInfo = async (seedBase) => {
  const url = `${trim(seedBase)}/api/connection-info`;
  try {
    const response = await fetchWithTimeout(url, DEFAULT_TIMEOUT_MS);
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.status !== "success") return null;
    return data;
  } catch {
    return null;
  }
};

const probeStatus = async (base) => {
  const url = `${trim(base)}/status`;
  try {
    const response = await fetchWithTimeout(url, DEFAULT_TIMEOUT_MS);
    return response.ok;
  } catch {
    return false;
  }
};

const main = async () => {
  const seeds = seedBases();
  const mergedCandidates = [];

  console.log("[verify] seedBases:", JSON.stringify(seeds));

  for (const seed of seeds) {
    if (!mergedCandidates.includes(seed)) mergedCandidates.push(seed);
    const info = await fetchConnectionInfo(seed);
    if (!info) continue;

    const infoBases = unique([
      info.preferred_base_url,
      ...(Array.isArray(info.base_candidates) ? info.base_candidates : []),
    ]);

    for (const candidate of infoBases) {
      if (!mergedCandidates.includes(candidate))
        mergedCandidates.push(candidate);
    }
  }

  console.log("[verify] mergedCandidates:", JSON.stringify(mergedCandidates));

  let activeBase = null;
  for (const candidate of mergedCandidates) {
    const ok = await probeStatus(candidate);
    console.log(`[verify] ${candidate}/status -> ${ok ? "ok" : "fail"}`);
    if (ok) {
      activeBase = candidate;
      break;
    }
  }

  console.log("[verify] activeBase:", activeBase || "<none>");

  if (!activeBase) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error("[verify] fatal:", error);
  process.exitCode = 1;
});
