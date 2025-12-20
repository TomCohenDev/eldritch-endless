#!/usr/bin/env node

/**
 * Script to add thematic summaries to research encounter JSON
 * This adds a "thematicSummary" field to each Ancient One's research encounters
 */

const fs = require('fs');
const path = require('path');

// Thematic summaries for each Ancient One
const THEMATIC_SUMMARIES = {
  "Azathoth": "Research encounters for Azathoth reveal a terrifying landscape of cosmic insignificance and inevitable doom. Investigators frequently encounter radioactive green meteorites, parasitic insects known as the Shan that burrow into the brain to control minds, and the haunting, madness-inducing strains of the opera *Massa di Requiem per Shuggay*. Settings range from university observatories gazing fearfully into the abyss to craters glowing with sickening, extraterrestrial light. The Blind Idiot God's influence manifests through sudden madness, memory loss, and the corruption of natural laws, rigorously testing investigators' powers of observation and their willpower against alien intrusion. A pervasive sense of nihilism runs through these investigations, as the very fabric of reality unravels to the sound of daemonic piping at the center of the universe.",
  
  "Cthulhu": "Research encounters for Cthulhu reveal a watery nightmare of submerged cities and ancestral corruption. Investigators frequently encounter the amphibian Deep Ones, disturbing green stone idols, and the degenerate \"Innsmouth look\" plaguing coastal communities. Common settings include storm-tossed ships, isolated islands, and damp asylum cells where sensitive minds are tormented by dreams of R'lyeh. The High Priest's influence manifests through psychic dreams that erode sanity and the physical threat of being dragged beneath the waves, testing investigators' physical strength and mental fortitude. A pervasive sense of drowning—both literal and metaphorical—runs through these investigations, as the stars align to wake the sleeper and reclaim a world that was once his.",
  
  "Shub-Niggurath": "Research encounters for Shub-Niggurath reveal a visceral horror of rampant fertility and corrupted nature. Investigators frequently encounter wood-masked cultists, writhing Dark Young, and the mutating effects of the \"Milk of the Mother.\" Common settings include overgrown forests, blood-soaked altars in the wilderness, and museums housing profane fertility idols. The Black Goat's influence manifests through grotesque physical mutations and the primal urge to join the \"Thousand Young,\" testing investigators' observation skills in tracking beasts and their willpower to resist the call of the wild. A pervasive sense of biological dread runs through these investigations, as the natural world twists into a predatory force demanding blood and sacrifice.",
  
  "Yog-Sothoth": "Research encounters for Yog-Sothoth reveal a dizzying labyrinth of arcane secrets and fracturing reality. Investigators frequently encounter the machinations of the Silver Twilight Lodge, invisible monstrosities, and rifts in time and space that expose the past or future. Common settings include dust-choked libraries, ritual sites situated upon ley lines, and the mist-shrouded streets of Arkham. The Lurker at the Threshold's influence manifests through magical pacts, time distortion, and the dissolving of dimensional barriers, testing investigators' lore and intellect against forbidden knowledge. A pervasive sense of intellectual danger runs through these investigations, as the pursuit of power leads inevitably to the void between worlds where the One-in-All waits.",
  
  "Yig": "Research encounters for Yig reveal an atmosphere of creeping paranoia and biological corruption, where the line between humanity and reptile blurs with terrifying ease. Investigators frequently uncover the machinations of the Serpent People, an ancient race utilizing disguise, telepathy, and advanced science to infiltrate society. The Father of Serpents' influence manifests viscerally; victims suffer from venomous bites, horrifying physical transformations, and the insidious \"Curse of Yig.\" Investigations often necessitate delving into pre-human history—exploring the lost continent of Mu or the subterranean realm of K'n-yan—while navigating snake-filled pits and abandoned laboratories. A pervasive sense of mistrust saturates these endeavors, as trusted allies are revealed to be cold-blooded impostors, testing investigators' observation skills and physical fortitude against a venom that assaults both body and mind."
};

// Read the research encounters JSON
const inputPath = path.join(__dirname, 'scraped_encounters_filtered', 'research-encounter.json');
const outputPath = path.join(__dirname, 'scraped_encounters_filtered', 'research-encounter-with-summaries.json');

console.log('Reading research encounters from:', inputPath);
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Add thematic summaries to each Ancient One
let addedCount = 0;
for (const ancientOneName in data.ancient_ones) {
  if (THEMATIC_SUMMARIES[ancientOneName]) {
    data.ancient_ones[ancientOneName].thematicSummary = THEMATIC_SUMMARIES[ancientOneName];
    console.log(`✓ Added summary for ${ancientOneName}`);
    addedCount++;
  } else {
    console.log(`⚠ No summary found for ${ancientOneName}`);
  }
}

// Write the updated JSON
console.log(`\nWriting updated JSON to: ${outputPath}`);
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log(`\n✅ Done! Added ${addedCount} thematic summaries.`);
console.log(`Original file: ${inputPath}`);
console.log(`Updated file: ${outputPath}`);

