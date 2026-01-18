import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import Papa from 'papaparse';

// ============================================================================
// Constants
// ============================================================================
const WEBPAGE_URL = 'https://callmepartario.github.io/og-dhsrd/#adversary-stat-blocks-listings';
const OUTPUT_PATH = path.resolve('./adversaries-extracted.csv');

// ============================================================================
// Benchmark Data (from the webpage tables)
// ============================================================================

/**
 * Parse a range string like "12-14" or "5-7" and return the middle value
 */
function parseRange(rangeStr) {
    if (!rangeStr) return null;
    const match = rangeStr.match(/(\d+)\s*[–-]\s*(\d+)/);
    if (match) {
        const min = parseInt(match[1], 10);
        const max = parseInt(match[2], 10);
        return Math.round((min + max) / 2);
    }
    // Try single number
    const single = extractNumber(rangeStr);
    return single;
}

/**
 * Parse threshold string like "7/14" and return [major, severe]
 */
function parseThreshold(thresholdStr) {
    if (!thresholdStr) return [null, null];
    const match = thresholdStr.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) {
        return [parseInt(match[1], 10), parseInt(match[2], 10)];
    }
    return [null, null];
}

/**
 * Parse attack modifier range like "+0 to +2" and return middle value
 */
function parseAttackModifier(modStr) {
    if (!modStr) return null;
    // Extract all numbers with + or -
    const matches = modStr.matchAll(/[+-](\d+)/g);
    const values = [];
    for (const match of matches) {
        const sign = modStr[match.index - 1] === '-' ? -1 : 1;
        values.push(sign * parseInt(match[1], 10));
    }
    if (values.length === 0) return null;
    if (values.length === 1) return values[0];
    // Return middle value
    values.sort((a, b) => a - b);
    return Math.round((values[0] + values[values.length - 1]) / 2);
}

/**
 * Extract benchmark data from HTML tables
 */
function extractBenchmarks($) {
    const benchmarks = {};
    
    // Find all benchmark tables
    $('table').each((i, table) => {
        const caption = $(table).find('caption').text();
        if (!caption.includes('Benchmarks')) return;
        
        // Extract type from caption (e.g., "Bruiser Benchmarks" -> "Bruiser")
        const typeMatch = caption.match(/(\w+)\s+Benchmarks/);
        if (!typeMatch) return;
        const type = typeMatch[1];
        
        if (!benchmarks[type]) {
            benchmarks[type] = { 1: {}, 2: {}, 3: {}, 4: {} };
        }
        
        // Extract data from table rows
        $(table).find('tbody tr').each((j, row) => {
            const statName = $(row).find('th').text().trim();
            const cells = $(row).find('td');
            
            cells.each((k, cell) => {
                const tier = k + 1; // Tier 1, 2, 3, 4
                const cellText = $(cell).text().trim();
                
                if (statName === 'Difficulty') {
                    benchmarks[type][tier].difficulty = parseRange(cellText);
                } else if (statName === 'Threshold Minimums') {
                    const [major, severe] = parseThreshold(cellText);
                    benchmarks[type][tier].threshold_major_min = major;
                    benchmarks[type][tier].threshold_severe_min = severe;
                } else if (statName === 'Threshold Maximums') {
                    const [major, severe] = parseThreshold(cellText);
                    benchmarks[type][tier].threshold_major_max = major;
                    benchmarks[type][tier].threshold_severe_max = severe;
                } else if (statName === 'Hit Points') {
                    benchmarks[type][tier].hp = parseRange(cellText);
                } else if (statName === 'Stress') {
                    benchmarks[type][tier].stress = parseRange(cellText);
                } else if (statName === 'Attack Modifier') {
                    benchmarks[type][tier].attack_mod = parseAttackModifier(cellText);
                } else if (statName === 'Damage Rolls') {
                    // Extract first damage dice from the list
                    const firstDice = $(cell).find('li').first().text().trim();
                    if (firstDice) {
                        benchmarks[type][tier].damage_dice = firstDice;
                    }
                } else if (statName === 'Basic Attack Damage (Y)') {
                    // Minions use flat damage (e.g., "1-3")
                    const cellText = $(cell).text().trim();
                    benchmarks[type][tier].damage_dice = cellText; // Keep as range like "1-3"
                } else if (statName === 'Damage Thresholds' && cellText === 'None') {
                    // Minions have no thresholds
                    benchmarks[type][tier].threshold_major_min = null;
                    benchmarks[type][tier].threshold_severe_min = null;
                }
            });
        });
    });
    
    return benchmarks;
}

/**
 * Apply benchmark data to an adversary based on tier and type
 */
