
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

export function mergePreserveExisting(existingRows = [], templateRows = [], templateColumns = []) {
  const ex = Array.isArray(existingRows) ? existingRows : [];
  const tpl = Array.isArray(templateRows) ? templateRows : [];
  const cols =
    Array.isArray(templateColumns) && templateColumns.length > 0
      ? templateColumns
      : Object.keys(tpl[0] || {});

  const length = Math.max(ex.length, tpl.length);
  const out = [];

  for (let i = 0; i < length; i++) {
    const existing = ex[i] || {};
    const template = tpl[i] || {};
    const row = {};

    cols.forEach((k) => {
      const exVal = existing[k];
      const tplVal = template[k];

      if (exVal !== undefined && exVal !== null && String(exVal).trim() !== "") {
        row[k] = exVal;
      } else if (tplVal !== undefined) {
        row[k] = tplVal;
      } else {
        row[k] = "";
      }
    });

    out.push(row);
  }

  return out;
}
