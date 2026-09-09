/* Pathfinder 1E Character Builder — core tables
   Sources: Pathfinder Roleplaying Game Core Rulebook (CRB), Advanced Player's Guide (APG).
   Mechanics reproduced as Open Game Content under the OGL v1.0a.
   Scope note: this tool targets character levels 1-7 (Riddle of Steel ladder 3 -> 7),
   so spell levels above 4 and feats gated above +6 BAB are intentionally out of scope. */
(function () {
  const PF = (window.PF = window.PF || {});
  const D = (PF.DATA = PF.DATA || {});

  /* ---------------------------------------------------------------- ABILITIES */
  D.ABILITIES = [
    { key: 'str', name: 'Strength',     abbr: 'STR' },
    { key: 'dex', name: 'Dexterity',    abbr: 'DEX' },
    { key: 'con', name: 'Constitution', abbr: 'CON' },
    { key: 'int', name: 'Intelligence', abbr: 'INT' },
    { key: 'wis', name: 'Wisdom',       abbr: 'WIS' },
    { key: 'cha', name: 'Charisma',     abbr: 'CHA' }
  ];

  /* Point buy cost table (CRB p.16). Purchase score -> points spent. */
  D.POINT_BUY_COST = { 7: -4, 8: -2, 9: -1, 10: 0, 11: 1, 12: 2, 13: 3, 14: 5, 15: 7, 16: 10, 17: 13, 18: 17 };
  D.POINT_BUY_BUDGETS = [
    { label: 'Low Fantasy', points: 10 },
    { label: 'Standard Fantasy', points: 15 },
    { label: 'High Fantasy', points: 20 },
    { label: 'Epic Fantasy', points: 25 }
  ];

  /* ---------------------------------------------------------------- SKILLS (CRB ch.4) */
  /* ab: key ability · tr: trained only · acp: armor check penalty applies */
  D.SKILLS = [
    { name: 'Acrobatics',       ab: 'dex', tr: false, acp: true  },
    { name: 'Appraise',         ab: 'int', tr: false, acp: false },
    { name: 'Bluff',            ab: 'cha', tr: false, acp: false },
    { name: 'Climb',            ab: 'str', tr: false, acp: true  },
    { name: 'Craft',            ab: 'int', tr: false, acp: false, sub: true },
    { name: 'Diplomacy',        ab: 'cha', tr: false, acp: false },
    { name: 'Disable Device',   ab: 'dex', tr: true,  acp: true  },
    { name: 'Disguise',         ab: 'cha', tr: false, acp: false },
    { name: 'Escape Artist',    ab: 'dex', tr: false, acp: true  },
    { name: 'Fly',              ab: 'dex', tr: false, acp: true  },
    { name: 'Handle Animal',    ab: 'cha', tr: true,  acp: false },
    { name: 'Heal',             ab: 'wis', tr: false, acp: false },
    { name: 'Intimidate',       ab: 'cha', tr: false, acp: false },
    { name: 'Knowledge (arcana)',       ab: 'int', tr: true, acp: false },
    { name: 'Knowledge (dungeoneering)',ab: 'int', tr: true, acp: false },
    { name: 'Knowledge (engineering)',  ab: 'int', tr: true, acp: false },
    { name: 'Knowledge (geography)',    ab: 'int', tr: true, acp: false },
    { name: 'Knowledge (history)',      ab: 'int', tr: true, acp: false },
    { name: 'Knowledge (local)',        ab: 'int', tr: true, acp: false },
    { name: 'Knowledge (nature)',       ab: 'int', tr: true, acp: false },
    { name: 'Knowledge (nobility)',     ab: 'int', tr: true, acp: false },
    { name: 'Knowledge (planes)',       ab: 'int', tr: true, acp: false },
    { name: 'Knowledge (religion)',     ab: 'int', tr: true, acp: false },
    { name: 'Linguistics',      ab: 'int', tr: true,  acp: false },
    { name: 'Perception',       ab: 'wis', tr: false, acp: false },
    { name: 'Perform',          ab: 'cha', tr: false, acp: false, sub: true },
    { name: 'Profession',       ab: 'wis', tr: true,  acp: false, sub: true },
    { name: 'Ride',             ab: 'dex', tr: false, acp: true  },
    { name: 'Sense Motive',     ab: 'wis', tr: false, acp: false },
    { name: 'Sleight of Hand',  ab: 'dex', tr: true,  acp: true  },
    { name: 'Spellcraft',       ab: 'int', tr: true,  acp: false },
    { name: 'Stealth',          ab: 'dex', tr: false, acp: true  },
    { name: 'Survival',         ab: 'wis', tr: false, acp: false },
    { name: 'Swim',             ab: 'str', tr: false, acp: true  },
    { name: 'Use Magic Device', ab: 'cha', tr: true,  acp: false }
  ];

  /* ---------------------------------------------------------------- RACES (CRB ch.2)
     HOUSE RULE (owner, locked): the Hyborian Age permits HUMANS ONLY. The other six Core races
     are deliberately absent, not hidden — there is no dropdown to unhide. What distinguishes one
     character from another here is Homeland (below), which is flavour, not mechanics. */
  D.RACES = [
    {
      name: 'Human', size: 'Medium', speed: 30,
      mods: { any: 2 },
      traits: [
        'Bonus Feat: one extra feat at 1st level.',
        'Skilled: one extra skill rank per level.',
        'Languages: Common plus any one (excluding secret languages).'
      ],
      bonusFeat: 1, bonusSkillPerLevel: 1
    }
  ];

  /* Hyborian homelands — flavour field carried over from the Two Snakes pregame. */
  D.HOMELANDS = [
    'Aquilonia', 'Argos', 'Brythunia', 'Cimmeria', 'Corinthia', 'Hyperborea', 'Hyrkania',
    'Iranistan', 'Keshan', 'Khitai', 'Koth', 'Kush', 'Nemedia', 'Ophir', 'Shem', 'Stygia',
    'Turan', 'Vanaheim', 'Vendhya', 'Zamora', 'Zingara', 'The Border Kingdom', 'The Pictish Wilderness'
  ];

  D.ALIGNMENTS = [
    'Lawful Good', 'Neutral Good', 'Chaotic Good',
    'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
    'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'
  ];

  D.SIZE_DATA = {
    Fine:       { ac:  8, cmb: -8, stealth: 16, carry: 0.125 },
    Diminutive: { ac:  4, cmb: -4, stealth: 12, carry: 0.25 },
    Tiny:       { ac:  2, cmb: -2, stealth:  8, carry: 0.5 },
    Small:      { ac:  1, cmb: -1, stealth:  4, carry: 0.75 },
    Medium:     { ac:  0, cmb:  0, stealth:  0, carry: 1 },
    Large:      { ac: -1, cmb:  1, stealth: -4, carry: 2 },
    Huge:       { ac: -2, cmb:  2, stealth: -8, carry: 4 }
  };

  /* Carrying capacity, light load, by Strength score (CRB p.171). Medium creature. */
  D.CARRY_LIGHT = {
    1: 3, 2: 6, 3: 10, 4: 13, 5: 16, 6: 20, 7: 23, 8: 26, 9: 30, 10: 33,
    11: 38, 12: 43, 13: 50, 14: 58, 15: 66, 16: 76, 17: 86, 18: 100, 19: 116, 20: 133,
    21: 153, 22: 173, 23: 200, 24: 233, 25: 266, 26: 306, 27: 346, 28: 400, 29: 466, 30: 532
  };

  /* XP thresholds — Medium advancement track (CRB p.30). */
  D.XP_MEDIUM = { 1: 0, 2: 2000, 3: 5000, 4: 9000, 5: 15000, 6: 23000, 7: 35000, 8: 51000 };

  /* Wealth by level (CRB p.399) — used for the "over budget" warning on the Items tab. */
  D.WEALTH_BY_LEVEL = { 1: 175, 2: 1000, 3: 3000, 4: 6000, 5: 10500, 6: 16000, 7: 23500, 8: 33000 };

  /* Encumbrance effects. */
  D.LOAD_EFFECTS = {
    light:  { maxDex: null, acp: 0,  speed30: 30, label: 'Light' },
    medium: { maxDex: 3,    acp: -3, speed30: 20, label: 'Medium' },
    heavy:  { maxDex: 1,    acp: -6, speed30: 20, label: 'Heavy' }
  };

  D.CONDITIONS = [
    'Bleed', 'Blinded', 'Confused', 'Dazed', 'Dazzled', 'Deafened', 'Entangled', 'Exhausted',
    'Fatigued', 'Frightened', 'Grappled', 'Nauseated', 'Panicked', 'Paralyzed', 'Prone',
    'Shaken', 'Sickened', 'Staggered', 'Stunned', 'Unconscious'
  ];
})();
