# Agent Instructions

## Purpose
This repository visualizes the Elo trajectory and flagship progression of major AI labs on the Arena AI Leaderboard. It tracks a single continuum (curve) per lab, and the frontend lets the viewer pick **how** that curve chooses the lab's active model at each date (see *Two selection modes* below).

## The Challenge: Identifying Flagship Models
With many models appearing on the leaderboard (e.g., test versions, small-parameter versions, quantized variants), we must reliably identify the **flagship** models for each major lab (OpenAI, Anthropic, Google, Qwen, Mistral, xAI, Moonshot, Zhipu/Z.ai).

The pipeline is a Node.js script (`update_data.js`) driven by hardcoded heuristics in the `LAB_CONFIGS` dictionary. Each lab entry has:
- **`orgMatch`** — substrings matched against the dataset's `organization` field to assign a row to the lab (e.g. `['zhipu', 'zai']`). A couple of labs whose org field is sometimes blank also have a name-based fallback in the assignment loop (`kimi` for Moonshot, `glm` for Zhipu/Z.ai).
- **`isFlagship(name)`** — keeps only flagship-eligible models, dropping smaller/cheaper tiers via token rules. For example OpenAI looks for `gpt-4`/`gpt-5`/`o1`/`o3`/`o4` while excluding `mini`/`nano`/`lite`; Anthropic keeps everything except `haiku`/`instant`.
- **`flagshipLine(name)`** *(optional)* — an **extra** narrowing predicate used **only** in "Latest release" mode (below). Set it when a lab's `isFlagship` set still contains more than one tier, so "newest" can't jump to a cheaper or side model. OpenAI uses it to drop `-instant`/`-chat`; Anthropic restricts to the Opus line (excluding Sonnet/Fable). Labs whose `isFlagship` set is already a single line omit it.

Two shared helpers shape the curve:
- **`baseModelName(name)`** collapses inference-mode variants (`-thinking`, `-reasoning`, and OpenAI's `-high`/`-medium`/`-low`) into the parent so the curve doesn't flip-flop between modes.
- **`buildLabSeries(rows, pick)`** groups records by date, keeps the best-rated variant per base name, then calls `pick` to choose the active model for that date.

## Two selection modes
`update_data.js` emits **two** datasets, built with two different `pick` functions:
- **`CHART_DATA_HIGHEST`** (default) uses `pickHighestElo` — the highest-rated flagship present on each date. A lab can ship a mid-tier model (e.g. Sonnet) while its higher-tier flagship (Opus) still ranks above it, and the curve correctly stays on Opus.
- **`CHART_DATA_LATEST`** uses `pickLatestRelease` — the most recently introduced flagship present on each date (over the `flagshipLine`-narrowed candidate set), surfacing Elo regressions when a newer flagship ranks below its predecessor.

`var CHART_DATA = CHART_DATA_HIGHEST` is the active alias; the on-chart toggle in `index.html` reassigns it. Both datasets share the same lab keys/order.

## When Things Go Wrong
If a lab releases a new naming convention (e.g., Anthropic ships "Claude 5 Pinnacle" instead of "Opus"), or a new lab/model line should be tracked, the heuristics in `update_data.js` might miss it.

### How to Fix It
1. Open `update_data.js` and locate `LAB_CONFIGS`.
2. **New flagship name, existing lab:** add the token (e.g. `n.includes('pinnacle')`) to that lab's `isFlagship`, still excluding smaller/distilled tiers (e.g. `!n.includes('haiku')`).
3. **Latest-release correctness:** if the new top model coexists in the `isFlagship` set with cheaper siblings, also update (or add) the lab's `flagshipLine` so "Latest release" mode stays on the true flagship line.
4. **Brand-new lab:** add a `LAB_CONFIGS` entry (`orgMatch`, `isFlagship`, optional `flagshipLine`), then wire the new lab key into `index.html` — it needs an entry in `labColors` (or its line renders with no color) and, if the legend should show a parent-lab name, in `LAB_DISPLAY` (e.g. `Qwen → Alibaba`, `GLM → Z.ai`).
5. Regenerate and sanity-check: the daily workflow does this automatically, but you can verify locally that the seven pre-existing labs are unchanged and the new/edited series looks right.

## Using Basic Agents in GitHub Workflows
Yes, **GitHub Actions can utilize basic agents (LLMs)**! You do not need a massive model (like GPT-4 or Claude 3.5 Sonnet) for data mapping tasks. A basic or cheaper LLM (like GPT-4o-mini or Claude Haiku) is perfectly capable of maintaining this mapping.

### How to implement an Agentic Workflow
1. **Fetch Daily Data**: The workflow downloads the daily models list.
2. **LLM Evaluation Step**: A simple Python/Node script sends the list of new models to an LLM API (OpenAI, Anthropic, etc.).
3. **Prompting the Agent**:
   *Prompt:* "Given these new model names from Arena AI, identify if any of them are the new ultimate flagship model for OpenAI, Anthropic, Google, Mistral, Qwen, xAI, Moonshot, or Zhipu/Z.ai. Return a JSON mapping updating our keyword rules if necessary."
4. **Automated PR**: If the agent determines a new heuristic is needed (e.g., it sees `claude-5-pinnacle`), the workflow can automatically generate a PR modifying `update_data.js`.

Currently, the heuristic is static and extremely robust. But if you wish to fully automate adaptation to new naming schemes, you simply need to inject a basic API call step into the existing `.github/workflows/update.yml`.
