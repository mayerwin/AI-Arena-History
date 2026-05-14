# Agent Instructions

## Purpose
This repository visualizes the Elo degradation and flagship progression of major AI labs on the Arena AI Leaderboard. It tracks a single continuum (curve) for each lab by seamlessly substituting older models for newer flagship ones when they are released.

## The Challenge: Identifying Flagship Models
With many models appearing on the leaderboard (e.g., test versions, small parameter versions, quantized variants), we must reliably identify the **flagship** models for each major lab (OpenAI, Anthropic, Google, Qwen, Mistral, xAI, Moonshot). 

The current pipeline uses a Node.js script (`update_data.js`) with hardcoded heuristics.
- **Tokens/Regex**: For example, it looks for `gpt-4`, `o1`, or `gpt-5` to identify OpenAI flagships, deliberately ignoring variants with the keywords `mini` or `nano`.
- **Chronological Ordering**: The script automatically orders these identified flagships by their earliest appearance date, ensuring the chart actively tracks the newest available flagship at any given time.

## When Things Go Wrong
If a lab releases a new naming convention (e.g., Anthropic releases "Claude 5 Pinnacle" instead of "Opus"), the hardcoded heuristic in `update_data.js` might miss it.

### How to Fix It
1. Open `update_data.js`.
2. Locate the `LAB_CONFIGS` dictionary.
3. Add the new token (e.g., `n.includes('pinnacle')`) to the `isFlagship` function for the corresponding lab.
4. Ensure you still exclude smaller/distilled models (e.g., `!n.includes('haiku')`).

## Using Basic Agents in GitHub Workflows
Yes, **GitHub Actions can utilize basic agents (LLMs)**! You do not need a massive model (like GPT-4 or Claude 3.5 Sonnet) for data mapping tasks. A basic or cheaper LLM (like GPT-4o-mini or Claude Haiku) is perfectly capable of maintaining this mapping.

### How to implement an Agentic Workflow
1. **Fetch Daily Data**: The workflow downloads the daily models list.
2. **LLM Evaluation Step**: A simple Python/Node script sends the list of new models to an LLM API (OpenAI, Anthropic, etc.).
3. **Prompting the Agent**:
   *Prompt:* "Given these new model names from Arena AI, identify if any of them are the new ultimate flagship model for OpenAI, Anthropic, Google, Mistral, Qwen, xAI, or Moonshot. Return a JSON mapping updating our keyword rules if necessary."
4. **Automated PR**: If the agent determines a new heuristic is needed (e.g., it sees `claude-5-pinnacle`), the workflow can automatically generate a PR modifying `update_data.js`.

Currently, the heuristic is static and extremely robust. But if you wish to fully automate adaptation to new naming schemes, you simply need to inject a basic API call step into the existing `.github/workflows/update.yml`.
