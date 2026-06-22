const fs = require('fs');
const duckdb = require('duckdb');

const db = new duckdb.Database(':memory:');

const LAB_CONFIGS = {
    'OpenAI': {
        orgMatch: ['openai'],
        isFlagship: (name) => {
            const n = name.toLowerCase();
            return (n.includes('gpt-4') || n.includes('gpt-5') || n.includes('o1') || n.includes('o3') || n.includes('o4'))
                && !n.includes('mini') && !n.includes('nano') && !n.includes('lite');
        },
        // "Latest release" mode only: drop the fast ('instant') and chat-tuned variants so the
        // newest-by-date pick stays on the core reasoning flagship (e.g. gpt-5.5, not gpt-5.5-instant).
        flagshipLine: (name) => {
            const n = name.toLowerCase();
            return !n.includes('instant') && !n.includes('chat');
        }
    },
    'Google': {
        orgMatch: ['google'],
        isFlagship: (name) => {
            const n = name.toLowerCase();
            return (n.includes('pro') || n.includes('ultra') || n.includes('advanced')) 
                && !n.includes('flash') && !n.includes('lite') && !n.includes('nano') && !n.includes('8b');
        }
    },
    'Anthropic': {
        orgMatch: ['anthropic'],
        isFlagship: (name) => {
            const n = name.toLowerCase();
            return !n.includes('haiku') && !n.includes('instant');
        },
        // "Latest release" mode only: restrict to the Opus flagship line so "newest" can't jump to a
        // newer-but-lower-tier sibling (e.g. claude-sonnet-* or claude-fable-*) that outranks it by date.
        flagshipLine: (name) => name.toLowerCase().includes('opus')
    },
    'xAI': {
        orgMatch: ['xai'],
        isFlagship: (name) => {
            const n = name.toLowerCase();
            return n.includes('grok') && !n.includes('mini');
        }
    },
    'Qwen': {
        orgMatch: ['qwen', 'alibaba'],
        isFlagship: (name) => {
            const n = name.toLowerCase();
            return n.includes('max') || n.includes('72b') || n.includes('110b') || n.includes('plus') || n.includes('480b');
        }
    },
    'Mistral': {
        orgMatch: ['mistral'],
        isFlagship: (name) => {
            const n = name.toLowerCase();
            return n.includes('large') || n.includes('medium') || n.includes('magistral');
        }
    },
    'Moonshot (Kimi)': {
        orgMatch: ['moonshot'], // Sometimes moonshot org is missing, might need name match
        isFlagship: (name) => {
            const n = name.toLowerCase();
            return n.includes('kimi') && !n.includes('instant') && !n.includes('mini');
        }
    },
    // GLM = Zhipu AI's model family (internationally branded Z.ai; org appears as
    // 'Zhipu', 'Zhipu AI', or 'zai' in the data, and as 'Tsinghua' for the legacy ChatGLM line).
    'GLM': {
        orgMatch: ['zhipu', 'zai'],
        isFlagship: (name) => {
            const n = name.toLowerCase();
            return n.includes('glm')
                && !n.includes('chatglm')  // legacy 6B-class ChatGLM
                && !n.includes('air')      // lightweight/distilled tier
                && !n.includes('flash')    // fast/small tier
                && !n.endsWith('v')        // vision variants (e.g. glm-4.6v)
                && !/-\d+b\b/.test(n);      // explicit small param counts (e.g. -9b)
        }
    }
};

