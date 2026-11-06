import {asset, byId, number, percent, openResults, selectOptions, stats, table} from '../common.mjs';

openResults('defectlens', data => {
  const picker = byId('sample');
  const preferred = data.methods[1];
  selectOptions('sample', data.examples.map(row => [String(row.id), `${row.defect ? 'Defect' : 'Normal'} · ${row.sample}`]));
  picker.value = String(data.examples.find(row=>row.defect).id);
  picker.disabled = false;
  byId('status').textContent = `VisA ${data.category} · ${data.training} reference images · ${data.calibration} normal calibration images · ${data.test} test images (${data.testDefects} defects)`;
  stats([['Test images', number(data.test)], ['ResNet image AUROC', number(preferred.imageAuroc, 3)],
         ['ResNet patch AP', number(preferred.patchAp, 3)], ['ResNet defect recall at cutoff', percent(preferred.recall)]]);
  table('benchmark', ['Method','Image AUROC','Image AP','Patch AP','Recall','False-alarm rate','Cutoff'], data.methods.map(row=>[
    row.name,number(row.imageAuroc,3),number(row.imageAp,3),number(row.patchAp,3),percent(row.recall),percent(row.falseAlarmRate),number(row.threshold,3),
  ]));
  function draw() {
    const row = data.examples.find(item => String(item.id) === picker.value);
    byId('sample-title').textContent = `${row.sample} · ${row.defect ? 'Defect annotated' : 'Normal board'}`;
    byId('sample-result').textContent = `${row.flagged ? 'Flagged for review' : 'Passed at the calibrated cutoff'} · Score ${number(row.score, 3)} · Cutoff ${number(preferred.threshold, 3)}`;
    byId('original').src = asset('defectlens', `example-${row.id}.jpg`);
    byId('heatmap').src = asset('defectlens', `heat-${row.id}.jpg`);
    const mask = byId('mask');
    mask.hidden = !row.defect;
    byId('no-mask').hidden = row.defect;
    if (row.defect) mask.src = asset('defectlens', `mask-${row.id}.jpg`);
    else mask.removeAttribute('src');
  }
  picker.addEventListener('change', draw);
  draw();
});
