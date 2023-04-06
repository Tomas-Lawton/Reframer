import torch
import subprocess

print("Cuda available:", "yes" if torch.cuda.is_available() else "no")
print("Pytorch cuda version:", torch.version.cuda)
print("Pytorch version:", torch.__version__)


CUDA_version = [
    s
    for s in subprocess.check_output(["nvcc", "--version"]).decode("UTF-8").split(", ")
    if s.startswith("release")
][0].split(" ")[-1]
print("CUDA installed version:", CUDA_version)

if CUDA_version == "10.0":
    torch_version_suffix = "+cu100"
elif CUDA_version == "10.1":
    torch_version_suffix = "+cu101"
elif CUDA_version == "10.2":
    torch_version_suffix = ""
else:
    torch_version_suffix = "+cu110"

print("Pytorch version suffix:", torch_version_suffix)
