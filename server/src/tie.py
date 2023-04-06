import torch
import os
import pathlib
import random
import numpy as np
import torchvision.transforms as TF
import warnings
from tqdm import tqdm
from PIL import Image
from inception import InceptionV3
from torch.nn.functional import adaptive_avg_pool2d


class ImagePathDataset(torch.utils.data.Dataset):
    def __init__(self, files, transforms=None):
        self.files = files
        self.transforms = transforms

    def __len__(self):
        return len(self.files)

    def __getitem__(self, i):
        path = self.files[i]
        img = Image.open(path).convert('RGB')
        if self.transforms is not None:
            img = self.transforms(img)
        return img


class TIE:
    def __init__(self, dims=2048):
        self.device = torch.device('cuda' if (torch.cuda.is_available()) else 'cpu')
        num_avail_cpus = len(os.sched_getaffinity(0))
        self.num_workers = min(num_avail_cpus, 8)
        block_idx = InceptionV3.BLOCK_INDEX_BY_DIM[dims]
        self.dims = dims
        self.model = InceptionV3([block_idx]).to(self.device)
        self.image_extensions = {
            'bmp',
            'jpg',
            'jpeg',
            'pgm',
            'png',
            'ppm',
            'tif',
            'tiff',
            'webp',
        }

    def calculate(self, path, rand_sampled_set_dim=None, batch_size=5, truncate=None):
        path = pathlib.Path(path)
        files = sorted(
            [
                file
                for ext in self.image_extensions
                for file in path.glob('*.{}'.format(ext))
            ]
        )
        if rand_sampled_set_dim:
            random.shuffle(files)
            files = files[:rand_sampled_set_dim]

        self.model.eval()

        if batch_size > len(files):
            print(
                (
                    'Warning: batch size is bigger than the data size. '
                    'Setting batch size to data size'
                )
            )
            batch_size = len(files)

        dataset = ImagePathDataset(files, transforms=TF.ToTensor())
        dataloader = torch.utils.data.DataLoader(
            dataset,
            batch_size=batch_size,
            shuffle=False,
            drop_last=False,
            num_workers=self.num_workers,
        )

        pred_arr = np.empty((len(files), self.dims))

        start_idx = 0

        for batch in tqdm(dataloader):
            batch = batch.to(self.device)

            with torch.no_grad():
                pred = self.model(batch)[0]

            # If model output is not scalar, apply global spatial average pooling.
            # This happens if you choose a dimensionality not equal 2048.
            if pred.size(2) != 1 or pred.size(3) != 1:
                pred = adaptive_avg_pool2d(pred, output_size=(1, 1))

            pred = pred.squeeze(3).squeeze(2).cpu().numpy()

            pred_arr[start_idx : start_idx + pred.shape[0]] = pred

            start_idx = start_idx + pred.shape[0]

            sigma = np.cov(pred_arr, rowvar=False)

        K = truncate if truncate is not None else len(files)
        return self.tie(sigma, K)

    def tie(self, S, K=None):
        eigvals, _ = np.linalg.eigh(S)
        eigvals = [x for x in eigvals if x > 0.01]
        if not K:
            K = len(eigvals)
        else:
            if K < len(eigvals):
                eigvals = eigvals[-K:]
            elif K > len(eigvals):
                warnings.warn("Number of EIGs>0.01 is lower than truncation parameter.")

        entropy = K * (np.log(2 * np.pi) + 1)
        for eig in eigvals:
            if eig < 0.0001:
                raise ValueError("Eigenvalue is too small")
            entropy += np.log(eig)
        entropy *= 0.5

        return entropy