db.exec("INSTALL httpfs; LOAD httpfs;", (err) => {
    if (err) throw err;
    
    console.log("Fetching dataset...");
    const query = `
        SELECT leaderboard_publish_date as date, model_name, organization, rating
        FROM 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/resolve/main/text/full-00000-of-00001.parquet?download=true'
        WHERE category = 'overall'
          AND leaderboard_publish_date IS NOT NULL
          AND model_name IS NOT NULL
          AND rating IS NOT NULL
          AND NOT isnan(rating)
        ORDER BY leaderboard_publish_date ASC
    `;
    
    db.all(query, (err, res) => {
        if (err) throw err;
        
        console.log(`Fetched ${res.length} rows.`);
        
        // 1. Group all records by lab
        const labRecords = {};
        Object.keys(LAB_CONFIGS).forEach(lab => labRecords[lab] = []);
        
        res.forEach(row => {
            let assignedLab = null;
            const org = (row.organization || '').toLowerCase();
            const name = (row.model_name || '').toLowerCase();
            
            for (const [lab, config] of Object.entries(LAB_CONFIGS)) {
                if (config.orgMatch.some(o => org.includes(o)) ||
                   (lab === 'Moonshot (Kimi)' && name.includes('kimi')) ||
                   (lab === 'GLM' && name.includes('glm'))) {
                    assignedLab = lab;
                    break;
                }
            }
            
            if (assignedLab && LAB_CONFIGS[assignedLab].isFlagship(row.model_name)) {
                labRecords[assignedLab].push(row);
            }
        });
        
        // Collapse "inference mode" variants of the same underlying model (e.g. -thinking,
        // -reasoning, -high) so the chart doesn't flip between them when their Elos are within
        // noise of each other. The base name is what we display.
        //
        // -thinking and -reasoning are universal inference-mode suffixes.
        // -high / -medium / -low are OpenAI reasoning-effort tags; we only strip them when the
        // name follows OpenAI's identifier shape (gpt-*, o<digit>-*) to avoid mangling unrelated
        // product names like `mistral-medium`.
        function baseModelName(name) {
            if (!name) return name;
            let n = name;
            n = n.replace(/-thinking(?:-\d+k)?$/i, '');
            n = n.replace(/-(?:fast-)?reasoning(?:-\d+)?$/i, '');
            if (/^(?:gpt-|o\d)/i.test(n)) {
                n = n.replace(/-(?:high|medium|low)$/i, '');
            }
            return n;
        }

        // Build a single per-lab continuum. `pick(groups, firstSeen)` chooses the active base among
        // the flagship-eligible models present on each date; the two pickers below give the two modes.
        function buildLabSeries(rows, pick) {
            const byDate = {};
            rows.forEach(r => {
                if (!byDate[r.date]) byDate[r.date] = [];
                byDate[r.date].push(r);
            });

            const sortedDates = Object.keys(byDate).sort();

            // Earliest date each base model appears (used by the "latest release" picker).
            const firstSeen = {};
            sortedDates.forEach(date => byDate[date].forEach(r => {
                const base = baseModelName(r.model_name);
                if (!(base in firstSeen)) firstSeen[base] = date; // dates iterated ascending
            }));

            const series = [];
            for (const date of sortedDates) {
                // Group records by base name; keep the best variant per base.
                const byBase = {};
                byDate[date].forEach(r => {
                    const base = baseModelName(r.model_name);
                    if (!byBase[base] || r.rating > byBase[base].rating) {
                        byBase[base] = { name: base, rating: r.rating };
                    }
                });
                const best = pick(Object.values(byBase), firstSeen);
                if (best) {
                    // Skip rows identical to the prior one — no information added, just bloat.
                    const last = series[series.length - 1];
                    if (!last || last.model_name !== best.name || last.rating !== best.rating) {
                        series.push({ date: date, model_name: best.name, rating: best.rating });
                    }
                }
            }
            return series;
        }

        // "Highest Elo" (default): the top-rated flagship present on each date. Picking by latest
        // release is wrong here — a lab can ship a mid-tier model (e.g. Sonnet) while its higher-tier
        // flagship (Opus) is still the top performer, and the curve should stay on Opus.
        const pickHighestElo = (groups) => {
            let best = null;
            for (const g of groups) if (!best || g.rating > best.rating) best = g;
            return best;
        };

        // "Latest release": the most recently introduced flagship present on each date (ties broken
        // by rating). This deliberately surfaces Elo regressions when a newer flagship ranks below
        // its predecessor (e.g. claude-opus-4-8 below 4-6). Restricted per-lab via `flagshipLine`
        // so "newest" can't jump to a cheaper/side model.
        const pickLatestRelease = (groups, firstSeen) => {
            let best = null;
            for (const g of groups) {
                if (!best) { best = g; continue; }
                const fg = firstSeen[g.name], fb = firstSeen[best.name];
                if (fg > fb || (fg === fb && g.rating > best.rating)) best = g;
            }
            return best;
        };

        // 2. For each lab, build both continua. Drop empty labs (no flagship-eligible data) so the
        //    frontend never has to defend against zero-length rows[].
        const finalChartData = {};   // highest-Elo (default)
        const latestChartData = {};  // latest-release
        for (const [lab, rows] of Object.entries(labRecords)) {
            const highest = buildLabSeries(rows, pickHighestElo);
            if (highest.length > 0) finalChartData[lab] = highest;

            const lineFilter = LAB_CONFIGS[lab].flagshipLine;
            const lineRows = lineFilter ? rows.filter(r => lineFilter(r.model_name)) : rows;
            const latest = buildLabSeries(lineRows, pickLatestRelease);
            if (latest.length > 0) latestChartData[lab] = latest;
        }

        // Emit both series sets. `CHART_DATA` aliases the active one (highest-Elo by default); the
        // frontend reassigns it to CHART_DATA_LATEST when the user flips the on-chart mode toggle.
        fs.writeFileSync('data.js',
            'const CHART_DATA_HIGHEST = ' + JSON.stringify(finalChartData, null, 2) + ';\n' +
            'const CHART_DATA_LATEST = ' + JSON.stringify(latestChartData, null, 2) + ';\n' +
            'var CHART_DATA = CHART_DATA_HIGHEST;\n');
        console.log("data.js generated successfully.");
    });
});
