"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/links.ts
var links_exports = {};
__export(links_exports, {
  formatActionUrl: () => formatActionUrl,
  getEmailActionUrl: () => getEmailActionUrl,
  getEmailActionUrls: () => getEmailActionUrls
});
module.exports = __toCommonJS(links_exports);
function decodeHtmlEntities(value) {
  return value.replace(/&(#(?:x[\da-f]+|\d+)|amp|apos|gt|lt|quot);/gi, (match, entity) => {
    const named = {
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      quot: '"'
    };
    const normalized = entity.toLowerCase();
    if (named[normalized]) return named[normalized];
    const hexadecimal = normalized.startsWith("#x");
    const point = Number.parseInt(normalized.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    if (!Number.isInteger(point) || point < 0 || point > 1114111) return match;
    try {
      return String.fromCodePoint(point);
    } catch {
      return match;
    }
  });
}
function normalizeUrl(candidate) {
  const decoded = decodeHtmlEntities(candidate).replace(/[),.;!?'"]+$/, "");
  try {
    const url = new URL(decoded);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : void 0;
  } catch {
    return void 0;
  }
}
function getEmailActionUrls(email) {
  const candidates = [
    ...email.text?.match(/https?:\/\/[^\s<>"']+/g) ?? [],
    ...email.html?.match(/https?:\/\/[^\s<>"']+/g) ?? []
  ];
  const urls = /* @__PURE__ */ new Set();
  for (const candidate of candidates) {
    const url = normalizeUrl(candidate);
    if (url) urls.add(url);
  }
  return [...urls];
}
function getEmailActionUrl(email, expectedPath) {
  const url = getEmailActionUrls(email).find(
    (candidate) => !expectedPath || new URL(candidate).pathname === expectedPath
  );
  if (!url) {
    const expectation = expectedPath ? ` matching ${expectedPath}` : "";
    throw new Error(`No action URL${expectation} found in \u201C${email.subject ?? "email"}\u201D.`);
  }
  return url;
}
function formatActionUrl(value) {
  const url = new URL(value);
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${url.host}${path}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formatActionUrl,
  getEmailActionUrl,
  getEmailActionUrls
});
//# sourceMappingURL=links.cjs.map
