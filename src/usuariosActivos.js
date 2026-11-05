/// <reference types="@fastly/js-compute" />

import { CacheOverride } from "fastly:cache-override";
import { ConfigStore } from "fastly:config-store";

// Debe coincidir con el nombre del backend en fastly.toml (local) y en
// config/edgeFunctions.yaml (producción).
const BACKEND = "usuarios-activos";
const BACKEND_TIMEOUT_MS = 3000;

// Valores por defecto si no existe la clave en el config store (se definen en
// fastly.toml en local y en config/edgeFunctions.yaml en producción).
const DEFAULT_URL = "http://127.0.0.1:7777/usuarios-activos.json";
const DEFAULT_CACHE_CONTROL = "max-age=600";

function getConfig(key, fallback) {
  try {
    return new ConfigStore("config_default").get(key) || fallback;
  } catch (err) {
    return fallback;
  }
}

async function fetchDatosReales() {
  const url = getConfig("USUARIOS_ACTIVOS_URL", DEFAULT_URL);
  const resp = await fetch(url, {
    backend: BACKEND,
    // Sin caché interna: la frescura la controla solo el Cache-Control de la respuesta final.
    cacheOverride: new CacheOverride({ mode: "pass" }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const body = await resp.json();
  if (!Array.isArray(body?.data)) throw new Error('"data" no es un array');
  return body;
}

function conTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`sin respuesta en ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Datos de ejemplo para el mapa (si el backend no responde)
function usuariosActivosMock() {
  return {
    updated_at: new Date().toISOString(),
    data: [
      { country: "ES", active_users: 2256 },
      { country: "US", active_users: 1166 },
      { country: "CN", active_users: 995 },
      { country: "DE", active_users: 863 },
      { country: "NL", active_users: 636 },
    ],
  };
}

async function usuariosActivosHandler() {
  let body;
  try {
    body = await conTimeout(fetchDatosReales(), BACKEND_TIMEOUT_MS);
  } catch (err) {
    console.warn(`usuarios-activos: se usan datos de ejemplo (${err.message})`);
    body = usuariosActivosMock();
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": getConfig("USUARIOS_ACTIVOS_CACHE_CONTROL", DEFAULT_CACHE_CONTROL),
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export { usuariosActivosHandler };
