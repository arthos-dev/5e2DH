// The SRD gives official adversaries no creature type. Guess one from the name and summary, in the same categories
// the 5e conversions use, so the bestiary filters treat both alike; "Daggerheart" when nothing fits.
// Order matters: an undead captain is Undead, a dragon knight is Humanoid.
const RULES = [
  ["Undead", /\b(ghastly|stonewraith|night children|severed shadow|zombie|skeleton|undead|vampire|specter|spectral|ghost|ghostly|wraith|phantom|shade|decaying|entombed|dullahan|poltergeist|banshee|corpse|lich|necromantic|soul of|souls of|cursed soul|masque muerte)\b/],
  ["Fiend", /\b(demonic|demon|fiend|circles below|hell)\b/],
  ["Celestial", /\b(celestial|hallowed|divine|unicorn|fallen god|fallen warlord|oracle of doom|harbinger)\b/],
  ["Humanoid", /\b(archmage|conscript|courtesan|noble|weaponmaster|priest|kneebreaker|gobstalker|beguiler|knight|guard|soldier|squire|archers?|bandit|thief|scoundrel|mercenary|courtier|merchant|advisor|monarch|sovereign|spy|pirate|wizard|mage|assassin|ruffian|laborer|cultist|cult|warrior|commander|sellsword|fighter|berserker|witch hunter|spellblade|hexer|lackey)\b/],
  ["Construct", /\b(construct|clockwork|mechanical|mechanorb|animated statue|gargoyle|suit of full plate|turret|battle box|waxwork|scarecrow|hut)\b/],
  ["Ooze", /\b(ooze|slime)\b/],
  ["Dragon", /\b(wyrmlings?|dragon|drake|wyvern|wyrmfiend)\b/],
  ["Elemental", /\b(elemental|living wave|mote of)\b/],
  ["Plant", /\b(treant|dryad|vegetable|bramble|tumbleweed|mushroom|fungi|sapling|tree-person)\b/],
  ["Giant", /\b(giant brawler|titan|goliath|ogre|troll|giant recruit|giant beastmaster)\b/],
  ["Fey", /\b(will-o'-the-wisps?|fey|redcap|hag|kelpie|siren|grimmling|jack-o'-lantern)\b/],
  ["Aberration", /\b(deep dweller|chaos skull|demiurge|extradimensional|transdimensional|outer realms|cephilith|deep dwellers|formless)\b/],
  ["Monstrosity", /\b(hydra|minotaur|gillbeast|rust eater|doppelhound|kraken|mawb|yufo|urco|manticore|gorgon|lamia|landshark|sandwyrm|ahuizotl|bugboar|fowlbear|mockery|burrower|flickerfly|rugaru|cipactli|owl witch|chimera|merfolk|cryptimoth|glass snake|viscera)\b/],
  ["Beast", /\b(elephant|elk|mosquitoes|scorpion|eels?|pangolati|lepus|insect|beetles?|bat|bats|wolf|bear|eagle|octopus|panther|rats?|rodents|spider|spiders|snake|serpent|turtle|crocodile|dinosaur|triceratops|plesiosaurus|lizard|roc|moth|shark|falcon|bird|horse|boar)\b/],
];

export function srdCategory(name, summary = "") {
  const text = `${name} ${summary}`.toLowerCase();
  return RULES.find(([, re]) => re.test(text))?.[0] ?? "Daggerheart";
}
