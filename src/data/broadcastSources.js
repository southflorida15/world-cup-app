// src/data/broadcastSources.js
// Adapter registry for the future automated updater. This is deliberately data-only.
// Each country can use multiple source patterns; the script stores results in broadcasting.js.

export const BROADCAST_SOURCE_REGISTRY = {
  BR: [
    { provider:"UOL Esporte", priority:1, query:'site:uol.com.br/esporte "{home} x {away}" "onde assistir" "Copa do Mundo"' },
    { provider:"ESPN Brasil", priority:2, query:'site:espn.com.br "{home} x {away}" "onde assistir" "Copa do Mundo"' },
    { provider:"CNN Brasil", priority:3, query:'site:cnnbrasil.com.br/esportes "{home} x {away}" "onde assistir"' },
  ],
  CO: [
    { provider:"El País Colombia", priority:1, query:'site:elpais.com/america-colombia "{home}" "{away}" "dónde ver"' },
    { provider:"Caracol", priority:2, query:'site:caracoltv.com "{home}" "{away}" Mundial' },
    { provider:"RCN", priority:3, query:'site:canalrcn.com "{home}" "{away}" Mundial' },
  ],
  MX: [
    { provider:"TUDN", priority:1, query:'site:tudn.com "{home}" "{away}" "dónde ver" Mundial' },
    { provider:"TV Azteca", priority:2, query:'site:tvazteca.com "{home}" "{away}" Mundial' },
  ],
  US: [
    { provider:"FOX / Telemundo listings", priority:1, query:'"{home}" "{away}" "World Cup" "FOX" "Telemundo"' },
  ],
};
