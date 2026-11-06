"""Evaluate PCB1 anomaly detection using the official VisA one-class split."""
from pathlib import Path
from io import BytesIO
import csv
import json
import sys
import tarfile

import numpy as np
from PIL import Image
import requests
from sklearn.metrics import average_precision_score, roc_auc_score
import torch
import torch.nn.functional as F
from torchvision.models import ResNet18_Weights, resnet18

ARCHIVE = 'https://amazon-visual-anomaly.s3.us-west-2.amazonaws.com/VisA_20220922.tar'
SPLIT = 'https://raw.githubusercontent.com/amazon-science/spot-diff/main/split_csv/1cls.csv'
SIZE = 224
GRID = 14


def retrieve(wanted):
    result = {}
    with requests.get(ARCHIVE, stream=True, timeout=(20, 90)) as response:
        response.raise_for_status()
        with tarfile.open(fileobj=response.raw, mode='r|*', bufsize=1024 * 1024) as archive:
            for entry in archive:
                parts = Path(entry.name).parts
                if 'pcb1' not in parts:
                    continue
                name = '/'.join(parts[parts.index('pcb1'):])
                if entry.isfile() and name in wanted:
                    result[name] = archive.extractfile(entry).read()
                    if len(result) == len(wanted):
                        break
    assert set(result) == wanted, (len(result), len(wanted), sorted(wanted - result.keys())[:4])
    return result


def image_from(blob, mode='RGB'):
    with Image.open(BytesIO(blob)) as original:
        return original.convert(mode)


def batch_images(blobs, rows):
    arrays = [np.asarray(image_from(blobs[row['image']]).resize((SIZE, SIZE), Image.Resampling.BILINEAR)) for row in rows]
    return torch.from_numpy(np.stack(arrays)).permute(0, 3, 1, 2).float() / 255


def feature_maps(images, encoder):
    means = F.adaptive_avg_pool2d(images, (GRID, GRID))
    squares = F.adaptive_avg_pool2d(images.square(), (GRID, GRID))
    texture = (squares - means.square()).clamp_min(0).sqrt()
    rgb = torch.cat([means, texture], dim=1).permute(0, 2, 3, 1)
    mean = torch.tensor([.485, .456, .406])[None, :, None, None]
    std = torch.tensor([.229, .224, .225])[None, :, None, None]
    with torch.inference_mode():
        embeddings = [F.adaptive_avg_pool2d(encoder((part - mean) / std), (GRID, GRID)).permute(0, 2, 3, 1)
                      for part in images.split(24)]
    return rgb, F.normalize(torch.cat(embeddings), dim=-1)


def score(train, other, generator, standardize):
    flat = train.reshape(-1, train.shape[-1])
    center = flat.mean(0) if standardize else torch.zeros(flat.shape[1])
    spread = flat.std(0).clamp_min(1e-4) if standardize else torch.ones(flat.shape[1])
    ids = torch.randperm(len(flat), generator=generator)[:4096]
    bank = (flat[ids] - center) / spread
    maps = []
    for batch in other.split(16):
        queries = (batch.reshape(-1, flat.shape[1]) - center) / spread
        distances = torch.cdist(queries, bank).amin(1)
        maps.append(distances.reshape(-1, GRID, GRID))
    return torch.cat(maps).numpy()


def image_scores(maps):
    flattened = maps.reshape(len(maps), -1)
    # Average the strongest 5% of patches so a single noisy cell cannot dominate.
    count = max(1, int(flattened.shape[1] * .05))
    return np.sort(flattened, axis=1)[:, -count:].mean(1)


def resized_mask(blobs, row):
    if not row['mask']:
        return np.zeros((GRID, GRID), dtype=bool)
    mask = image_from(blobs[row['mask']], 'L').resize((SIZE, SIZE), Image.Resampling.NEAREST)
    values = torch.from_numpy((np.asarray(mask) > 0).astype(np.float32))[None, None]
    return F.adaptive_max_pool2d(values, (GRID, GRID))[0, 0].numpy().astype(bool)


