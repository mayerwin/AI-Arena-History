# Arena AI Model Elo History

**Live Tracker:** [https://mayerwin.github.io/AI-Arena-History/](https://mayerwin.github.io/AI-Arena-History/)

## 🔍 Purpose
AI labs frequently update their models post-launch, and users regularly report perceived "nerfs": aggressive censorship, excessive quantization (to save on compute costs), or behavioral degradation over time.

This repository plots the **public Elo lifecycle** of every flagship AI model from major labs (OpenAI, Anthropic, Google, xAI, Mistral, Qwen, Moonshot, Zhipu/Z.ai) on a single, continuous timeline, so any such trend that shows up in Arena's public data is visible at a glance. It's an imperfect lens (see caveats below) but the most consistent long-running signal currently available.

## 📊 Where does the data come from?
The data is automatically fetched daily from the official [Arena AI Leaderboard Dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset) on Hugging Face. The Arena relies on thousands of blind, crowdsourced human evaluations, making it the most robust metric of actual model capability.

> [!IMPORTANT]
> **Caveat 1: Web interfaces vs. API.** Arena tests via **API endpoints**, so this chart reflects "raw" model capability. Consumer chat interfaces (gemini.com, chatgpt.com, etc.) add system prompts, safety filters, and UI wrappers not present in the raw API, and providers may silently switch to **quantized (lower-precision)** versions during peak load. Perceived "nerfing" in those products may not show up here.
>
> **PRs welcome** for data sources that evaluate the actual web interfaces.

> [!IMPORTANT]
> **Caveat 2: Elo is relative.** Arena's rating measures performance *relative* to the rest of the leaderboard. When stronger models enter the pool (or peers improve), an unchanged model's Elo can drift down anyway. Conversely, if every model regresses in parallel, the rating won't reveal it.
>
> Elo is the least-imperfect long-running proxy I could find. A fixed-benchmark longitudinal dataset (the same suite re-run against every model over time) would make this a cleaner study, but I couldn't locate one publicly. **Pointers welcome.**

## 🧠 How the Chart Logic Works
Each lab gets exactly **one curve**. A toggle at the **top-right of the chart** (below the labels on mobile) switches how that curve picks the lab's active model at each point in time:

- **Highest Elo** *(default)* **.** Tracks the lab's **highest-rated** flagship-eligible model, not just the most recently announced one. If a lab ships a mid-tier model (e.g. Sonnet) while a higher-tier one (e.g. Opus) still ranks above it, the curve stays on Opus.
- **Latest release.** Tracks the lab's **most recently released** flagship instead — even when its Elo has dipped below a predecessor (e.g. `claude-opus-4-8` ranking below `claude-opus-4-6`, or `gpt-5.5` below `gpt-5.4`). This is the view that surfaces post-release degradation most directly. Selection is scoped to each lab's top line, so "newest" never jumps to a cheaper or side model (e.g. an `-instant` variant, or Sonnet/Fable for Anthropic). Your choice is remembered across visits.

Common to both modes:

- **Inference modes merged.** Variants suffixed `-thinking`, `-reasoning`, `-high`, etc. are merged into their parent so the curve doesn't flip-flop between modes.
- **New releases** appear as labeled marker points, often with a jump in score.
- **Possible degradation.** Downward trends between releases are visible too, but read Caveat 2 before treating them as proof: a drop can also reflect stronger competitors entering the leaderboard rather than the model itself changing.

## 🔗 Related work
- [marginlab.ai's Claude Code tracker](https://marginlab.ai/trackers/claude-code/): a Claude-only view that follows Claude's performance over time. A useful complementary lens if you care about the Claude lineage specifically, since a single-vendor tracker can surface signals an Arena-wide Elo view doesn't.

Know of other longitudinal trackers (especially evaluations of actual web/chat interfaces, or fixed-benchmark longitudinal data)? Open a PR or issue.

## 🤖 Automated Updates
A GitHub Actions workflow (`update.yml`) runs daily to download the latest leaderboard snapshot via DuckDB, applies our flagship-detection heuristics, and autonomously commits any data changes. 

If AI labs fundamentally change their naming conventions in the future, check out the [Agent Instructions](Agent.md) to see how to update the heuristic mappings or automate it further with LLMs!
