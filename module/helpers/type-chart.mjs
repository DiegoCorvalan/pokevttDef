/**
 * Tabla de tipos (generación 6 en adelante, con Hada).
 * Solo se listan los enfrentamientos que no son x1.
 * La clave exterior es el tipo del movimiento; la interior, el tipo del defensor.
 */
const TYPE_CHART = {
  normal: { roca: 0.5, fantasma: 0, acero: 0.5 },
  fuego: { fuego: 0.5, agua: 0.5, planta: 2, hielo: 2, bicho: 2, roca: 0.5, dragon: 0.5, acero: 2 },
  agua: { fuego: 2, agua: 0.5, planta: 0.5, tierra: 2, roca: 2, dragon: 0.5 },
  electrico: { agua: 2, electrico: 0.5, planta: 0.5, tierra: 0, volador: 2, dragon: 0.5 },
  planta: { fuego: 0.5, agua: 2, planta: 0.5, hielo: 0.5, veneno: 0.5, tierra: 2, volador: 0.5, bicho: 0.5, roca: 2, dragon: 0.5, acero: 0.5 },
  hielo: { fuego: 0.5, agua: 0.5, planta: 2, hielo: 0.5, tierra: 2, volador: 2, dragon: 2, acero: 0.5 },
  lucha: { normal: 2, hielo: 2, veneno: 0.5, volador: 0.5, psiquico: 0.5, bicho: 0.5, roca: 2, fantasma: 0, siniestro: 2, acero: 2, hada: 0.5 },
  veneno: { planta: 2, veneno: 0.5, tierra: 0.5, roca: 0.5, fantasma: 0.5, acero: 0, hada: 2 },
  tierra: { fuego: 2, electrico: 2, planta: 0.5, veneno: 2, volador: 0, bicho: 0.5, roca: 2, acero: 2 },
  volador: { electrico: 0.5, planta: 2, hielo: 0.5, lucha: 2, bicho: 2, roca: 0.5, acero: 0.5 },
  psiquico: { lucha: 2, veneno: 2, psiquico: 0.5, siniestro: 0, acero: 0.5 },
  bicho: { fuego: 0.5, planta: 2, lucha: 0.5, veneno: 0.5, volador: 0.5, psiquico: 2, fantasma: 0.5, siniestro: 2, acero: 0.5, hada: 0.5 },
  roca: { fuego: 2, hielo: 2, lucha: 0.5, tierra: 0.5, volador: 2, bicho: 2, acero: 0.5 },
  fantasma: { normal: 0, psiquico: 2, fantasma: 2, siniestro: 0.5 },
  dragon: { dragon: 2, acero: 0.5, hada: 0 },
  siniestro: { lucha: 0.5, psiquico: 2, fantasma: 2, siniestro: 0.5, hada: 0.5 },
  acero: { fuego: 0.5, agua: 0.5, electrico: 0.5, hielo: 2, roca: 2, acero: 0.5, hada: 2 },
  hada: { fuego: 0.5, lucha: 2, veneno: 0.5, dragon: 2, siniestro: 2, acero: 0.5 },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function singleTypeMultiplier(attackType, defendType) {
  if (!attackType || !defendType) return 1;
  return TYPE_CHART[attackType]?.[defendType] ?? 1;
}

/**
 * Multiplicador combinado contra los tipos del defensor.
 * @param {string} attackType
 * @param {string} primary
 * @param {string} [secondary]
 * @returns {number}
 */
export function matchupMultiplier(attackType, primary, secondary) {
  let multiplier = singleTypeMultiplier(attackType, primary || "normal");
  if (secondary) multiplier *= singleTypeMultiplier(attackType, secondary);
  return multiplier;
}

function describeMultiplier(multiplier) {
  if (multiplier === 0) return { key: "immune", label: "Inmune", text: "x0" };
  if (multiplier <= 0.25) return { key: "resist-hard", label: "Resiste mucho", text: "x¼" };
  if (multiplier < 1) return { key: "resist", label: "Resiste", text: "x½" };
  if (multiplier === 1) return { key: "normal", label: "Efectividad normal", text: "x1" };
  if (multiplier < 4) return { key: "super", label: "Super efectivo", text: "x2" };
  return { key: "mega", label: "Mega efectivo", text: "x4" };
}

/**
 * Arma el bloque de chat y, si hay un solo Pokémon objetivo, los modificadores
 * de daño que corresponden.
 * @param {string} moveType
 * @returns {{ html: string, autoModifiers: string[] }}
 */
export function describeMoveEffectiveness(moveType) {
  const targets = Array.from(game.user?.targets ?? []);
  if (!targets.length || !moveType) return { html: "", autoModifiers: [] };

  const pokemonTargets = [];
  const rows = targets.map((token) => {
    const actor = token.actor;
    const name = escapeHtml(token.name || actor?.name || "Objetivo");

    if (!actor || actor.type !== "pokemon") {
      return `<div class="poke-eff poke-eff-unknown"><strong>${name}</strong> no es un Pokémon</div>`;
    }

    const primary = actor.system.types?.primary || "normal";
    const secondary = actor.system.types?.secondary || "";
    const multiplier = matchupMultiplier(moveType, primary, secondary);
    const info = describeMultiplier(multiplier);
    pokemonTargets.push(info.key);

    return `<div class="poke-eff poke-eff-${info.key}"><strong>${name}</strong> — ${info.label} <span class="poke-eff-mult">${info.text}</span></div>`;
  });

  let autoModifiers = [];
  if (pokemonTargets.length === 1) {
    if (pokemonTargets[0] === "super") autoModifiers = ["superefectivo"];
    else if (pokemonTargets[0] === "mega") autoModifiers = ["hiperefectivo"];
    else if (pokemonTargets[0] === "resist") autoModifiers = ["resiste"];
    else if (pokemonTargets[0] === "resist-hard") autoModifiers = ["resiste", "megaresiste"];
  }

  return {
    html: `<div class="poke-effectiveness">${rows.join("")}</div>`,
    autoModifiers,
  };
}