def save_example(output, blobs, row, heatmap, mask, ceiling, index):
    image = image_from(blobs[row['image']]).resize((448, 448), Image.Resampling.BILINEAR)
    image.save(output / f'example-{index}.jpg', quality=86)
    normalized = np.clip(heatmap / ceiling, 0, 1)
    heat = Image.fromarray((normalized * 255).astype(np.uint8)).resize(image.size, Image.Resampling.BILINEAR)
    heat = np.asarray(heat).astype(float) / 255
    original = np.asarray(image).astype(float)
    color = np.stack([255 * np.ones_like(heat), 175 * (1 - heat), 30 * np.ones_like(heat)], axis=-1)
    opacity = (heat ** 1.5 * .8)[..., None]
    Image.fromarray((original * (1-opacity) + color * opacity).astype(np.uint8)).save(output / f'heat-{index}.jpg', quality=86)
    if row['mask']:
        truth = image_from(blobs[row['mask']], 'L').resize(image.size, Image.Resampling.NEAREST)
        binary = (np.asarray(truth) > 0).astype(np.uint8) * 175
        overlay = Image.new('RGB', image.size, (83, 255, 199))
        Image.composite(overlay, image, Image.fromarray(binary)).save(output / f'mask-{index}.jpg', quality=86)


def build(output):
    output.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(2)
    split = requests.get(SPLIT, timeout=40)
    split.raise_for_status()
    rows = [dict(zip(('category', 'split', 'label', 'image', 'mask'), row))
            for row in list(csv.reader(split.text.splitlines()))[1:] if row[0] == 'pcb1']
    normal_train = [row for row in rows if row['split'] == 'train' and row['label'] == 'normal']
    official_test = [row for row in rows if row['split'] == 'test']
    rng = np.random.default_rng(311)
    sample = rng.permutation(len(normal_train))[:220]
    training = [normal_train[i] for i in sample[:180]]
    validation = [normal_train[i] for i in sample[180:]]
    ordered = training + validation + official_test
    assert len(training) == 180 and len(validation) == 40 and len(official_test) > 80
    assert len({row['image'] for row in ordered}) == len(ordered)
    assert all(row['mask'] for row in official_test if row['label'] != 'normal')
    blobs = retrieve({name for row in ordered for name in (row['image'], row['mask']) if name})
    print(f'Loaded {len(ordered)} images and their available masks', flush=True)
    model = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1).eval()
    encoder = torch.nn.Sequential(model.conv1, model.bn1, model.relu, model.maxpool, model.layer1, model.layer2).eval()
    features = feature_maps(batch_images(blobs, ordered), encoder)
    labels = np.array([row['label'] != 'normal' for row in official_test])
    masks = np.stack([resized_mask(blobs, row) for row in official_test])
    assert labels.any() and (~labels).any() and masks.any()
    methods = []
    for name, feature, standardize in zip(['Color and texture baseline', 'ResNet-18 patch features'], features, [True, False]):
        maps = score(feature[:180], feature[180:], torch.Generator().manual_seed(311), standardize)
        scores = image_scores(maps)
        threshold = float(np.quantile(scores[:40], .95))
        decisions = scores[40:] > threshold
        methods.append({'name': name, 'imageAuroc': float(roc_auc_score(labels, scores[40:])),
                        'imageAp': float(average_precision_score(labels, scores[40:])),
                        'patchAp': float(average_precision_score(masks.ravel(), maps[40:].ravel())),
                        'threshold': threshold, 'recall': float(decisions[labels].mean()),
                        'falseAlarmRate': float(decisions[~labels].mean())})
    ceiling = float(np.quantile(maps[:40], .995))
    assert ceiling > 0 and np.isfinite(maps).all()
    # Sample examples by index within each class, independent of predictions.
    choices = np.r_[np.flatnonzero(~labels)[:3], np.flatnonzero(labels)[:5]]
    examples = []
    for index, test_index in enumerate(choices):
        row = official_test[test_index]
        save_example(output, blobs, row, maps[40 + test_index], masks[test_index], ceiling, index)
        examples.append({'id': index, 'sample': Path(row['image']).name, 'defect': bool(labels[test_index]),
                         'score': float(scores[40 + test_index]), 'flagged': bool(decisions[test_index])})
    result = {'training': len(training), 'calibration': len(validation), 'test': len(official_test),
              'testDefects': int(labels.sum()), 'methods': methods, 'examples': examples, 'category': 'PCB1'}
    (output / 'results.json').write_text(json.dumps(result, allow_nan=False), encoding='utf-8')
    print(json.dumps({key: value for key, value in result.items() if key != 'examples'}), flush=True)


if __name__ == '__main__':
    build(Path(sys.argv[1]))
