/** Stable authored nodes. Never reassign an existing ID or infer ESCO equivalence. */
export interface SkillConcept {
  readonly id:string;readonly label:string;readonly aliases:readonly string[];
  readonly taxonomyVersion:string;readonly canonicalURI:string|null;readonly licenseRef:string;
  readonly kind:'SKILL'|'CREDENTIAL'|'TOOL'|'LANGUAGE'|'ACTIVITY';readonly family:string;
}
const seed:SkillConcept[]=[
  {"id":"faro:legacy:1","label":"Excel","aliases":["excel","microsoft excel","ms excel"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"TOOL","family":"accounting"},
  {"id":"faro:legacy:2","label":"SAP","aliases":["sap"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"TOOL","family":"accounting"},
  {"id":"faro:legacy:3","label":"Power BI","aliases":["power bi","powerbi"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"TOOL","family":"finance"},
  {"id":"faro:legacy:4","label":"SQL","aliases":["sql"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"SKILL","family":"IT"},
  {"id":"faro:legacy:5","label":"JavaScript","aliases":["javascript","js"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"SKILL","family":"IT"},
  {"id":"faro:legacy:6","label":"TypeScript","aliases":["typescript","ts"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"SKILL","family":"IT"},
  {"id":"faro:legacy:7","label":"UDT","aliases":["udt","uprawnienia udt"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"CREDENTIAL","family":"warehouse"},
  {"id":"faro:legacy:8","label":"Wózek widłowy","aliases":["wózek widłowy","wózki widłowe","forklift"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"SKILL","family":"warehouse"},
  {"id":"faro:legacy:9","label":"WMS","aliases":["wms"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"TOOL","family":"warehouse"},
  {"id":"faro:legacy:10","label":"CNC","aliases":["cnc"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"TOOL","family":"production"},
  {"id":"faro:legacy:11","label":"SEP","aliases":["sep","uprawnienia sep"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"CREDENTIAL","family":"engineering"},
  {"id":"faro:legacy:12","label":"Prawo jazdy B","aliases":["prawo jazdy kat. b","prawo jazdy kat b","kat. b"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"CREDENTIAL","family":"transport"},
  {"id":"faro:legacy:13","label":"Prawo jazdy C+E","aliases":["c+e","kat. c+e","prawo jazdy c+e"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"CREDENTIAL","family":"transport"},
  {"id":"faro:legacy:14","label":"ADR","aliases":["adr"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"CREDENTIAL","family":"transport"},
  {"id":"faro:legacy:15","label":"Język angielski","aliases":["angielski","english"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"LANGUAGE","family":"customer_service"},
  {"id":"faro:legacy:16","label":"Język niemiecki","aliases":["niemiecki","german","deutsch"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"LANGUAGE","family":"customer_service"},
  {"id":"faro:legacy:17","label":"CRM","aliases":["crm"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"TOOL","family":"sales"},
  {"id":"faro:legacy:18","label":"MS Office","aliases":["ms office","microsoft office","pakiet office"],"taxonomyVersion":"legacy-curated-v1","canonicalURI":null,"licenseRef":"repository-authored; ESCO mapping pending review","kind":"TOOL","family":"administration"},
  {"id":"faro:activity:customer-service","label":"Obsługa klienta","aliases":["obsługa klienta","klient","stacji"],"taxonomyVersion":"faro-activities-v1","canonicalURI":null,"licenseRef":"Faro authored task labels; not ESCO certification","kind":"ACTIVITY","family":"cross-occupation"},
  {"id":"faro:activity:cash-register","label":"Obsługa kasy","aliases":["kasa","kasę","stacji"],"taxonomyVersion":"faro-activities-v1","canonicalURI":null,"licenseRef":"Faro authored task labels; not ESCO certification","kind":"ACTIVITY","family":"cross-occupation"},
  {"id":"faro:activity:sales","label":"Sprzedaż","aliases":["sprzedaż","stacji"],"taxonomyVersion":"faro-activities-v1","canonicalURI":null,"licenseRef":"Faro authored task labels; not ESCO certification","kind":"ACTIVITY","family":"cross-occupation"},
  {"id":"faro:activity:shift-work","label":"Praca zmianowa","aliases":["zmianowa","zmiany","stacji"],"taxonomyVersion":"faro-activities-v1","canonicalURI":null,"licenseRef":"Faro authored task labels; not ESCO certification","kind":"ACTIVITY","family":"cross-occupation"},
  {"id":"faro:activity:conflict-resolution","label":"Rozwiązywanie sytuacji konfliktowych","aliases":["reklamacje","konflikt","stacji"],"taxonomyVersion":"faro-activities-v1","canonicalURI":null,"licenseRef":"Faro authored task labels; not ESCO certification","kind":"ACTIVITY","family":"cross-occupation"}
];
export const SKILL_CATALOG:readonly SkillConcept[]=Object.freeze(seed.map(c=>Object.freeze({...c,aliases:Object.freeze([...c.aliases])})));
