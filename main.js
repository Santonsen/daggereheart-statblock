const { Plugin } = require('obsidian');

// Simple YAML parser for our specific needs
function parseYAML(yamlText) {
    const lines = yamlText.trim().split('\n');
    const result = {};
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            i++;
            continue;
        }

        const lineIndent = line.length - line.trimStart().length;

        if (lineIndent === 0 && trimmedLine.includes(':')) {
            // Top-level property
            const colonIndex = trimmedLine.indexOf(':');
            const key = trimmedLine.substring(0, colonIndex).trim();
            const value = trimmedLine.substring(colonIndex + 1).trim();
            
            if (value) {
                // Simple key-value pair
                result[key] = value;
                i++;
            } else if (key === 'feats') {
                // Special handling for feats array
                const feats = [];
                i++; // Move to next line
                
                while (i < lines.length) {
                    const nextLine = lines[i];
                    const nextTrimmed = nextLine.trim();
                    const nextIndent = nextLine.length - nextLine.trimStart().length;
                    
                    if (nextIndent === 0) {
                        // We've reached the end of the feats section
                        break;
                    }
                    
                    if (nextTrimmed.startsWith('- name:')) {
                        // Start of a new feat
                        const feat = {};
                        
                        // Parse the name
                        const nameValue = nextTrimmed.substring(7).trim(); // Remove "- name:"
                        feat.name = nameValue;
                        i++;
                        
                        // Look for the desc on the next line
                        if (i < lines.length) {
                            const descLine = lines[i];
                            const descTrimmed = descLine.trim();
                            if (descTrimmed.startsWith('desc:')) {
                                feat.desc = descTrimmed.substring(5).trim(); // Remove "desc:"
                                i++;
                            }
                        }
                        
                        feats.push(feat);
                    } else {
                        i++;
                    }
                }
                
                result[key] = feats;
            } else {
                // Other arrays or objects - simple handling
                result[key] = [];
                i++;
            }
        } else {
            i++;
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
    const separator1 = document.createElement('div');
    separator1.className = 'dh-separator';
    container.appendChild(separator1);

    // Stats Section with white background
    const statsSection = document.createElement('div');
    statsSection.className = 'dh-stats-section';

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
    statsSection.appendChild(statsRow1);

    // Stats Row 2
    const statsRow2 = document.createElement('div');
    statsRow2.className = 'dh-stats-row';
    
    const atk = data.atk || '-';
    const attack = data.attack || '-';
    const range = data.range || '-';
    const damage = data.damage || '-';
    
    let attackString = '';
    if (attack !== '-' && range !== '-' && damage !== '-') {
        attackString = `<strong>${attack}:</strong> ${range} | ${damage}`;
    } else if (attack !== '-') {
        attackString = `<strong>${attack}:</strong>`;
    } else {
        attackString = '-';
    }
    
    statsRow2.innerHTML = `
        <span class="dh-stat"><strong>ATK:</strong> ${atk}</span>
        <span class="dh-divider">|</span>
        <span class="dh-stat">${attackString}</span>
    `;
    statsSection.appendChild(statsRow2);

    // Add the stats section to the container
    container.appendChild(statsSection);

    // Horizontal separator
    const separator2 = document.createElement('div');
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

            const featureText = document.createElement('div');
            featureText.className = 'dh-feature-text';
            
            const name = feat.name || '-';
            const desc = feat.desc || '-';
            
            featureText.innerHTML = `<strong>${name}:</strong> ${processMarkdown(desc)}`;
            featureDiv.appendChild(featureText);

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