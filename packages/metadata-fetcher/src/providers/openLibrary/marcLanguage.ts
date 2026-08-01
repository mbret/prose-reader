/**
 * MARC 21 language codes → BCP 47 primary subtags, for the codes a general
 * book catalog actually returns. Open Library reports `language` as MARC
 * (`eng`, `fre`), while {@link ResolvedMetadata.languages} is BCP 47 by
 * contract, so the mapping is part of normalizing — not a nicety.
 *
 * Both MARC variants are listed where they differ (bibliographic `fre` and
 * terminology `fra`), since records in the wild carry either.
 */
const MARC_TO_BCP47: Readonly<Record<string, string>> = {
  afr: "af",
  alb: "sq",
  amh: "am",
  ara: "ar",
  arm: "hy",
  asm: "as",
  aze: "az",
  baq: "eu",
  bel: "be",
  ben: "bn",
  bos: "bs",
  bul: "bg",
  bur: "my",
  cat: "ca",
  ces: "cs",
  chi: "zh",
  cym: "cy",
  cze: "cs",
  dan: "da",
  deu: "de",
  dut: "nl",
  ell: "el",
  eng: "en",
  epo: "eo",
  est: "et",
  eus: "eu",
  fao: "fo",
  fas: "fa",
  fin: "fi",
  fra: "fr",
  fre: "fr",
  geo: "ka",
  ger: "de",
  gle: "ga",
  glg: "gl",
  gre: "el",
  guj: "gu",
  heb: "he",
  hin: "hi",
  hrv: "hr",
  hun: "hu",
  hye: "hy",
  ice: "is",
  ind: "id",
  isl: "is",
  ita: "it",
  jpn: "ja",
  kan: "kn",
  kat: "ka",
  kaz: "kk",
  khm: "km",
  kor: "ko",
  lao: "lo",
  lat: "la",
  lav: "lv",
  lit: "lt",
  ltz: "lb",
  mac: "mk",
  mal: "ml",
  mar: "mr",
  may: "ms",
  mkd: "mk",
  mlt: "mt",
  mon: "mn",
  msa: "ms",
  mya: "my",
  nep: "ne",
  nld: "nl",
  nno: "nn",
  nob: "nb",
  nor: "no",
  ori: "or",
  pan: "pa",
  per: "fa",
  pol: "pl",
  por: "pt",
  rom: "ro",
  ron: "ro",
  rum: "ro",
  rus: "ru",
  scc: "sr",
  scr: "hr",
  sin: "si",
  slk: "sk",
  slo: "sk",
  slv: "sl",
  snd: "sd",
  spa: "es",
  sqi: "sq",
  srp: "sr",
  swa: "sw",
  swe: "sv",
  tam: "ta",
  tel: "te",
  tgl: "tl",
  tha: "th",
  tur: "tr",
  ukr: "uk",
  urd: "ur",
  uzb: "uz",
  vie: "vi",
  wel: "cy",
  yid: "yi",
  zho: "zh",
}

/**
 * MARC placeholders that say "no single language": keeping them would put a
 * non-language in a BCP 47 field, so they resolve to nothing.
 */
const NON_LANGUAGE_CODES = new Set(["mul", "und", "zxx", "sgn"])

/**
 * Normalizes one MARC language code to its BCP 47 primary subtag. Unknown
 * codes (the long tail of MARC) pass through lowercased rather than being
 * dropped — a language we can't name is still a language the record stated.
 */
export const marcLanguageToBcp47 = (code: string): string | undefined => {
  const normalized = code.trim().toLowerCase()

  if (normalized.length === 0) return undefined
  if (NON_LANGUAGE_CODES.has(normalized)) return undefined

  return MARC_TO_BCP47[normalized] ?? normalized
}
