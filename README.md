# AI Toolkit by Ostris

AI Toolkit is an all in one training suite for diffusion models. I try to support all the latest models on consumer grade hardware. Image and video models. It can be run as a GUI or CLI. It is designed to be easy to use but still have every feature imaginable.

## Platform Support (Windows ROCm Only)

This repository is **Windows + ROCm only**.

- Supported: Windows 11 + AMD GPU with ROCm 7.2
- Not supported: Linux, macOS, NVIDIA/CUDA, CPU-only

## Installation

Requirements:
- Python > 3.10
- ROCm 7.2-capable AMD GPU with enough VRAM
- Python venv
- Git

Windows prerequisites (ROCm-only):
- Windows 11
- AMD Adrenalin driver that includes ROCm/HIP support for Windows
- HIP SDK / ROCm for Windows (needed for ROCm PyTorch)
- Visual Studio 2022 Build Tools with the "Desktop development with C++" workload
- Windows 10/11 SDK (installed by the VS workload above)
- CMake (required if you rebuild the ADLX GPU monitor helper)

Notes:
- If you do not plan to rebuild the ADLX helper, you can skip the VS/CMake requirements.
- Install a ROCm 7.2-compatible PyTorch build before installing requirements.txt.

Windows:

```bash
git clone https://github.com/ostris/ai-toolkit.git
cd ai-toolkit
python -m venv venv
.\venv\Scripts\activate
# install ROCm 7.2 PyTorch first (use your ROCm 7.2 build)
pip install -r requirements.txt
```


# AI Toolkit UI

<img src="https://ostris.com/wp-content/uploads/2025/02/toolkit-ui.jpg" alt="AI Toolkit UI" width="100%">

The AI Toolkit UI is a web interface for the AI Toolkit. It allows you to easily start, stop, and monitor jobs. It also allows you to easily train models with a few clicks. It also allows you to set a token for the UI to prevent unauthorized access so it is mostly safe to run on an exposed server.

## Running the UI

Requirements:
- Node.js > 18

The UI does not need to be kept running for the jobs to run. It is only needed to start/stop/monitor jobs. The commands below
will install / update the UI and it's dependencies and start the UI. 

```bash
cd ui
npm run build_and_start
```

You can now access the UI at `http://localhost:8675` or `http://<your-ip>:8675` if you are running it on a server.

## Securing the UI

If you are hosting the UI on a cloud provider or any network that is not secure, I highly recommend securing it with an auth token. 
You can do this by setting the environment variable `AI_TOOLKIT_AUTH` to super secure password. This token will be required to access
the UI. You can set this when starting the UI like so:

```bash
# Windows
set AI_TOOLKIT_AUTH=super_secure_password && npm run build_and_start

# Windows Powershell
$env:AI_TOOLKIT_AUTH="super_secure_password"; npm run build_and_start
```


## Dataset Preparation

Datasets generally need to be a folder containing images and associated text files. Currently, the only supported
formats are jpg, jpeg, and png. Webp currently has issues. The text files should be named the same as the images
but with a `.txt` extension. For example `image2.jpg` and `image2.txt`. The text file should contain only the caption.
You can add the word `[trigger]` in the caption file and if you have `trigger_word` in your config, it will be automatically
replaced. 

Images are never upscaled but they are downscaled and placed in buckets for batching. **You do not need to crop/resize your images**.
The loader will automatically resize them and can handle varying aspect ratios. 


## Training Specific Layers

To train specific layers with LoRA, you can use the `only_if_contains` network kwargs. For instance, if you want to train only the 2 layers
used by The Last Ben, [mentioned in this post](https://x.com/__TheBen/status/1829554120270987740), you can adjust your
network kwargs like so:

```yaml
      network:
        type: "lora"
        linear: 128
        linear_alpha: 128
        network_kwargs:
          only_if_contains:
            - "transformer.single_transformer_blocks.7.proj_out"
            - "transformer.single_transformer_blocks.20.proj_out"
```

The naming conventions of the layers are in diffusers format, so checking the state dict of a model will reveal 
the suffix of the name of the layers you want to train. You can also use this method to only train specific groups of weights.
For instance to only train the `single_transformer` for FLUX.1, you can use the following:

```yaml
      network:
        type: "lora"
        linear: 128
        linear_alpha: 128
        network_kwargs:
          only_if_contains:
            - "transformer.single_transformer_blocks."
```

You can also exclude layers by their names by using `ignore_if_contains` network kwarg. So to exclude all the single transformer blocks,


```yaml
      network:
        type: "lora"
        linear: 128
        linear_alpha: 128
        network_kwargs:
          ignore_if_contains:
            - "transformer.single_transformer_blocks."
```

`ignore_if_contains` takes priority over `only_if_contains`. So if a weight is covered by both,
if will be ignored.

## Updates

### Feb 07, 2026
- Clarified Windows + ROCm-only support and removed non-Windows guidance in this README.
- Added support for OmniGen2 training
- 
### June 17, 2025
- Performance optimizations for batch preparation
- Added some docs via a popup for items in the simple ui explaining what settings do. Still a WIP

### June 16, 2025
- Hide control images in the UI when viewing datasets
- WIP on mean flow loss

### June 12, 2025
- Fixed issue that resulted in blank captions in the dataloader

### June 10, 2025
- Decided to keep track up updates in the readme
- Added support for SDXL in the UI
- Added support for SD 1.5 in the UI
- Fixed UI Wan 2.1 14b name bug
- Added support for for conv training in the UI for models that support it