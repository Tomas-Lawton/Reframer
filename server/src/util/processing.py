from torchvision import transforms


def get_augment_trans(canvas_width, normalize_clip=False):

    if normalize_clip:
        augment_trans = transforms.Compose(
            [
                transforms.RandomPerspective(fill=1, p=1, distortion_scale=0.5),
                transforms.RandomResizedCrop(canvas_width, scale=(0.7, 0.9)),
                transforms.Normalize(
                    (0.48145466, 0.4578275, 0.40821073),
                    (0.26862954, 0.26130258, 0.27577711),
                ),
            ]
        )
    else:
        augment_trans = transforms.Compose(
            [
                transforms.RandomPerspective(fill=1, p=1, distortion_scale=0.5),
                transforms.RandomResizedCrop(canvas_width, scale=(0.7, 0.9)),
            ]
        )

    return augment_trans