function applyBenchmarks(adversary, benchmarks) {
    if (!adversary.Tier || !adversary.Type) return adversary;
    
    const type = adversary.Type;
    const tier = adversary.Tier;
    
    // Try exact match first, then case-insensitive
    let benchmark = benchmarks[type]?.[tier];
    if (!benchmark) {
        // Try case-insensitive match
        const typeLower = type.toLowerCase();
        for (const [key, value] of Object.entries(benchmarks)) {
            if (key.toLowerCase() === typeLower) {
                benchmark = value[tier];
                break;
            }
        }
    }
    
    if (!benchmark) return adversary;
    
    // Fill in missing values from benchmarks
    if (!adversary.Difficulty && benchmark.difficulty) {
        adversary.Difficulty = benchmark.difficulty;
    }
    
    // Minions have no thresholds (they're defeated by any damage)
    if (type.toLowerCase() !== 'minion') {
        if (!adversary.Major_Threshold && benchmark.threshold_major_min !== null && benchmark.threshold_major_min !== undefined) {
            // Use average of min and max if available
            if (benchmark.threshold_major_max) {
                adversary.Major_Threshold = Math.round((benchmark.threshold_major_min + benchmark.threshold_major_max) / 2);
            } else {
                adversary.Major_Threshold = benchmark.threshold_major_min;
            }
        }
        
        if (!adversary.Severe_Threshold && benchmark.threshold_severe_min !== null && benchmark.threshold_severe_min !== undefined) {
            if (benchmark.threshold_severe_max) {
                adversary.Severe_Threshold = Math.round((benchmark.threshold_severe_min + benchmark.threshold_severe_max) / 2);
            } else {
                adversary.Severe_Threshold = benchmark.threshold_severe_min;
            }
        }
    }
    
    if (!adversary.HP && benchmark.hp) {
        adversary.HP = benchmark.hp;
    }
    
    if (!adversary.Stress && benchmark.stress) {
        adversary.Stress = benchmark.stress;
    }
    
    if (adversary.Attack_Modifier === null && benchmark.attack_mod !== null && benchmark.attack_mod !== undefined) {
        adversary.Attack_Modifier = benchmark.attack_mod;
    }
    
    if (!adversary.Damage_Dice && benchmark.damage_dice) {
        // For Minions, damage might be flat (e.g., "1-3") from benchmarks, but prefer extracted damage with type
        // Only use benchmark if we don't have extracted damage
        adversary.Damage_Dice = benchmark.damage_dice;
    } else if (adversary.Damage_Dice && adversary.Damage_Dice.match(/\d+\s*[–-]\s*\d+/)) {
        // If we extracted a range (like "10–12"), try to find the actual damage with type in the text
        // This happens when the extraction matched a range instead of the actual damage
        adversary.Damage_Dice = ''; // Clear it so we can try to extract properly
    }
    
    // Set default range if missing
    if (!adversary.Attack_Range) {
        // Most adversaries use Melee or Close range
        adversary.Attack_Range = 'Melee';
    }
    
    return adversary;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract text content from an element, handling nested elements
 */
function extractText($, element) {
    if (!element) return '';
    return $(element).text().trim();
}

/**
 * Extract a number from text (first number found)
 */
function extractNumber(text) {
    if (!text) return null;
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
}

/**
 * Extract tier from text (looks for "Tier X" pattern)
 */
function extractTier(text) {
    if (!text) return null;
    const match = text.match(/tier\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract adversary type/role from text
 */
function extractType(text) {
    if (!text) return '';
    const types = ['Bruiser', 'Standard', 'Ranged', 'Skulk', 'Solo', 'Leader', 'Support', 'Horde', 'Minion', 'Social'];
    const textLower = text.toLowerCase();
    for (const type of types) {
        if (textLower.includes(type.toLowerCase())) {
            return type;
        }
    }
    return '';
}

/**
 * Parse damage dice from text (e.g., "2d8+4", "1d10", "3d6+2")
 */
function parseDamageDice(text) {
    if (!text) return '';
    const match = text.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/i);
    if (match) {
        const dice = match[1];
        const die = match[2];
        const mod = match[3] || '';
        return `${dice}d${die}${mod ? '+' + mod : ''}`;
    }
    return '';
}

/**
 * Parse attack information from text
 */
function parseAttack(text) {
    if (!text) return { modifier: null, range: '', damage: '' };
    
    const attack = { modifier: null, range: '', damage: '' };
    
    // Extract modifier (e.g., "+5", "-2")
    const modMatch = text.match(/[+-]\d+/);
    if (modMatch) {
        attack.modifier = parseInt(modMatch[0], 10);
    }
    
    // Extract range
    const ranges = ['Melee', 'Very Close', 'Close', 'Far', 'Very Far'];
    for (const range of ranges) {
        if (text.toLowerCase().includes(range.toLowerCase())) {
            attack.range = range;
            break;
        }
    }
    
    // Extract damage dice
    attack.damage = parseDamageDice(text);
    
    return attack;
}

/**
 * Extract experiences from text
 */
function extractExperiences(text) {
    if (!text) return [];
    const experiences = [];
    
    // Look for experience patterns like "Experience Name +2" or "Experience: +3"
    const expPattern = /([A-Za-z\s]+?)\s*[:\s]*\+(\d+)/g;
    let match;
    while ((match = expPattern.exec(text)) !== null) {
        experiences.push({
            name: match[1].trim(),
            value: parseInt(match[2], 10)
        });
    }
    
    return experiences;
}

/**
 * Clean and format text for CSV
 */
function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/\n+/g, ' ')   // Replace newlines with spaces
        .trim();
}

/**
 * Format features for CSV (as JSON string)
 */
function formatFeatures(features) {
    if (!features || features.length === 0) return '';
    try {
        return JSON.stringify(features);
    } catch (e) {
        return features.map(f => `${f.name}: ${f.description}`).join(' | ');
    }
}

