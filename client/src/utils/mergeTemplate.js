// // utils/mergeTemplate.js
// export function mergeTemplate(template = { rows: [] }, dataRows = []) {
//   const tplRows = template && Array.isArray(template.rows) ? template.rows : [];
//   const dr = Array.isArray(dataRows) ? dataRows : [];

//   // Map template rows and overlay data values
//   const merged = tplRows.map((tplRow, idx) => {
//     const dataRow = dr[idx] || {};
//     return { ...tplRow, ...dataRow };
//   });

//   // Append any extra dataRows beyond template
//   if (dr.length > tplRows.length) {
//     for (let i = tplRows.length; i < dr.length; i++) merged.push(dr[i]);
//   }
//   return merged;
// }

// export function mergePreserveExisting(existingRows = [], templateRows = []) {
//   const ex = Array.isArray(existingRows) ? existingRows : [];
//   const tpl = Array.isArray(templateRows) ? templateRows : [];

//   const length = Math.max(ex.length, tpl.length);
//   const out = [];
//   for (let i = 0; i < length; i++) {
//     const existing = ex[i] || {};
//     const template = tpl[i] || {};
//     const keys = new Set([...Object.keys(template), ...Object.keys(existing)]);
//     const row = {};
//     keys.forEach((k) => {
//       const exVal = existing[k];
//       const tplVal = template[k];
//       if (exVal !== undefined && exVal !== null && String(exVal).trim() !== "") {
//         row[k] = exVal;
//       } else if (tplVal !== undefined) {
//         row[k] = tplVal;
//       } else {
//         row[k] = "";
//       }
//     });
//     out.push(row);
//   }
//   return out;
// }

// utils/mergeTemplate.js

// Merge for view: overlay employee data over template
export function mergeTemplate(template = { rows: [] }, dataRows = []) {
  const tplRows = template && Array.isArray(template.rows) ? template.rows : [];
  const dr = Array.isArray(dataRows) ? dataRows : [];

  const merged = tplRows.map((tplRow, idx) => {
    const dataRow = dr[idx] || {};
    return { ...tplRow, ...dataRow };
  });

  if (dr.length > tplRows.length) {
    for (let i = tplRows.length; i < dr.length; i++) merged.push(dr[i]);
  }
  return merged;
}

/**
 * Non-destructive merge when applying a new template:
 * - Keep only keys that are present in templateColumns (so deleted columns are removed).
 * - For each template cell, if existingRows has non-empty value -> keep it, else use template value.
 *
 * Params:
 *   existingRows: array (employee reports)
 *   templateRows: array (full template row objects)
 *   templateColumns: array of column keys (string list)
 */
// export function mergePreserveExisting(existingRows = [], templateRows = [], templateColumns = []) {
//   const ex = Array.isArray(existingRows) ? existingRows : [];
//   const tpl = Array.isArray(templateRows) ? templateRows : [];
//   const cols = Array.isArray(templateColumns) && templateColumns.length > 0 ? templateColumns : Object.keys(tpl[0] || {});

//   const length = Math.max(ex.length, tpl.length);
//   const out = [];
//   for (let i = 0; i < length; i++) {
//     const existing = ex[i] || {};
//     const template = tpl[i] || {};
//     const row = {};
//     // iterate only over allowed columns (templateColumns)
//     cols.forEach((k) => {
//       const exVal = existing[k];
//       const tplVal = template[k];
//       if (exVal !== undefined && exVal !== null && String(exVal).trim() !== "") {
//         row[k] = exVal;
//       } else if (tplVal !== undefined) {
//         row[k] = tplVal;
//       } else {
//         row[k] = "";
//       }
//     });
//     out.push(row);
//   }
//   return out;
// }
export function mergePreserveExisting(existingRows = [], templateRows = [], templateColumns = []) {
  const ex = Array.isArray(existingRows) ? existingRows : [];
  const tpl = Array.isArray(templateRows) ? templateRows : [];
  const cols = Array.isArray(templateColumns) && templateColumns.length > 0
    ? templateColumns
    : Object.keys(tpl[0] || {});

  // ❗ IMPORTANT: deletion fix — existing rows must shrink to template length
  const length = tpl.length;

  const out = [];
  for (let i = 0; i < length; i++) {
    const existing = ex[i] || {};
    const template = tpl[i] || {};
    const row = {};

    cols.forEach((k) => {
      const exVal = existing[k];
      const tplVal = template[k];

      if (exVal && exVal !== "") row[k] = exVal;
      else row[k] = tplVal ?? "";
    });

    out.push(row);
  }

  return out;
}

