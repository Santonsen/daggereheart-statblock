const { Plugin } = require('obsidian');

// Simple YAML parser for our specific needs
function parseYAML(yamlText) {
    const lines = yamlText.trim().split('\n');
    const result = {};
    let currentKey = null;
    let currentArray = null;
    let indent = 0;

    for (let line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;

        const lineIndent = line.length - line.trimStart().length;

        if (trimmedLine.includes(':')) {
            const [key, ...valueParts] = trimmedLine.split(':');
            const value = valueParts.join(':').trim();
            
            if (lineIndent === 0) {
                currentKey = key.trim();
                if (value) {
                    result[currentKey] = value;
                } else {
                    // This might be an array or object
                    currentArray = [];
                    result[currentKey] = currentArray;
                }
            } else if (currentArray && lineIndent > indent) {
                // This is part of an array item
                if (key.trim() === 'name' || key.trim() === 'desc') {
                    if (currentArray.length === 0 || typeof currentArray[currentArray.length - 1] !== 'object') {
                        currentArray.push({});
                    }
                    currentArray[currentArray.length - 1][key.trim()] = value;
                }
            }
        } else if (trimmedLine.startsWith('-')) {
            // Array item
            if (currentArray) {
                const itemValue = trimmedLine.substring(1).trim();
                if (itemValue) {
                    currentArray.push(itemValue);
                } else {
                    currentArray.push({});
                }
            }
        }
        
        if (lineIndent === 0) {
            indent = 0;
        } else {
            indent = lineIndent;
        }
    }

    return result;
}

function processMarkdown(text) {
    if (!text) return '';
    
    // Process bold and italic
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function renderStatblock(data) {
    const container = document.createElement('div');
    container.className = 'dh-adversary-card';

    // Title
    const title = document.createElement('h1');
    title.className = 'dh-title';
    title.textContent = data.name || '-';
    container.appendChild(title);

    // Tier and Type
    const subtitle = document.createElement('div');
    subtitle.className = 'dh-subtitle';
    let tierText = '';
    if (data.tier || data.type) {
        tierText = `Tier ${data.tier || '-'} ${data.type || ''}`.trim();
    } else {
        tierText = '-';
    }
    subtitle.textContent = tierText;
    container.appendChild(subtitle);

    // Description
    const description = document.createElement('div');
    description.className = 'dh-description';
    description.textContent = data.description || '-';
    container.appendChild(description);

    // Motives & Tactics
    const motives = document.createElement('div');
    motives.className = 'dh-motives';
    motives.innerHTML = `<strong>Motives & Tactics:</strong> ${data.motives_and_tactics || '-'}`;
    container.appendChild(motives);

    // Horizontal separator
    const separator1 = document.createElement('hr');
    separator1.className = 'dh-separator';
    container.appendChild(separator1);

    // Stats Row 1
    const statsRow1 = document.createElement('div');
    statsRow1.className = 'dh-stats-row';
    
    const difficulty = data.difficulty || '-';
    const thresholds = data.thresholds || '-';
    const hp = data.hp || '-';
    const stress = data.stress || '-';
    
    statsRow1.innerHTML = `
        <span class="dh-stat"><strong>Difficulty:</strong> ${difficulty}</span>
        <span class="dh-divider">|</span>
        <span class="dh-stat"><strong>Thresholds:</strong> ${thresholds}</span>
        <span class="dh-divider">|</span>
        <span class="dh-stat"><strong>HP:</strong> ${hp}</span>
        <span class="dh-divider">|</span>
        <span class="dh-stat"><strong>Stress:</strong> ${stress}</span>
    `;
    container.appendChild(statsRow1);

    // Stats Row 2
    const statsRow2 = document.createElement('div');
    statsRow2.className = 'dh-stats-row';
    
    const atk = data.atk || '-';
    const attack = data.attack || '-';
    const range = data.range || '-';
    const damage = data.damage || '-';
    
    let attackString = '';
    if (attack !== '-' && range !== '-' && damage !== '-') {
        attackString = `${attack}: ${range} | ${damage}`;
    } else if (attack !== '-') {
        attackString = attack;
    } else {
        attackString = '-';
    }
    
    statsRow2.innerHTML = `
        <span class="dh-stat"><strong>ATK:</strong> ${atk}</span>
        <span class="dh-divider">|</span>
        <span class="dh-stat">${attackString}</span>
    `;
    container.appendChild(statsRow2);

    // Horizontal separator
    const separator2 = document.createElement('hr');
    separator2.className = 'dh-separator';
    container.appendChild(separator2);

    // Features Section
    const featuresTitle = document.createElement('h2');
    featuresTitle.className = 'dh-features-title';
    featuresTitle.textContent = 'FEATURES';
    container.appendChild(featuresTitle);

    // Individual Features
    if (data.feats && Array.isArray(data.feats) && data.feats.length > 0) {
        data.feats.forEach(feat => {
            const featureDiv = document.createElement('div');
            featureDiv.className = 'dh-feature';

            const featureName = document.createElement('div');
            featureName.className = 'dh-feature-name';
            featureName.textContent = feat.name || '-';
            featureDiv.appendChild(featureName);

            const featureDesc = document.createElement('div');
            featureDesc.className = 'dh-feature-desc';
            featureDesc.innerHTML = processMarkdown(feat.desc || '-');
            featureDiv.appendChild(featureDesc);

            container.appendChild(featureDiv);
        });
    }

    return container;
}

module.exports = class DaggerheartStatblocksPlugin extends Plugin {
    async onload() {
        console.log('Loading Daggerheart Statblocks plugin');

        // Register the code block processor
        this.registerMarkdownCodeBlockProcessor('dh-adversary', (source, el, ctx) => {
            try {
                const data = parseYAML(source);
                const statblock = renderStatblock(data);
                el.appendChild(statblock);
            } catch (error) {
                console.error('Error parsing Daggerheart statblock:', error);
                el.createEl('div', { 
                    text: `Error parsing statblock: ${error.message}`,
                    cls: 'dh-error'
                });
            }
        });
    }

    onunload() {
        console.log('Unloading Daggerheart Statblocks plugin');
    }
};