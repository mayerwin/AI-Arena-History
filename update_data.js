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
        }
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
                   (lab === 'Moonshot (Kimi)' && name.includes('kimi'))) {
                    assignedLab = lab;
                    break;
                }
            }
            
            if (assignedLab && LAB_CONFIGS[assignedLab].isFlagship(row.model_name)) {
                labRecords[assignedLab].push(row);
            }
        });
        
        const finalChartData = {};

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

        // 2. For each lab, pick the active flagship per date as the model with the highest Elo
        //    among all flagship-eligible models present on that date. Picking by "latest release"
        //    is wrong: a lab can ship a mid-tier model (e.g. Sonnet) while its higher-tier
        //    flagship (Opus) is still the top performer.
        for (const [lab, rows] of Object.entries(labRecords)) {
            const byDate = {};
            rows.forEach(r => {
                if (!byDate[r.date]) byDate[r.date] = [];
                byDate[r.date].push(r);
            });

            const labSeriesData = [];
            for (const date of Object.keys(byDate).sort()) {
                // Group records by base name; keep the best variant per base.
                const byBase = {};
                byDate[date].forEach(r => {
                    const base = baseModelName(r.model_name);
                    if (!byBase[base] || r.rating > byBase[base].rating) {
                        byBase[base] = { name: base, rating: r.rating };
                    }
                });
                // Pick the base group with the highest rating.
                let best = null;
                for (const g of Object.values(byBase)) {
                    if (!best || g.rating > best.rating) best = g;
                }
                if (best) {
                    // Skip rows identical to the prior one — no information added, just bloat.
                    const last = labSeriesData[labSeriesData.length - 1];
                    if (!last || last.model_name !== best.name || last.rating !== best.rating) {
                        labSeriesData.push({
                            date: date,
                            model_name: best.name,
                            rating: best.rating
                        });
                    }
                }
            }

            // Drop empty labs (no flagship-eligible data) so the frontend never has to defend
            // against zero-length rows[].
            if (labSeriesData.length > 0) {
                finalChartData[lab] = labSeriesData;
            }
        }

        fs.writeFileSync('data.js', 'const CHART_DATA = ' + JSON.stringify(finalChartData, null, 2) + ';');
        console.log("data.js generated successfully.");
    });
});