/**
 * Format experiences for CSV (as JSON string)
 */
function formatExperiences(experiences) {
    if (!experiences || experiences.length === 0) return '';
    try {
        return JSON.stringify(experiences);
    } catch (e) {
        return experiences.map(e => `${e.name} +${e.value}`).join(', ');
    }
}

// ============================================================================
// HTML Parsing Functions
// ============================================================================

/**
 * Extract adversary data from a stat block element
 * Based on the actual stat block structure shown in the image
 */
function extractAdversaryData($, element) {
    const adversary = {
        Name: '',
        Tier: null,
        Type: '',
        Difficulty: null,
        Major_Threshold: null,
        Severe_Threshold: null,
        HP: null,
        Stress: null,
        Attack_Modifier: null,
        Attack_Range: '',
        Damage_Dice: '',
        Experiences: '',
        Features: '',
        Description: '',
        Motives_Tactics: ''
    };
    
    try {
        const text = $(element).text();
        const html = $(element).html() || '';
        
        // Extract name - look for it in various places
        // Try heading first
        const nameElement = $(element).find('h2, h3, h4, h5, h6, dt').first();
        if (nameElement.length > 0) {
            let nameText = extractText($, nameElement);
            // Remove PAGE references and clean up
            nameText = nameText.replace(/\s+PAGE\s+\d+.*$/i, '').trim();
            nameText = nameText.replace(/\s+Tier\s+\d+.*$/i, '').trim();
            if (nameText && nameText.length > 0 && nameText.length < 100) {
                adversary.Name = nameText;
            }
        }
        
        // If no name found, try text patterns
        if (!adversary.Name) {
            // Pattern: All caps name at start
            const nameMatch = text.match(/^([A-Z][A-Z\s\-:]+?)(?:\s+PAGE\s+\d+|\s+Tier|\s*$)/m);
            if (nameMatch) {
                adversary.Name = nameMatch[1].trim();
            } else {
                // Try first line that looks like a name
                const firstLine = text.split('\n')[0].trim();
                if (firstLine && firstLine.length > 3 && firstLine.length < 100 &&
                    !firstLine.match(/^(PAGE|Tier|Difficulty|HP|Stress|ATK|FEATURES|Experience|Adversary)/i)) {
                    adversary.Name = firstLine.replace(/\s+PAGE\s+\d+.*$/i, '').trim();
                }
            }
        }
        
        // The text appears to be concatenated, so we need to parse it carefully
        // Structure seems to be: Name, Motives, Stats (Difficulty, Thresholds, HP, Stress, ATK), Attack info, Experience, Features
        
        // Extract tier and type (e.g., "Tier 2 Minion" or "Tier 4 Leader")
        const tierTypeMatch = text.match(/Tier\s+(\d+)\s+(\w+)/i);
        if (tierTypeMatch) {
            adversary.Tier = parseInt(tierTypeMatch[1], 10);
            // Clean type - known valid types: Bruiser, Horde, Leader, Minion, Ranged, Skulk, Solo, Social, Standard, Support
            const validTypes = ['Bruiser', 'Horde', 'Leader', 'Minion', 'Ranged', 'Skulk', 'Solo', 'Social', 'Standard', 'Support'];
            let type = tierTypeMatch[2];
            
            // Try to match against valid types (case-insensitive)
            let matchedType = null;
            for (const validType of validTypes) {
                // Check if type starts with a valid type name
                if (type.toLowerCase().startsWith(validType.toLowerCase())) {
                    matchedType = validType;
                    break;
                }
            }
            
            if (matchedType) {
                adversary.Type = matchedType;
            } else {
                // Fallback: remove trailing capital letters that don't belong
                // Pattern: remove trailing capital letter(s) that are appended
                type = type.replace(/^([A-Z][a-z]+)([A-Z][a-z]*)*$/, '$1');
                // Also remove any trailing non-word characters
                type = type.replace(/[^A-Za-z].*$/, '');
                adversary.Type = type;
            }
        }
        
        // Split text into sections - look for key markers
        // Pattern: Motives come first, then stats, then Experience, then Features
        
        // Extract motives and tactics (usually at the start, before stats)
        // Format: "Motives: text" or just comma-separated list at start
        const motivesMatch = text.match(/(?:Motives[^:]*:\s*)?([^D]*?)(?=Difficulty|Tier|$)/i);
        if (motivesMatch && motivesMatch[1]) {
            const motivesText = motivesMatch[1].trim();
            // Check if it looks like motives (comma-separated actions)
            if (motivesText.length > 5 && motivesText.length < 200 && 
                (motivesText.includes(',') || motivesText.split(' ').length < 15)) {
                adversary.Motives_Tactics = motivesText;
            }
        }
        
        // Extract description - look for first sentence that's not stats
        // Usually comes before motives or after name
        const descPatterns = [
            /(?:PAGE\s+\d+[^\n]*\n)?([A-Z][^.]*\.)(?=\s+Motives|$)/,
            /^([A-Z][^D]*?)(?=Difficulty|Tier|Motives)/m
        ];
        for (const pattern of descPatterns) {
            const descMatch = text.match(pattern);
            if (descMatch && descMatch[1] && 
                !descMatch[1].includes('Tier') && 
                !descMatch[1].includes('Difficulty') &&
                !descMatch[1].includes('HP') &&
                descMatch[1].length > 10 && descMatch[1].length < 200) {
                adversary.Description = descMatch[1].trim();
                break;
            }
        }
        
        // Extract Difficulty (look for "Difficulty: X")
        const difficultyMatch = text.match(/Difficulty[:\s]*(\d+)/i);
        if (difficultyMatch) {
            adversary.Difficulty = parseInt(difficultyMatch[1], 10);
        }
        
        // Extract thresholds (e.g., "Thresholds: 33/66" or "33/66")
        // Minions have no thresholds, so skip extraction if this is a minion
        if (adversary.Type && adversary.Type.toLowerCase() !== 'minion') {
            const thresholdMatch = text.match(/Thresholds?[:\s]*(\d+)\s*\/\s*(\d+)/i);
            if (thresholdMatch) {
                adversary.Major_Threshold = parseInt(thresholdMatch[1], 10);
                adversary.Severe_Threshold = parseInt(thresholdMatch[2], 10);
            }
        } else {
            // Minions explicitly have no thresholds
            adversary.Major_Threshold = null;
            adversary.Severe_Threshold = null;
        }
        
        // Extract HP
        const hpMatch = text.match(/HP[:\s]*(\d+)/i);
        if (hpMatch) {
            adversary.HP = parseInt(hpMatch[1], 10);
        }
        
        // Extract Stress
        const stressMatch = text.match(/Stress[:\s]*(\d+)/i);
        if (stressMatch) {
            adversary.Stress = parseInt(stressMatch[1], 10);
        }
        
        // Extract Attack information (ATK, Attack Name, Range, Damage)
        const atkMatch = text.match(/ATK[:\s]*([+-]?\d+)/i);
        if (atkMatch) {
            adversary.Attack_Modifier = parseInt(atkMatch[1], 10);
        }
        
        // Extract attack name, range, and damage
        // Look for attack info after ATK line
        // Format: "Necrotic Blast Far 4d12+8 mag" (dice notation for non-minions) or "10 phy" (exact for minions)
        // The attack info is usually on the same line or next line after ATK
        const isMinion = adversary.Type && adversary.Type.toLowerCase() === 'minion';
        const atkIndex = text.search(/ATK[:\s]*[+-]?\d+/i);
        
        if (atkIndex >= 0) {
            // Get text after ATK line (next 300 characters should contain attack info)
            const afterAtk = text.substring(atkIndex, atkIndex + 300);
            
            if (isMinion) {
                // For minions: accept simple numeric damage (e.g., "10 phy", "4 phy")
                const minionPatterns = [
                    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)[:\s]+(Melee|Very Close|Close|Far|Very Far)\s+(\d+\s+(?:phy|mag|physical|magic|direct))/,
                    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)\s+(Melee|Very Close|Close|Far|Very Far)\s+(\d+\s+(?:phy|mag|physical|magic|direct))/,
                    /(Melee|Very Close|Close|Far|Very Far)\s+(\d+\s+(?:phy|mag|physical|magic|direct))/
                ];
                
                for (const pattern of minionPatterns) {
                    const match = afterAtk.match(pattern);
                    if (match) {
                        if (match.length === 3 && ['Melee', 'Very Close', 'Close', 'Far', 'Very Far'].includes(match[1])) {
                            adversary.Attack_Range = match[1];
                            adversary.Damage_Dice = match[2].trim();
                            break;
                        } else if (match.length >= 4 && !match[1].match(/^(Difficulty|Threshold|HP|Stress|ATK|Experience|Features|Tier)/i)) {
                            adversary.Attack_Range = match[2];
                            adversary.Damage_Dice = match[3].trim();
                            break;
                        }
                    }
                }
            } else {
                // For non-minions: ONLY accept dice notation (e.g., "4d12+8 mag", "1d6+2 phy")
                // Reject simple numeric damage
                const dicePatterns = [
                    // Pattern 1: "AttackName: Range Damage" (e.g., "Necrotic Blast: Far 4d12+8 mag")
                    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)[:\s]+(Melee|Very Close|Close|Far|Very Far)\s+(\d+d\d+(?:\+\d+)?(?:\s+(?:phy|mag|physical|magic|direct))?)/,
                    // Pattern 2: "AttackName Range Damage" (e.g., "Necrotic Blast Far 4d12+8 mag")
                    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)\s+(Melee|Very Close|Close|Far|Very Far)\s+(\d+d\d+(?:\+\d+)?(?:\s+(?:phy|mag|physical|magic|direct))?)/,
                    // Pattern 3: "Range Damage" without attack name (e.g., "Far 4d8+6 mag")
                    /(Melee|Very Close|Close|Far|Very Far)\s+(\d+d\d+(?:\+\d+)?(?:\s+(?:phy|mag|physical|magic|direct))?)/
                ];
                
                let found = false;
                for (const pattern of dicePatterns) {
                    const match = afterAtk.match(pattern);
                    if (match) {
                        // Check if this is pattern 3 (no attack name)
                        if (match.length === 3 && ['Melee', 'Very Close', 'Close', 'Far', 'Very Far'].includes(match[1])) {
                            const damage = match[2].trim();
                            // Must be dice notation (contains "d")
                            if (damage.match(/\d+d\d+/)) {
                                adversary.Attack_Range = match[1];
                                adversary.Damage_Dice = damage;
                                found = true;
                                break;
                            }
                        } else if (match.length >= 4 && !match[1].match(/^(Difficulty|Threshold|HP|Stress|ATK|Experience|Features|Tier)/i)) {
                            const damage = match[3].trim();
                            // Must be dice notation
                            if (damage.match(/\d+d\d+/)) {
                                adversary.Attack_Range = match[2];
                                adversary.Damage_Dice = damage;
                                found = true;
                                break;
                            }
                        }
                    }
                }
                
                // If not found in ATK section, search entire text for dice notation
                if (!found) {
                    const textDicePatterns = [
                        /(Melee|Very Close|Close|Far|Very Far)\s+(\d+d\d+(?:\+\d+)?(?:\s+(?:phy|mag|physical|magic|direct))?)/i,
                        /(\d+d\d+(?:\+\d+)?\s+(?:phy|mag|physical|magic|direct))/i
                    ];
                    
                    for (const pattern of textDicePatterns) {
                        const match = text.match(pattern);
                        if (match) {
                            const damage = match[match.length - 1].trim();
                            if (damage.match(/\d+d\d+/)) {
                                if (match.length >= 3 && ['Melee', 'Very Close', 'Close', 'Far', 'Very Far'].includes(match[1])) {
                                    adversary.Attack_Range = match[1];
                                }
                                adversary.Damage_Dice = damage;
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        // Fallback for minions: search entire text for simple numeric damage
        if (isMinion && (!adversary.Damage_Dice || adversary.Damage_Dice.match(/\d+\s*[–-]\s*\d+/))) {
            const minionFallbackPatterns = [
                /(Melee|Very Close|Close|Far|Very Far)\s+(\d+\s+(?:phy|mag|physical|magic|direct))/i,
                /(\d+\s+(?:phy|mag|physical|magic|direct))/i
            ];
            
            for (const pattern of minionFallbackPatterns) {
                const match = text.match(pattern);
                if (match) {
                    const damage = match[match.length - 1].trim();
                    if (!damage.match(/\d+\s*[–-]\s*\d+/) && damage.match(/^\d+\s+(?:phy|mag|physical|magic|direct)/)) {
                        if (match.length >= 3 && ['Melee', 'Very Close', 'Close', 'Far', 'Very Far'].includes(match[1])) {
                            adversary.Attack_Range = match[1];
                        }
                        adversary.Damage_Dice = damage;
                        break;
                    }
                }
            }
        }
        
        // Extract Experiences (e.g., "Intrusion +2" or "Forbidden Knowledge +3")
        const experiences = [];
        
        // Look for "Experience:" section (may be singular or plural)
        // Format: "Experience: Name +2, Name +3" or "Experience: Name +2\nName +3"
        const expSectionMatch = text.match(/Experience[s]?[:\s]*([\s\S]*?)(?=Features|FEATURES|$)/i);
        if (expSectionMatch) {
            const expText = expSectionMatch[1];
            // Match experience patterns: "Name +2" or "Name +3"
            // Can be comma-separated or newline-separated
            const expMatches = expText.matchAll(/([A-Z][A-Za-z\s]+?)\s*\+(\d+)/g);
            for (const match of expMatches) {
                const expName = match[1].trim().replace(/[,;]$/, '');
                // Skip if it looks like damage dice or is too short
                if (!expName.match(/^\d+d\d+/) && 
                    expName.length > 2 && expName.length < 50 &&
                    !expName.match(/^(ATK|HP|Stress|Difficulty|Tier|Major|Severe|Threshold)/i)) {
                    experiences.push({
                        name: expName,
                        value: parseInt(match[2], 10)
                    });
                }
            }
        }
        
        adversary.Experiences = formatExperiences(experiences);
        
        // Extract Features section
        const features = [];
        // Look for "Features" or "FEATURES" section - it's usually at the end
        const featuresSection = text.match(/(?:FEATURES|Features)[:\s]*([\s\S]*?)$/i);
        if (featuresSection) {
            const featuresText = featuresSection[1];
            
            // First, find all features with the dash+type pattern (e.g., "Overcharge—Reaction:")
            const featureRegex = /([A-Z][A-Za-z\s]+?)\s*[—–-]\s*(Passive|Action|Reaction|Fear)[:\s]*([\s\S]*?)(?=(?:\n\s*|\.\s+)[A-Z][A-Za-z\s]{3,}\s*[—–-]\s*(?:Passive|Action|Reaction|Fear)[:\s]|$)/g;
            const featureMatches = [];
            let match;
            
            while ((match = featureRegex.exec(featuresText)) !== null) {
                featureMatches.push({
                    name: match[1].trim(),
                    type: match[2].trim(),
                    description: match[3].trim(),
                    index: match.index,
                    fullMatch: match[0]
                });
            }
            
            // If we found features with dash+type pattern, process them
            if (featureMatches.length > 0) {
                // Check if there's text before the first feature that should be extracted
                const firstFeatureIndex = featureMatches[0].index;
                if (firstFeatureIndex > 0) {
                    const beforeText = featuresText.substring(0, firstFeatureIndex).trim();
                    // Try to extract a feature name from the beginning
                    // Look for pattern like "FeatureName:" or just text that looks like a feature name
                    const firstFeatureMatch = beforeText.match(/^([A-Z][A-Za-z\s]{3,}?)(?::\s*|$)/);
                    if (firstFeatureMatch) {
                        const firstName = firstFeatureMatch[1].trim();
                        const firstDesc = beforeText.substring(firstFeatureMatch[0].length).trim();
                        if (firstName && firstDesc) {
                            features.push({
                                name: firstName,
                                description: cleanText(firstDesc)
                            });
                        }
                    }
                }
                
                // Process each feature match
                for (let i = 0; i < featureMatches.length; i++) {
                    const feat = featureMatches[i];
                    let description = feat.description;
                    
                    // If this isn't the last feature, trim description up to the next feature
                    if (i < featureMatches.length - 1) {
                        const nextIndex = featureMatches[i + 1].index;
                        const currentEnd = feat.index + feat.fullMatch.length;
                        if (nextIndex > currentEnd) {
                            // There's text between features, include it in this feature's description
                            description = featuresText.substring(feat.index + feat.fullMatch.length - description.length, nextIndex).trim();
                        }
                    }
                    
                    // Clean up description
                    description = description.replace(/^([A-Z][A-Za-z\s]+?)\s*[—–-].*$/, '').trim();
                    description = description.replace(/([A-Z][A-Za-z\s]+?)[,\.]\s*$/, '').trim();
                    
                    if (feat.name && feat.name.length < 100 && feat.name.length > 2 && description) {
                        features.push({
                            name: feat.name,
                            description: cleanText(description)
                        });
                    }
                }
            } else {
                // No features with dash+type pattern found, try without type requirement
                const simpleRegex = /([A-Z][A-Za-z\s]+?)\s*[—–-]\s*([\s\S]*?)(?=(?:\n\s*|\.\s+)[A-Z][A-Za-z\s]{3,}\s*[—–-]|$)/g;
                let simpleMatch;
                while ((simpleMatch = simpleRegex.exec(featuresText)) !== null) {
                    const featureName = simpleMatch[1].trim();
                    let description = simpleMatch[2].trim();
                    // Remove type words if they appear at start
                    description = description.replace(/^(Passive|Action|Reaction|Fear)[:\s]*/i, '').trim();
                    if (featureName && featureName.length < 100 && featureName.length > 2 && description) {
                        features.push({
                            name: featureName,
                            description: cleanText(description)
                        });
                    }
                }
            }
            
            // Post-process: Check if any feature descriptions contain other features and split them
            // This handles cases where features are concatenated within a description
            const finalFeatures = [];
            for (const feature of features) {
                const desc = feature.description;
                // Look for feature patterns within the description (FeatureName—Type: Description)
                const nestedFeatureRegex = /([A-Z][A-Za-z\s]{3,}?)\s*[—–-]\s*(Passive|Action|Reaction|Fear)[:\s]*([^—–-]*?)(?=([A-Z][A-Za-z\s]{3,}?)\s*[—–-]\s*(?:Passive|Action|Reaction|Fear)[:\s]|$)/g;
                const nestedMatches = [];
                let nestedMatch;
                
                while ((nestedMatch = nestedFeatureRegex.exec(desc)) !== null) {
                    nestedMatches.push({
                        name: nestedMatch[1].trim(),
                        description: nestedMatch[3].trim().replace(/^(Passive|Action|Reaction|Fear)[:\s]*/i, '').trim(),
                        index: nestedMatch.index,
                        fullMatch: nestedMatch[0]
                    });
                }
                
                if (nestedMatches.length > 0) {
                    // Split the feature - extract text before first nested feature
                    const beforeText = desc.substring(0, nestedMatches[0].index).trim();
                    if (beforeText) {
                        finalFeatures.push({
                            name: feature.name,
                            description: cleanText(beforeText)
                        });
                    }
                    
                    // Add nested features
                    for (let i = 0; i < nestedMatches.length; i++) {
                        const nested = nestedMatches[i];
                        let nestedDesc = nested.description;
                        
                        // Get text up to next nested feature or end
                        if (i < nestedMatches.length - 1) {
                            const nextIndex = nestedMatches[i + 1].index;
                            nestedDesc = desc.substring(nested.index + nested.fullMatch.length - nested.description.length, nextIndex).trim();
                            nestedDesc = nestedDesc.replace(/^([A-Z][A-Za-z\s]+?)\s*[—–-].*$/, '').trim();
                        }
                        
                        if (nested.name && nested.name.length < 100 && nestedDesc) {
                            finalFeatures.push({
                                name: nested.name,
                                description: cleanText(nestedDesc)
                            });
                        }
                    }
                } else {
                    // No nested features, keep as-is
                    finalFeatures.push(feature);
                }
            }
            
            // Replace features array contents
            features.length = 0;
            features.push(...finalFeatures);
        }
        adversary.Features = formatFeatures(features);
        
    } catch (error) {
        console.warn(`Error extracting data for ${adversary.Name || 'unknown'}:`, error.message);
    }
    
    return adversary;
}

/**
 * Find all adversary stat blocks in the HTML
 */
function findAdversaryBlocks($) {
    const adversaries = [];
    const seenNames = new Set();
    
    // Strategy 1: Extract from the main adversary listing table
    // This table has: Name (with link), Tier, Type, and Features
    $('table').each((i, table) => {
        const caption = $(table).find('caption').text();
        // Look for the adversary stat blocks listing table
        if (caption.includes('Adversary') || caption.includes('adversary')) {
            $(table).find('tbody tr').each((j, row) => {
                const cells = $(row).find('td, th');
                if (cells.length >= 3) {
                    const adversary = {
                        Name: '',
                        Tier: null,
                        Type: '',
                        Difficulty: null,
                        Major_Threshold: null,
                        Severe_Threshold: null,
                        HP: null,
                        Stress: null,
                        Attack_Modifier: null,
                        Attack_Range: '',
                        Damage_Dice: '',
                        Experiences: '',
                        Features: '',
                        Description: '',
                        Motives_Tactics: ''
                    };
                    
                    // Extract name from first cell (usually a th with a link)
                    const nameCell = $(cells[0]);
                    const nameLink = nameCell.find('a');
                    if (nameLink.length > 0) {
                        adversary.Name = nameLink.text().trim();
                    } else {
                        adversary.Name = nameCell.text().trim();
                    }
                    
                    // Skip if no name, already seen, or looks like a header/benchmark row
                    if (!adversary.Name || 
                        seenNames.has(adversary.Name) ||
                        adversary.Name.match(/^(Number|Bonus|Experiences|Hit Points|Type|Tier|Difficulty|Major|Severe|HP|Stress|Attack|Damage|Name|Adversary|Benchmark|Guidelines|Adversaries with|Example)$/i) ||
                        adversary.Name.includes('Benchmarks') ||
                        adversary.Name.includes('with ') ||
                        adversary.Name.length > 100) {
                        return;
                    }
                    seenNames.add(adversary.Name);
                    
                    // Extract tier from second cell
                    const tierText = $(cells[1]).text().trim();
                    adversary.Tier = extractTier(tierText) || extractNumber(tierText);
                    
                    // Extract type from third cell
                    const typeLink = $(cells[2]).find('a');
                    if (typeLink.length > 0) {
                        adversary.Type = typeLink.text().trim();
                    } else {
                        adversary.Type = $(cells[2]).text().trim();
                    }
                    
                    // Extract features from fourth cell (if present)
                    if (cells.length >= 4) {
                        const features = [];
                        $(cells[3]).find('li').each((k, li) => {
                            const featureName = $(li).text().trim();
                            if (featureName) {
                                features.push({
                                    name: featureName,
                                    description: ''
                                });
                            }
                        });
                        adversary.Features = formatFeatures(features);
                    }
                    
                    // Try to find full stat block for this adversary
                    const adversaryId = nameLink.attr('href')?.replace('#', '');
                    if (adversaryId) {
                        const statBlock = $(`#${adversaryId}`);
                        if (statBlock.length > 0) {
                            // Extract additional data from the stat block
                            const fullData = extractAdversaryData($, statBlock);
                            // Merge the data
                            Object.assign(adversary, fullData);
                        }
                    }
                    
                    adversaries.push(adversary);
                }
            });
        }
    });
    
    // Strategy 2: Look for definition sections with full stat blocks
    $('[id^="define-adversary-"]').each((i, el) => {
        const id = $(el).attr('id');
        if (id && !id.includes('benchmark') && !id.includes('type') && !id.includes('action') && !id.includes('feature')) {
            const adversary = extractAdversaryData($, el);
            if (adversary.Name && !seenNames.has(adversary.Name)) {
                seenNames.add(adversary.Name);
                adversaries.push(adversary);
            }
        }
    });
    
    return adversaries;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
    console.log('Launching headless browser...');
    
    let browser;
    try {
        // Launch Puppeteer browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set a longer timeout for page load
        await page.setDefaultTimeout(60000);
        
        console.log('Navigating to webpage...');
        await page.goto(WEBPAGE_URL, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        // Wait a bit for any dynamic content to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Scroll to the adversary stat blocks section
        try {
            await page.evaluate(() => {
                const target = document.querySelector('#adversary-stat-blocks-listings, [id*="adversary-stat"]');
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {
            console.log('Note: Could not scroll to stat blocks section');
        }
        
        // Wait for stat blocks to be visible
        try {
            await page.waitForSelector('[id^="define-adversary-"]', { timeout: 10000 });
        } catch (e) {
            console.log('Note: Adversary definition selectors not found, continuing...');
        }
        
        console.log('Extracting stat blocks from DOM...');
        
        // Use Puppeteer to extract stat block data directly from the DOM
        const statBlocksData = await page.evaluate(() => {
            const blocks = [];
            
            // Find all elements with adversary IDs
            const adversaryElements = document.querySelectorAll('[id^="define-adversary-"]');
            
            adversaryElements.forEach((el) => {
                const id = el.id;
                // Skip benchmark, type, action, feature sections
                if (id.includes('benchmark') || id.includes('type') || 
                    id.includes('action') || id.includes('feature') || 
                    id.includes('passive') || id.includes('reaction') ||
                    id.includes('fear') || id.includes('list') ||
                    id.includes('hope') || id.includes('conditions')) {
                    return;
                }
                
                // Get the text content
                const text = el.textContent || el.innerText || '';
                
                // Extract structured data
                const block = {
                    id: id,
                    text: text,
                    html: el.innerHTML
                };
                
                blocks.push(block);
            });
            
            return blocks;
        });
        
        console.log(`Found ${statBlocksData.length} potential stat block elements`);
        
        // Also get full HTML for cheerio parsing
        console.log('Extracting full HTML...');
        const html = await page.content();
        
        if (!html || html.length === 0) {
            throw new Error('Received empty HTML response');
        }
        
        console.log(`Fetched ${html.length} characters of HTML`);
        
        // Parse HTML with cheerio
        const $ = cheerio.load(html);
        console.log('Parsing HTML for adversary stat blocks...');
        
        // Extract benchmark data first
        console.log('Extracting benchmark data...');
        const benchmarks = extractBenchmarks($);
        console.log(`Extracted benchmarks for ${Object.keys(benchmarks).length} types`);
        
        // Find all adversary blocks
        let adversaries = [];
        try {
            // First try extracting from the statBlocksData we got from Puppeteer
            if (statBlocksData && statBlocksData.length > 0) {
                for (const blockData of statBlocksData) {
                    // Create a temporary cheerio instance for this block
                    const block$ = cheerio.load(blockData.html);
                    const adversary = extractAdversaryData(block$, block$.root());
                    if (adversary.Name && adversary.Name.length > 0) {
                        adversaries.push(adversary);
                    }
                }
            }
            
            // Also try the original method as fallback
            const additionalAdversaries = findAdversaryBlocks($);
            // Merge, avoiding duplicates
            const seenNames = new Set(adversaries.map(a => a.Name));
            for (const adv of additionalAdversaries) {
                if (adv.Name && !seenNames.has(adv.Name)) {
                    adversaries.push(adv);
                    seenNames.add(adv.Name);
                }
            }
        } catch (parseError) {
            console.warn('Error during parsing:', parseError.message);
            // Save HTML for debugging
            fs.writeFileSync('debug.html', html);
            throw new Error(`Parsing failed: ${parseError.message}`);
        }
        
        console.log(`Found ${adversaries.length} adversaries`);
        
        // Apply benchmark data to fill in missing stats
        console.log('Applying benchmark data to fill missing stats...');
        adversaries = adversaries.map(adv => applyBenchmarks(adv, benchmarks));
        
        if (adversaries.length === 0) {
            console.warn('No adversaries found. The HTML structure may be different than expected.');
            console.log('Saving HTML to debug.html for inspection...');
            fs.writeFileSync('debug.html', html);
            throw new Error('No adversaries extracted. Check debug.html for HTML structure.');
        }
        
        // Filter out invalid entries
        const validAdversaries = adversaries.filter(a => {
            if (!a.Name || a.Name.length === 0 || a.Name.length > 100) return false;
            
            // Exclude section headers and non-adversary entries
            const nameLower = a.Name.toLowerCase();
            const excludePatterns = [
                /^(number|bonus|experiences|hit points|type|tier|difficulty|major|severe|hp|stress|attack|damage|name|adversary|benchmark|guidelines|example)$/i,
                /adversaries with/i,
                /adversaries.*/i,
                /applying conditions/i,
                /causing hope/i,
                /causing fear/i,
                /benchmarks/i
            ];
            
            for (const pattern of excludePatterns) {
                if (pattern.test(a.Name)) return false;
            }
            
            // Must have a tier to be valid
            if (!a.Tier) return false;
            
            return true;
        });
        
        if (validAdversaries.length === 0) {
            throw new Error('No valid adversaries found after filtering');
        }
        
        console.log(`Filtered to ${validAdversaries.length} valid adversaries`);
        
        // Convert to CSV
        console.log('Converting to CSV...');
        let csv;
        try {
            csv = Papa.unparse(validAdversaries, {
                header: true,
                skipEmptyLines: true,
                quotes: true,
                escapeFormulae: true
            });
        } catch (csvError) {
            throw new Error(`CSV conversion failed: ${csvError.message}`);
        }
        
        // Write to file
        try {
            fs.writeFileSync(OUTPUT_PATH, csv, 'utf8');
        } catch (writeError) {
            throw new Error(`Failed to write CSV file: ${writeError.message}`);
        }
        
        console.log(`Successfully wrote ${validAdversaries.length} adversaries to ${OUTPUT_PATH}`);
        
        // Print summary
        console.log('\nSummary:');
        console.log(`- Total adversaries: ${validAdversaries.length}`);
        console.log(`- With names: ${validAdversaries.filter(a => a.Name).length}`);
        console.log(`- With tiers: ${validAdversaries.filter(a => a.Tier).length}`);
        console.log(`- With types: ${validAdversaries.filter(a => a.Type).length}`);
        console.log(`- With difficulty: ${validAdversaries.filter(a => a.Difficulty).length}`);
        console.log(`- With HP: ${validAdversaries.filter(a => a.HP).length}`);
        console.log(`- With features: ${validAdversaries.filter(a => a.Features).length}`);
        
        if (validAdversaries.filter(a => a.Difficulty).length === 0) {
            console.warn('\nNote: Full stat blocks (Difficulty, HP, Stress, Attack) may not be available on this page.');
            console.warn('The extracted data includes names, tiers, types, and features from the listing table.');
        }
        
    } catch (error) {
        console.error('\nError:', error.message);
        if (error.stack && process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the script
main();
