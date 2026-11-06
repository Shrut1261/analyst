const ROOT = 'https://raw.githubusercontent.com/Shrut1261/analyst/industry-project-data';
export const asset = (project, file) => `${ROOT}/${project}/${file}`;
export const byId = id => document.getElementById(id);
export const number = (value, digits = 0) => new Intl.NumberFormat('en-US', {maximumFractionDigits: digits, minimumFractionDigits: digits}).format(value);
export const percent = value => `${number(value * 100, 1)}%`;
export const money = value => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(value);

function element(tag, content) {
  const node = document.createElement(tag);
  node.textContent = content;
  return node;
}

export async function openResults(project, render) {
  try {
    const response = await fetch(asset(project, 'results.json'), {signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    render(await response.json());
    byId('dashboard').hidden = false;
  } catch (error) {
    byId('status').textContent = `Results could not load (${error.message}). Reload the page or use the source links below.`;
  }
}

export function stats(items) {
  byId('metrics').replaceChildren(...items.map(([label, value]) => {
    const box = document.createElement('div');
    box.append(element('dt', label), element('dd', value));
    return box;
  }));
}

export function table(id, headers, values) {
  const head = document.createElement('thead');
  const row = document.createElement('tr');
  for (const label of headers) {
    const cell = element('th', label);
    cell.scope = 'col';
    row.append(cell);
  }
  head.append(row);
  const body = document.createElement('tbody');
  for (const valuesRow of values) {
    const dataRow = document.createElement('tr');
    dataRow.append(...valuesRow.map(value => element('td', value)));
    body.append(dataRow);
  }
  byId(id).replaceChildren(head, body);
}

export function selectOptions(id, choices) {
  byId(id).replaceChildren(...choices.map(([value, label]) => new Option(label, value)));
}

export function lineChart(id, labels, series, describe, format) {
  const left = 75, right = 750, top = 22, bottom = 220;
  const values = series.flatMap(item => item.values.filter(Number.isFinite));
  const min = Math.min(0, ...values), max = Math.max(...values, .01);
  const x = i => left + (right - left) * i / Math.max(1, labels.length - 1);
  const y = v => bottom - (bottom - top) * (v - min) / (max - min);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 780 258');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', describe);
  const draw = (name, attrs, label) => {
    const node = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (label !== undefined) node.textContent = label;
    svg.append(node);
  };
  for (let i = 0; i <= 4; i++) {
    const value = min + (max - min) * i / 4;
    const at = y(value);
    draw('line', {x1:left, x2:right, y1:at, y2:at, stroke:'var(--line)'});
    draw('text', {x:left - 9, y:at + 4, 'text-anchor':'end'}, format(value));
  }
  labels.forEach((label, i) => {
    if (labels.length <= 12 || i % 3 === 0) draw('text', {x:x(i), y:247, 'text-anchor':'middle'}, label);
  });
  const legend = document.createElement('div');
  legend.className = 'legend';
  for (const item of series) {
    const points = item.values.map((value, i) => Number.isFinite(value) ? `${x(i)} ${y(value)}` : null);
    const path = points.map((point, i) => point ? `${i === 0 || !points[i - 1] ? 'M' : 'L'}${point}` : '').join(' ');
    draw('path', {d:path, fill:'none', stroke:item.color, 'stroke-width':3, 'stroke-linejoin':'round', 'stroke-dasharray':item.dash ?? ''});
    const key = element('span', item.name);
    key.style.setProperty('--series-color', item.color);
    legend.append(key);
  }
  byId(id).replaceChildren(svg, legend);
}
