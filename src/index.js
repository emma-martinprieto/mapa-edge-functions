/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/// <reference types="@fastly/js-compute" />

import * as response from './lib/response.js';
import { log } from './lib/log.js';
import { weatherHandler } from "./weather.js";

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

async function handleRequest(event) {
  const req = event.request;
  const url = new URL(req.url);

  let finalResponse;

  try {
    // Route matching
    if (url.pathname === "/" && req.method === "GET") {
      finalResponse = new Response("Hello World from the edge!", { status: 200 });
    } else if (url.pathname === "/hello-world" && req.method === "GET") {
      finalResponse = new Response("Hello World from the edge!", { status: 200 });
    } else if (url.pathname === "/weather" && req.method === "GET") {
      finalResponse = await weatherHandler(req, event.client);
    } else if (url.pathname === "/api/usuarios-activos" && req.method === "GET") {
      finalResponse = usuariosActivos();
    } else {
      finalResponse = response.notFound();
    }
  } catch (err) {
    console.log(err);
    finalResponse = response.error();
  }

  // Log the request and response
  log(req, finalResponse);

  return finalResponse;
}

// Datos reales generados por mapa-aep-test. Están fuera de git, así que pueden no existir:
// esbuild incluye el JSON en el build si está y, dentro de un try, no falla si falta.
// Un `import` estático rompería el build al clonar el proyecto.
function cargarDatosReales() {
  try {
    return require("./data/usuarios-activos.json");
  } catch {
    return null;
  }
}

const datosReales = cargarDatosReales();

// Datos de ejemplo para el mapa (si no hay datos reales de AEP)
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

function usuariosActivos() {
  const body = datosReales ?? usuariosActivosMock();

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "max-age=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}