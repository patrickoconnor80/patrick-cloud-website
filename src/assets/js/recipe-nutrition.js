// Shared by the recipe pages (recipe-*.html). Load after foods-data.js and nutrient-targets.js.
// A page describes a serving as [[fdc_id, grams], ...]; RN.totals sums it and RN.table renders
// the nutrient table (macros, then every NUTRIENTS row with % of the men's target).
window.RN = (function () {
  const byId = Object.fromEntries([...window.FOODS, ...(window.INGREDIENTS || [])].map(f => [f.id, f]));

  // est = keys where estimated USDA values make up over 25% of the total. Carbohydrate is
  // derived (calories left after protein and fat), so it is always marked.
  function totals(items) {
    const t = {}, estPart = {};
    for (const [id, g] of items) {
      const f = byId[id];
      if (!f) throw new Error('recipe-nutrition: unknown food id ' + id);
      for (const [k, x] of Object.entries(f.v)) {
        const amt = x * g / 100;
        t[k] = (t[k] || 0) + amt;
        if ((f.est || []).includes(k)) estPart[k] = (estPart[k] || 0) + amt;
      }
    }
    // alcohol supplies 7 kcal/g; leave it out so it doesn't show up as carbohydrate
    t.carb = Math.max(0, (t.kcal - 4 * t.prot - 9 * t.fat - 7 * (t.alc || 0)) / 4);
    const est = new Set(Object.keys(estPart).filter(k => t[k] > 0 && estPart[k] / t[k] > 0.25));
    est.add('carb');
    return { t, est };
  }

  const fmt = x => x >= 100 ? Math.round(x).toLocaleString() : x >= 10 ? x.toFixed(0) : x >= 1 ? x.toFixed(1) : x >= 0.005 ? x.toFixed(2) : '0';
  const tilde = (k, est) => est.has(k) ? '<span class="est" title="Mostly estimated">~</span>' : '';
  const val = (t, est, k, unit) => `${tilde(k, est)}${fmt(t[k] || 0)}${unit}`;

  function table(t, est, carbLabel = 'Carbohydrate') {
    let rows = '<tr><th>Nutrient</th><th class="num">Amount</th><th class="num">% target</th><th style="width:30%"></th></tr>';
    rows += '<tr class="grp"><td colspan="4">Macros</td></tr>';
    for (const [k, label, u] of [['kcal', 'Calories', ''], ['prot', 'Protein', ' g'], ['fat', 'Fat', ' g'], ['carb', carbLabel, ' g']])
      rows += `<tr><td>${label}</td><td class="num">${val(t, est, k, u)}</td><td></td><td></td></tr>`;
    let grp = '';
    for (const [k, label, unit, target, page, group, , , kind] of window.NUTRIENTS) {
      if (group !== grp) { grp = group; rows += `<tr class="grp"><td colspan="4">${group}</td></tr>`; }
      const amt = t[k] || 0, name = `<a href="${page}">${label}</a>`;
      if (kind === 'limit') {
        const pctCal = t.kcal > 0 ? (amt * 9 / t.kcal * 100).toFixed(1) + '% of kcal' : '–';
        rows += `<tr><td>${name}</td><td class="num">${val(t, est, k, ' ' + unit)}</td><td class="num">${pctCal}</td><td></td></tr>`;
        continue;
      }
      const pct = amt / target[0] * 100, cls = pct >= 25 ? '' : pct >= 10 ? 'mid' : 'low';
      const bar = kind === 'info' ? '' : `<div class="bar"><i class="${cls}" style="width:${Math.min(pct, 100)}%"></i></div>`;
      rows += `<tr><td>${name}</td><td class="num">${val(t, est, k, ' ' + unit)}</td><td class="num">${kind === 'info' ? '' : Math.round(pct) + '%'}</td><td>${bar}</td></tr>`;
    }
    return rows;
  }

  // Segmented buttons: <span class="seg" data-ctl="name"><button data-v="...">. Numeric values
  // are stored as numbers. onChange runs after state[name] is set.
  function wireSegs(root, state, onChange) {
    root.querySelectorAll('.seg').forEach(seg => seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      const v = b.dataset.v;
      state[seg.dataset.ctl] = v !== '' && !isNaN(v) && !/^\d{5,}$/.test(v) ? Number(v) : v;
      onChange();
    }));
  }

  return { byId, totals, fmt, tilde, val, table, wireSegs };
})();
