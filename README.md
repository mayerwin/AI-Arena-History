# Arena AI Model ELO History

**Live Tracker:** [https://mayerwin.github.io/AI-Arena-History/](https://mayerwin.github.io/AI-Arena-History/)

## 🔍 Purpose
AI labs frequently update their models post-launch. Unfortunately, these updates sometimes introduce "nerfs" such as aggressive censorship, excessive quantization (to save on compute costs), or behavioral degradation over time. 

This repository exposes these hidden trends by tracking the **true capability lifecycle** of flagship AI models from major AI labs (OpenAI, Anthropic, Google, xAI, Mistral, Qwen, Moonshot) on a single, continuous timeline. 

## 📊 Where does the data come from?
The data is automatically fetched daily from the official [LM Arena Leaderboard Dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset) on Hugging Face. The Arena relies on thousands of blind, crowdsourced human evaluations, making it the most robust metric of actual model capability.

> [!IMPORTANT]
> **Note on Web Interfaces:** LMSYS Arena tests model performance via **API endpoints**. This tracks the "raw" model capability. Consumer chat interfaces (like gemini.com or chatgpt.com) often include additional system prompts, safety filters, and UI-specific "wrappers" that can lead to perceived performance degradation. Additionally, providers may silently switch to **quantized (lower-precision)** versions of models to save on compute costs during peak times without notifying users, a form of "nerfing" that may not be fully captured here.
>
> **PRs are welcome** to add data sources that represent true model evaluations performed specifically through the official web interfaces.

## 🧠 How the Chart Logic Works
- **One Curve per Lab:** We consolidate models so each major AI lab has exactly **ONE curve** representing their leading flagship lineage.
- **Continuous Tracking:** The chart plots the active flagship's ELO.
- **New Releases:** When a lab drops a new flagship model, it seamlessly replaces the old one. The transition is marked explicitly with the new model's name on the chart.
- **Visualizing Degradation:** Any downward trend in a model's score between releases clearly shows performance degradation over time.

## 🤖 Automated Updates
A GitHub Actions workflow (`update.yml`) runs daily to download the latest leaderboard snapshot via DuckDB, applies our flagship-detection heuristics, and autonomously commits any data changes. 

If AI labs fundamentally change their naming conventions in the future, check out the [Agent Instructions](Agent.md) to see how to update the heuristic mappings or automate it further with LLMs!
