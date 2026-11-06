# DefectLens

Run `python build.py output` in an environment with `numpy`, `pillow`, `requests`, `scikit-learn`, `torch`, and `torchvision`. The script streams the official VisA archive and retains only the PCB1 images and masks it needs. The reference bank uses 180 normal training images. Another 40 normal images calibrate the threshold. All 200 official PCB1 test images, including 100 defective boards, contribute to evaluation.

The baseline represents each patch by RGB mean and standard deviation. The second method uses frozen ImageNet ResNet-18 features. Each method scores patches by nearest-reference distance and aggregates the top 5% for the image score. Image AUROC and average precision measure ranking. Patch average precision compares the score map against masks reduced to 14 × 14 by max pooling. Recall and false-alarm rate use the normal-calibration 95th percentile cutoff. The gallery includes examples of correct calls, misses, and false alarms.

Data: [VisA, Zou et al.](https://github.com/amazon-science/spot-diff), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Gallery images are resized, and overlays are added to show scores and original annotation regions. The benchmark evaluates PCB1 only.
