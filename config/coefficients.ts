/**
 * Default score coefficients — ported from initial_parameters.json.
 * VPN and Autodesk are removed for this version.
 *
 * Original sums exceeded 1.0 but scores are capped at 1.0 in the calculator,
 * so the raw coefficients are preserved to maintain identical business logic.
 */

export const COEFFICIENT_SETS = {
  management: {
    name: 'management',
    emailWeight: 0.25,
    emailLastUse: 0.01,
    filesEdited: 0.25,
    filesViewed: 0.05,
    driveLastUse: 0.01,
    filesCreated: 0.05,
    chatWeight: 0.03,
    meetingsWeight: 0.25,
    geminiWeight: 0.1,
  },
  others: {
    name: 'others',
    emailWeight: 0.20,
    emailLastUse: 0.01,
    filesEdited: 0.25,
    filesViewed: 0.05,
    driveLastUse: 0.01,
    filesCreated: 0.10,
    chatWeight: 0.10,
    meetingsWeight: 0.28,
    geminiWeight: 0.1,
  },
} as const;

/** Service / functional emails that should be excluded from scoring. */
export const EXCLUDED_EMAILS = [
  '03563cliente@ingetec.com.co',
  '02759-29-cerrejon@ingetec.com.co',
  '06434-project-l4@ingetec.com.co',
  '10052201@ingetec.com.co',
  '13052020@ingetec.com.co',
  'admin@ingetec.com.co',
  'adminxertica@ingetec.com.co',
  'arqueologia@ingetec.com.co',
  'bckcorreo@ingetec.com.co',
  'bckpclocaluser@ingetec.com.co',
  'bckpinactivos@ingetec.com.co',
  'comunicaciones@ingetec.com.co',
  'conta-ing@ingetec.com.co',
  'copey@ingetec.com.co',
  'datascience@ingetec.com.co',
  'formatogonogo@ingetec.com.co',
  'gestiona@ingetec.com.co',
  'gestionentregables@ingetec.com.co',
  'gestionhumana@ingetec.com.co',
  'hazpartedenosotros@ingetec.com.co',
  'hdd-bckuser@ingetec.com.co',
  'info_retirados@ingetec.com.co',
  'info_retirados_2023@ingetec.com.co',
  'ingetec@ingetec.com.co',
  'ingetec_ica@ingetec.com.co',
  'interventoriacordoba@ingetec.com.co',
  'interventoriainforme@ingetec.com.co',
  'intranet@ingetec.com.co',
  'investigacionesgeotecnicas@ingetec.com.co',
  'linea2metrobogota@ingetec.com.co',
  'noconformidades@ingetec.com.co',
  'protecciondedatos@ingetec.com.co',
  'plmbmetro@ingetec.com.co',
  'proyactivos@ingetec.com.co',
  'proycadbim@ingetec.com.co',
  'qhse@ingetec.com.co',
  'satisfacciondelcliente@ingetec.com.co',
  'serviciosti@ingetec.com.co',
  'sociedades@ingetec.com.co',
  'softwareingetec@ingetec.com.co',
  'srvbk@ingetec.com.co',
  'srvftp@ingetec.com.co',
  'talentohumano@ingetec.com.co',
  'transacciones@ingetec.com.co',
];

/**
 * HR API category substrings that map to the "management" coefficient set.
 * Employees whose `category` field contains any of these are treated as management.
 * Everyone else uses the "others" coefficient set.
 */
export const MANAGEMENT_CATEGORIES = [
  'DIRECCION',
  'GERENCIA',
  'VICEPRESIDENCIA',
  'PRESIDENCIA',
];
