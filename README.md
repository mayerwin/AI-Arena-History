# Arena AI Model Elo History

**Live Tracker:** [https://mayerwin.github.io/AI-Arena-History/](https://mayerwin.github.io/AI-Arena-History/)

## 🔍 Purpose
AI labs frequently update their models post-launch, and users regularly report perceived "nerfs" — aggressive censorship, excessive quantization (to save on compute costs), or behavioral degradation over time.

This repository plots the **public Elo lifecycle** of every flagship AI model from major AI labs (OpenAI, Anthropic, Google, xAI, Mistral, Qwen, Moonshot) on a single, continuous timeline, so any such trends that show up in Arena's public data become visible at a glance. It's an imperfect lens (see caveats below) but the most consistent long-running signal currently available.

## 📊 Where does the data come from?
The data is automatically fetched daily from the official [LM Arena Leaderboard Dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset) on Hugging Face. The Arena relies on thousands of blind, crowdsourced human evaluations, making it the most robust metric of actual model capability.

> [!IMPORTANT]
> **Caveat 1 — Web Interfaces vs. API:** Arena AI tests model performance via **API endpoints**, so this tracks "raw" model capability. Consumer chat interfaces (like gemini.com or chatgpt.com) often include additional system prompts, safety filters, and UI-specific "wrappers" that can lead to perceived performance degradation. Providers may also silently switch to **quantized (lower-precision)** versions of models to save on compute costs during peak times without notifying users, a form of "nerfing" that may not be fully captured here.
>
> **PRs are welcome** to add data sources that represent true model evaluations performed specifically through the official web interfaces.

> [!IMPORTANT]
> **Caveat 2 — Elo is relative:** Arena's Elo rating measures performance *relative* to the rest of the leaderboard. When stronger models join — or peers improve — an existing model's Elo can drift down even though nothing about that model has changed. Conversely, if every model degrades in parallel, the rating won't reveal it.
>
> Elo is the least-imperfect long-running proxy I could find. A historical dataset of fixed-benchmark scores (i.e. snapshots of every model re-evaluated on the same fixed suite over time) would have made this a cleaner study, but I couldn't locate one — **pointers welcome**.

## 🧠 How the Chart Logic Works
- **One Curve per Lab:** We consolidate models so each major AI lab has exactly **ONE curve** representing their leading flagship lineage.
- **Continuous Tracking:** The chart plots the active flagship's Elo.
- **New Releases:** When a lab drops a new flagship model, it seamlessly replaces the old one. The transition is marked explicitly with the new model's name on the chart.
- **Possible Degradation:** Any downward trend in a model's score between releases is visible, but read the Elo-relativity caveat above before reading it as definitive: a drop can also reflect stronger competitors entering the leaderboard, not the model itself changing.

## 🔗 Related work
- [marginlab.ai's Claude Code tracker](https://marginlab.ai/trackers/claude-code/): a Claude-only view that follows Claude's performance specifically over time. A useful complementary lens if you care about the Claude lineage in particular, since a single-vendor tracker can pick up signals that an Arena-wide Elo view doesn't.

If you know of other longitudinal trackers, especially anything benchmarking the actual web/chat interfaces rather than raw API endpoints, or a historical fixed-benchmark dataset, please open a PR or issue.

## 🤖 Automated Updates
A GitHub Actions workflow (`update.yml`) runs daily to download the latest leaderboard snapshot via DuckDB, applies our flagship-detection heuristics, and autonomously commits any data changes. 

If AI labs fundamentally change their naming conventions in the future, check out the [Agent Instructions](Agent.md) to see how to update the heuristic mappings or automate it further with LLMs!
