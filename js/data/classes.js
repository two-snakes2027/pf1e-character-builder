/* Pathfinder 1E Character Builder — class tables (CRB 11 + APG 6)
   Levels 1-7 only: the Riddle of Steel ladder tops out at 7, so no table here runs past it.

   bab:   'full' = level · 'threeq' = floor(3L/4) · 'half' = floor(L/2)
   saves: 'good' = 2 + floor(L/2) · 'poor' = floor(L/3)   (per-class, summed on multiclass)
   spd:   spells per day, [level] = {0:n,1:n,...}. Bonus slots from the casting ability are
          computed at runtime and are NOT baked in here.
   known: spells known, spontaneous casters only.
   verify:true  -> table entered from recall with lower confidence; the UI marks it for a
          book spot-check rather than silently presenting it as certain. No class carries it
          now; keep the mechanism for the next table added from memory.

   Provenance: on 2026-09-09 every casting class here was checked cell-for-cell against BOTH
   d20pfsrd.com and aonprd.com, which agreed throughout — spells/day, spells known, per-level
   BAB and saves, hit die, skill ranks, proficiencies and class skills. 29 cells were wrong and
   were corrected. `class_table_tests.js` pins the result; if you change a number here, that
   suite must be changed too, and only with a source in hand. The five non-casting classes
   (Barbarian, Fighter, Monk, Rogue, Cavalier) have NOT been checked against a source. */
(function () {
  const PF = (window.PF = window.PF || {});
  const D = (PF.DATA = PF.DATA || {});

  const KN = {
    all: ['Knowledge (arcana)', 'Knowledge (dungeoneering)', 'Knowledge (engineering)', 'Knowledge (geography)',
      'Knowledge (history)', 'Knowledge (local)', 'Knowledge (nature)', 'Knowledge (nobility)',
      'Knowledge (planes)', 'Knowledge (religion)']
  };

  D.CLASSES = [
    /* ----------------------------------------------------------------- BARBARIAN */
    {
      name: 'Barbarian', src: 'CRB', hd: 12, bab: 'full',
      saves: { fort: 'good', ref: 'poor', will: 'poor' }, skillRanks: 4,
      align: 'Any nonlawful.',
      classSkills: ['Acrobatics', 'Climb', 'Craft', 'Handle Animal', 'Intimidate', 'Knowledge (nature)',
        'Perception', 'Ride', 'Survival', 'Swim'],
      prof: { armor: ['light', 'medium', 'shields'], weapons: ['simple', 'martial'] },
      casting: null,
      features: [
        { lvl: 1, name: 'Fast Movement', text: '+10 ft. land speed in no/light/medium armor and no heavy load.' },
        { lvl: 1, name: 'Rage', text: 'Rage 4 + CON mod rounds/day, +2 more each level after 1st. While raging: +4 morale STR and CON, +2 morale Will saves, -2 AC.' },
        { lvl: 2, name: 'Rage Power', text: 'Choose a rage power; another at every even level.' },
        { lvl: 2, name: 'Uncanny Dodge', text: 'Retain DEX bonus to AC when flat-footed or against unseen attackers.' },
        { lvl: 3, name: 'Trap Sense +1', text: '+1 on Reflex saves and AC vs. traps. Improves at 6th.' },
        { lvl: 4, name: 'Rage Power', text: 'Second rage power.' },
        { lvl: 5, name: 'Improved Uncanny Dodge', text: 'Cannot be flanked by rogues of fewer than 4 levels above yours.' },
        { lvl: 6, name: 'Rage Power', text: 'Third rage power.' },
        { lvl: 6, name: 'Trap Sense +2', text: 'Trap sense improves to +2.' },
        { lvl: 7, name: 'Damage Reduction 1/—', text: 'DR 1/—, rising by 1 every three levels thereafter.' }
      ]
    },

    /* ----------------------------------------------------------------- BARD */
    {
      name: 'Bard', src: 'CRB', hd: 8, bab: 'threeq',
      saves: { fort: 'poor', ref: 'good', will: 'good' }, skillRanks: 6,
      align: 'Any.',
      classSkills: ['Acrobatics', 'Appraise', 'Bluff', 'Climb', 'Craft', 'Diplomacy', 'Disguise',
        'Escape Artist', 'Intimidate'].concat(KN.all).concat(['Linguistics', 'Perception', 'Perform',
        'Profession', 'Sense Motive', 'Sleight of Hand', 'Spellcraft', 'Stealth', 'Use Magic Device']),
      prof: { armor: ['light', 'shields'], weapons: ['simple', 'longsword', 'rapier', 'sap', 'shortbow', 'short sword', 'whip'] },
      casting: {
        type: 'spontaneous', ability: 'cha', list: 'bard', cantripsAtWill: true, maxSpellLvl: 3,
        spd: { 1: { 1: 1 }, 2: { 1: 2 }, 3: { 1: 3 }, 4: { 1: 3, 2: 1 }, 5: { 1: 4, 2: 2 }, 6: { 1: 4, 2: 3 }, 7: { 1: 4, 2: 3, 3: 1 } },
        known: { 1: { 0: 4, 1: 2 }, 2: { 0: 5, 1: 3 }, 3: { 0: 6, 1: 4 }, 4: { 0: 6, 1: 4, 2: 2 }, 5: { 0: 6, 1: 4, 2: 3 }, 6: { 0: 6, 1: 4, 2: 4 }, 7: { 0: 6, 1: 5, 2: 4, 3: 2 } }
      },
      features: [
        { lvl: 1, name: 'Bardic Knowledge', text: 'Add 1/2 bard level (min 1) to all Knowledge checks, and may make them untrained.' },
        { lvl: 1, name: 'Bardic Performance', text: '4 + CHA mod rounds/day, +2 per level after 1st. Known at 1st: countersong, distraction, fascinate, inspire courage +1.' },
        { lvl: 2, name: 'Versatile Performance', text: 'Use a Perform skill in place of two associated skills.' },
        { lvl: 2, name: 'Well-Versed', text: '+4 on saves vs. bardic performance, sonic and language-dependent effects.' },
        { lvl: 3, name: 'Inspire Competence +2', text: 'Performance grants an ally +2 on a skill check.' },
        { lvl: 5, name: 'Inspire Courage +2', text: 'Inspire courage bonus rises to +2.' },
        { lvl: 5, name: 'Lore Master', text: '1/day take 10 on any known Knowledge skill; 2/day at 11th.' },
        { lvl: 6, name: 'Suggestion', text: 'Performance can deliver a suggestion to a fascinated creature.' },
        { lvl: 6, name: 'Versatile Performance', text: 'Second versatile performance choice.' }
      ]
    },

    /* ----------------------------------------------------------------- CLERIC */
    {
      name: 'Cleric', src: 'CRB', hd: 8, bab: 'threeq',
      saves: { fort: 'good', ref: 'poor', will: 'good' }, skillRanks: 2,
      align: "Within one step of the deity's alignment.",
      classSkills: ['Appraise', 'Craft', 'Diplomacy', 'Heal', 'Knowledge (arcana)', 'Knowledge (history)',
        'Knowledge (nobility)', 'Knowledge (planes)', 'Knowledge (religion)', 'Linguistics', 'Profession',
        'Sense Motive', 'Spellcraft'],
      prof: { armor: ['light', 'medium', 'shields'], weapons: ['simple', "deity's favored weapon"] },
      casting: {
        type: 'prepared', ability: 'wis', list: 'cleric', domainSlot: true, maxSpellLvl: 4,
        spd: {
          1: { 0: 3, 1: 1 }, 2: { 0: 4, 1: 2 }, 3: { 0: 4, 1: 2, 2: 1 }, 4: { 0: 4, 1: 3, 2: 2 },
          5: { 0: 4, 1: 3, 2: 2, 3: 1 }, 6: { 0: 4, 1: 3, 2: 3, 3: 2 }, 7: { 0: 4, 1: 4, 2: 3, 3: 2, 4: 1 }
        }
      },
      features: [
        { lvl: 1, name: 'Aura', text: 'A cleric of a strongly aligned deity has a matching aura.' },
        { lvl: 1, name: 'Channel Energy', text: '3 + CHA mod times/day, 30-ft. burst. Good clerics channel positive energy (heal living / harm undead); evil channel negative. 1d6 at 1st, +1d6 every two levels.' },
        { lvl: 1, name: 'Domains', text: 'Two domains, each granting powers and one bonus spell per spell level.' },
        { lvl: 1, name: 'Orisons', text: '0-level spells, prepared but not expended when cast.' },
        { lvl: 1, name: 'Spontaneous Casting', text: 'Sacrifice a prepared spell to cast a cure (good) or inflict (evil) spell of that level.' }
      ]
    },

    /* ----------------------------------------------------------------- DRUID */
    {
      name: 'Druid', src: 'CRB', hd: 8, bab: 'threeq',
      saves: { fort: 'good', ref: 'poor', will: 'good' }, skillRanks: 4,
      align: 'Must be neutral on at least one axis.',
      classSkills: ['Climb', 'Craft', 'Fly', 'Handle Animal', 'Heal', 'Knowledge (geography)',
        'Knowledge (nature)', 'Perception', 'Profession', 'Ride', 'Spellcraft', 'Survival', 'Swim'],
      prof: { armor: ['light', 'medium (nonmetal)', 'shields (nonmetal)'], weapons: ['club', 'dagger', 'dart', 'quarterstaff', 'scimitar', 'sickle', 'shortspear', 'sling', 'spear'] },
      casting: {
        type: 'prepared', ability: 'wis', list: 'druid', maxSpellLvl: 4,
        spd: {
          1: { 0: 3, 1: 1 }, 2: { 0: 4, 1: 2 }, 3: { 0: 4, 1: 2, 2: 1 }, 4: { 0: 4, 1: 3, 2: 2 },
          5: { 0: 4, 1: 3, 2: 2, 3: 1 }, 6: { 0: 4, 1: 3, 2: 3, 3: 2 }, 7: { 0: 4, 1: 4, 2: 3, 3: 2, 4: 1 }
        }
      },
      features: [
        { lvl: 1, name: 'Nature Bond', text: 'Either an animal companion or a cleric domain.' },
        { lvl: 1, name: 'Nature Sense', text: '+2 on Knowledge (nature) and Survival.' },
        { lvl: 1, name: 'Wild Empathy', text: 'Improve an animal’s attitude: 1d20 + druid level + CHA mod.' },
        { lvl: 1, name: 'Orisons', text: '0-level spells, prepared but not expended when cast.' },
        { lvl: 2, name: 'Woodland Stride', text: 'Move through natural difficult terrain at normal speed.' },
        { lvl: 3, name: 'Trackless Step', text: 'Leave no trail in natural surroundings.' },
        { lvl: 4, name: 'Resist Nature’s Lure', text: '+4 on saves vs. the spell-like abilities of fey.' },
        { lvl: 4, name: 'Wild Shape (1/day)', text: 'Turn into a Small or Medium animal, as beast shape I.' },
        { lvl: 6, name: 'Wild Shape (2/day)', text: 'Also Large or Tiny animals, as beast shape II.' }
      ]
    },

    /* ----------------------------------------------------------------- FIGHTER */
    {
      name: 'Fighter', src: 'CRB', hd: 10, bab: 'full',
      saves: { fort: 'good', ref: 'poor', will: 'poor' }, skillRanks: 2,
      align: 'Any.',
      classSkills: ['Climb', 'Craft', 'Handle Animal', 'Intimidate', 'Knowledge (dungeoneering)',
        'Knowledge (engineering)', 'Profession', 'Ride', 'Survival', 'Swim'],
      prof: { armor: ['all', 'shields (incl. tower)'], weapons: ['simple', 'martial'] },
      casting: null,
      features: [
        { lvl: 1, name: 'Bonus Feat', text: 'A bonus combat feat, and another at every even level.' },
        { lvl: 2, name: 'Bonus Feat', text: 'Second bonus combat feat.' },
        { lvl: 2, name: 'Bravery +1', text: '+1 on Will saves vs. fear; +1 more every four levels.' },
        { lvl: 3, name: 'Armor Training 1', text: 'Armor check penalty reduced by 1, max DEX bonus increased by 1.' },
        { lvl: 4, name: 'Bonus Feat', text: 'Third bonus combat feat.' },
        { lvl: 5, name: 'Weapon Training 1', text: '+1 attack and damage with one weapon group.' },
        { lvl: 6, name: 'Bonus Feat', text: 'Fourth bonus combat feat.' },
        { lvl: 6, name: 'Bravery +2', text: 'Bravery improves to +2.' },
        { lvl: 7, name: 'Armor Training 2', text: 'Armor check penalty reduced by 2, max DEX increased by 2.' }
      ]
    },

    /* ----------------------------------------------------------------- MONK */
    {
      name: 'Monk', src: 'CRB', hd: 8, bab: 'threeq',
      saves: { fort: 'good', ref: 'good', will: 'good' }, skillRanks: 4,
      align: 'Any lawful.',
      classSkills: ['Acrobatics', 'Climb', 'Craft', 'Escape Artist', 'Intimidate', 'Knowledge (history)',
        'Knowledge (religion)', 'Perception', 'Perform', 'Profession', 'Ride', 'Sense Motive',
        'Stealth', 'Swim'],
      prof: { armor: [], weapons: ['club', 'crossbow (light/heavy)', 'dagger', 'handaxe', 'javelin', 'kama', 'nunchaku', 'quarterstaff', 'sai', 'shortspear', 'short sword', 'shuriken', 'siangham', 'sling', 'spear'] },
      casting: null,
      monk: { unarmed: { 1: '1d6', 4: '1d8' }, acBonus: { 1: 0, 4: 1 }, fastMove: { 1: 0, 3: 10, 6: 20 } },
      features: [
        { lvl: 1, name: 'Bonus Feat', text: 'Improved Grapple, Stunning Fist, or Dodge.' },
        { lvl: 1, name: 'Flurry of Blows', text: 'Full attack with extra attacks, as a two-weapon fighter with no penalty.' },
        { lvl: 1, name: 'Stunning Fist', text: 'Once per level per day, stun a struck foe (DC 10 + 1/2 level + WIS mod).' },
        { lvl: 1, name: 'Unarmed Strike', text: 'Improved Unarmed Strike; damage 1d6, rising to 1d8 at 4th.' },
        { lvl: 2, name: 'Bonus Feat', text: 'Combat Reflexes or Deflect Arrows.' },
        { lvl: 2, name: 'Evasion', text: 'No damage on a successful Reflex save for half.' },
        { lvl: 3, name: 'Fast Movement +10', text: 'Land speed increases while unarmored and unencumbered.' },
        { lvl: 3, name: 'Maneuver Training', text: 'Use monk level in place of BAB for CMB.' },
        { lvl: 3, name: 'Still Mind', text: '+2 on saves vs. enchantment.' },
        { lvl: 4, name: 'Ki Pool', text: '(1/2 level) + WIS mod points. Spend for an extra flurry attack, +20 ft. speed, or +4 dodge AC.' },
        { lvl: 4, name: 'Slow Fall 20 ft.', text: 'Treat a fall as shorter when within arm’s reach of a wall.' },
        { lvl: 5, name: 'High Jump', text: 'Add level to Acrobatics checks to jump; spend ki for +20.' },
        { lvl: 5, name: 'Purity of Body', text: 'Immune to all disease, including supernatural disease.' },
        { lvl: 6, name: 'Bonus Feat', text: 'Third monk bonus feat.' },
        { lvl: 6, name: 'Fast Movement +20', text: 'Land speed bonus improves.' },
        { lvl: 6, name: 'Slow Fall 30 ft.', text: 'Slow fall distance improves.' },
        { lvl: 7, name: 'Wholeness of Body', text: 'Spend 2 ki as a standard action to heal your monk level in hp.' }
      ]
    },

    /* ----------------------------------------------------------------- PALADIN */
    {
      name: 'Paladin', src: 'CRB', hd: 10, bab: 'full',
      saves: { fort: 'good', ref: 'poor', will: 'good' }, skillRanks: 2,
      align: 'Lawful Good only.',
      classSkills: ['Craft', 'Diplomacy', 'Handle Animal', 'Heal', 'Knowledge (nobility)',
        'Knowledge (religion)', 'Profession', 'Ride', 'Sense Motive', 'Spellcraft'],
      prof: { armor: ['all', 'shields (excl. tower)'], weapons: ['simple', 'martial'] },
      casting: {
        type: 'prepared', ability: 'cha', list: 'paladin', startLevel: 4, maxSpellLvl: 2,
        spd: { 4: { 1: 0 }, 5: { 1: 1 }, 6: { 1: 1 }, 7: { 1: 1, 2: 0 } }
      },
      features: [
        { lvl: 1, name: 'Aura of Good', text: 'Aura power equal to paladin level.' },
        { lvl: 1, name: 'Detect Evil', text: 'At will, as the spell; may concentrate on one target as a move action.' },
        { lvl: 1, name: 'Smite Evil 1/day', text: 'Add CHA to attack and paladin level to damage against an evil target. 2/day at 4th, 3/day at 7th.' },
        { lvl: 2, name: 'Divine Grace', text: 'Add CHA mod to all saving throws.' },
        { lvl: 2, name: 'Lay on Hands', text: '(1/2 level) + CHA mod times/day, heal 1d6 per two paladin levels.' },
        { lvl: 3, name: 'Aura of Courage', text: 'Immune to fear; allies within 10 ft. get +4 on fear saves.' },
        { lvl: 3, name: 'Divine Health', text: 'Immune to all diseases, including supernatural.' },
        { lvl: 3, name: 'Mercy', text: 'Lay on hands also removes a chosen condition. Another at 6th.' },
        { lvl: 4, name: 'Channel Positive Energy', text: 'Spend two uses of lay on hands to channel as a cleric of (level - 3).' },
        { lvl: 4, name: 'Smite Evil 2/day', text: 'Second daily smite.' },
        { lvl: 5, name: 'Divine Bond', text: 'Bond with a weapon (+1 enhancement, 1 min/level) or a mount.' },
        { lvl: 6, name: 'Mercy', text: 'Second mercy.' },
        { lvl: 7, name: 'Smite Evil 3/day', text: 'Third daily smite.' }
      ]
    },

    /* ----------------------------------------------------------------- RANGER */
    {
      name: 'Ranger', src: 'CRB', hd: 10, bab: 'full',
      saves: { fort: 'good', ref: 'good', will: 'poor' }, skillRanks: 6,
      align: 'Any.',
      classSkills: ['Climb', 'Craft', 'Handle Animal', 'Heal', 'Intimidate', 'Knowledge (dungeoneering)',
        'Knowledge (geography)', 'Knowledge (nature)', 'Perception', 'Profession', 'Ride',
        'Spellcraft', 'Stealth', 'Survival', 'Swim'],
      prof: { armor: ['light', 'medium', 'shields (excl. tower)'], weapons: ['simple', 'martial'] },
      casting: {
        type: 'prepared', ability: 'wis', list: 'ranger', startLevel: 4, maxSpellLvl: 2,
        spd: { 4: { 1: 0 }, 5: { 1: 1 }, 6: { 1: 1 }, 7: { 1: 1, 2: 0 } }
      },
      features: [
        { lvl: 1, name: 'Favored Enemy', text: '+2 bonus on Bluff, Knowledge, Perception, Sense Motive, Survival and damage against one creature type. A second at 5th; the bonus for one rises by 2.' },
        { lvl: 1, name: 'Track', text: 'Add 1/2 ranger level (min 1) to Survival checks to follow tracks.' },
        { lvl: 1, name: 'Wild Empathy', text: 'Improve an animal’s attitude: 1d20 + ranger level + CHA mod.' },
        { lvl: 2, name: 'Combat Style Feat', text: 'Archery or two-weapon combat; a bonus feat from that style, ignoring prerequisites.' },
        { lvl: 3, name: 'Endurance', text: 'Endurance as a bonus feat.' },
        { lvl: 3, name: 'Favored Terrain', text: '+2 on Initiative and on Knowledge (geography), Perception, Stealth and Survival in one terrain.' },
        { lvl: 4, name: 'Hunter’s Bond', text: 'Either an animal companion or the ability to grant allies your favored enemy bonus.' },
        { lvl: 5, name: 'Favored Enemy', text: 'Second favored enemy.' },
        { lvl: 6, name: 'Combat Style Feat', text: 'Second style feat.' },
        { lvl: 7, name: 'Woodland Stride', text: 'Move through natural difficult terrain at normal speed.' }
      ]
    },

    /* ----------------------------------------------------------------- ROGUE */
    {
      name: 'Rogue', src: 'CRB', hd: 8, bab: 'threeq',
      saves: { fort: 'poor', ref: 'good', will: 'poor' }, skillRanks: 8,
      align: 'Any.',
      classSkills: ['Acrobatics', 'Appraise', 'Bluff', 'Climb', 'Craft', 'Diplomacy', 'Disable Device',
        'Disguise', 'Escape Artist', 'Intimidate', 'Knowledge (dungeoneering)', 'Knowledge (local)',
        'Linguistics', 'Perception', 'Perform', 'Profession', 'Sense Motive', 'Sleight of Hand',
        'Stealth', 'Swim', 'Use Magic Device'],
      prof: { armor: ['light'], weapons: ['simple', 'hand crossbow', 'rapier', 'sap', 'shortbow', 'short sword'] },
      casting: null,
      features: [
        { lvl: 1, name: 'Sneak Attack +1d6', text: 'Extra damage when the target is denied DEX to AC or you flank. +1d6 every two levels.' },
        { lvl: 1, name: 'Trapfinding', text: '+1/2 level on Perception to find traps and Disable Device; may disarm magical traps.' },
        { lvl: 2, name: 'Evasion', text: 'No damage on a successful Reflex save for half.' },
        { lvl: 2, name: 'Rogue Talent', text: 'Choose a rogue talent; another at every even level.' },
        { lvl: 3, name: 'Sneak Attack +2d6', text: 'Sneak attack improves.' },
        { lvl: 3, name: 'Trap Sense +1', text: '+1 on Reflex saves and AC vs. traps.' },
        { lvl: 4, name: 'Rogue Talent', text: 'Second rogue talent.' },
        { lvl: 4, name: 'Uncanny Dodge', text: 'Retain DEX bonus to AC when flat-footed or against unseen attackers.' },
        { lvl: 5, name: 'Sneak Attack +3d6', text: 'Sneak attack improves.' },
        { lvl: 6, name: 'Rogue Talent', text: 'Third rogue talent.' },
        { lvl: 6, name: 'Trap Sense +2', text: 'Trap sense improves.' },
        { lvl: 7, name: 'Sneak Attack +4d6', text: 'Sneak attack improves.' }
      ]
    },

    /* ----------------------------------------------------------------- SORCERER */
    {
      name: 'Sorcerer', src: 'CRB', hd: 6, bab: 'half',
      saves: { fort: 'poor', ref: 'poor', will: 'good' }, skillRanks: 2,
      align: 'Any.',
      classSkills: ['Appraise', 'Bluff', 'Craft', 'Fly', 'Intimidate', 'Knowledge (arcana)',
        'Profession', 'Spellcraft', 'Use Magic Device'],
      prof: { armor: [], weapons: ['simple'] },
      casting: {
        type: 'spontaneous', ability: 'cha', list: 'arcane', cantripsAtWill: true, maxSpellLvl: 3,
        arcaneFailure: true,
        spd: { 1: { 1: 3 }, 2: { 1: 4 }, 3: { 1: 5 }, 4: { 1: 6, 2: 3 }, 5: { 1: 6, 2: 4 }, 6: { 1: 6, 2: 5, 3: 3 }, 7: { 1: 6, 2: 6, 3: 4 } },
        known: { 1: { 0: 4, 1: 2 }, 2: { 0: 5, 1: 2 }, 3: { 0: 5, 1: 3 }, 4: { 0: 6, 1: 3, 2: 1 }, 5: { 0: 6, 1: 4, 2: 2 }, 6: { 0: 7, 1: 4, 2: 2, 3: 1 }, 7: { 0: 7, 1: 5, 2: 3, 3: 2 } }
      },
      features: [
        { lvl: 1, name: 'Bloodline', text: 'Choose a bloodline; it grants bonus spells, bonus feats, class skills and powers.' },
        { lvl: 1, name: 'Bloodline Power', text: 'First bloodline power.' },
        { lvl: 1, name: 'Cantrips', text: '0-level spells known are cast at will.' },
        { lvl: 1, name: 'Eschew Materials', text: 'Cast without material components costing 1 gp or less.' },
        { lvl: 3, name: 'Bloodline Power', text: 'Second bloodline power.' },
        { lvl: 3, name: 'Bloodline Feat', text: 'A bonus feat from the bloodline list.' },
        { lvl: 7, name: 'Bloodline Feat', text: 'Second bloodline bonus feat.' }
      ]
    },

    /* ----------------------------------------------------------------- WIZARD */
    {
      name: 'Wizard', src: 'CRB', hd: 6, bab: 'half',
      saves: { fort: 'poor', ref: 'poor', will: 'good' }, skillRanks: 2,
      align: 'Any.',
      classSkills: ['Appraise', 'Craft', 'Fly'].concat(KN.all).concat(['Linguistics', 'Profession', 'Spellcraft']),
      prof: { armor: [], weapons: ['club', 'dagger', 'heavy crossbow', 'light crossbow', 'quarterstaff'] },
      casting: {
        type: 'prepared', ability: 'int', list: 'arcane', spellbook: true, maxSpellLvl: 4,
        arcaneFailure: true,
        spd: {
          1: { 0: 3, 1: 1 }, 2: { 0: 4, 1: 2 }, 3: { 0: 4, 1: 2, 2: 1 }, 4: { 0: 4, 1: 3, 2: 2 },
          5: { 0: 4, 1: 3, 2: 2, 3: 1 }, 6: { 0: 4, 1: 3, 2: 3, 3: 2 }, 7: { 0: 4, 1: 4, 2: 3, 3: 2, 4: 1 }
        }
      },
      features: [
        { lvl: 1, name: 'Arcane Bond', text: 'Bond with a familiar or an object (ring, amulet, staff, weapon).' },
        { lvl: 1, name: 'Arcane School', text: 'Choose a school (or universalist); grants powers and one bonus spell slot per level.' },
        { lvl: 1, name: 'Cantrips', text: 'Prepared 0-level spells are not expended when cast.' },
        { lvl: 1, name: 'Scribe Scroll', text: 'Scribe Scroll as a bonus feat.' },
        { lvl: 1, name: 'Spellbook', text: 'Begins with all cantrips plus three 1st-level spells per point of INT bonus; adds two spells per level gained.' },
        { lvl: 5, name: 'Bonus Feat', text: 'A metamagic, item creation, or Spell Mastery feat. Another every five levels.' }
      ]
    },

    /* ================================================== ADVANCED PLAYER'S GUIDE ============= */

    /* ----------------------------------------------------------------- ALCHEMIST */
    {
      name: 'Alchemist', src: 'APG', hd: 8, bab: 'threeq',
      saves: { fort: 'good', ref: 'good', will: 'poor' }, skillRanks: 4,
      align: 'Any.',
      classSkills: ['Appraise', 'Craft', 'Disable Device', 'Fly', 'Heal', 'Knowledge (arcana)',
        'Knowledge (nature)', 'Perception', 'Profession', 'Sleight of Hand', 'Spellcraft', 'Survival', 'Use Magic Device'],
      prof: { armor: ['light'], weapons: ['simple', 'bomb'] },
      casting: {
        type: 'prepared', ability: 'int', list: 'alchemist', extracts: true, maxSpellLvl: 3,
        spd: { 1: { 1: 1 }, 2: { 1: 2 }, 3: { 1: 3 }, 4: { 1: 3, 2: 1 }, 5: { 1: 4, 2: 2 }, 6: { 1: 4, 2: 3 }, 7: { 1: 4, 2: 3, 3: 1 } }
      },
      features: [
        { lvl: 1, name: 'Alchemy', text: 'Use Craft (alchemy) with a bonus equal to class level; identify potions as detect magic.' },
        { lvl: 1, name: 'Bomb', text: 'INT mod + class level bombs/day. 1d6 fire + INT mod, +1d6 every odd level. Splash = min damage + INT mod.' },
        { lvl: 1, name: 'Mutagen', text: 'Brew a mutagen: +4 natural armor and +4 to one physical ability, -2 to its mental pair, 10 min/level.' },
        { lvl: 1, name: 'Throw Anything', text: 'Throw Anything as a bonus feat; add INT mod to splash weapon damage.' },
        { lvl: 2, name: 'Discovery', text: 'Choose a discovery; another at every even level.' },
        { lvl: 2, name: 'Poison Resistance +2', text: '+2 on saves vs. poison, improving with level.' },
        { lvl: 2, name: 'Poison Use', text: 'Never risk poisoning yourself when applying poison to a blade.' },
        { lvl: 3, name: 'Swift Alchemy', text: 'Craft alchemical items in half the time; apply poison as a move action.' },
        { lvl: 4, name: 'Discovery', text: 'Second discovery.' },
        { lvl: 5, name: 'Poison Resistance +4', text: 'Improves to +4.' },
        { lvl: 6, name: 'Discovery', text: 'Third discovery.' },
        { lvl: 6, name: 'Swift Poisoning', text: 'Apply poison to a weapon as a swift action.' }
      ]
    },

    /* ----------------------------------------------------------------- CAVALIER */
    {
      name: 'Cavalier', src: 'APG', hd: 10, bab: 'full',
      saves: { fort: 'good', ref: 'poor', will: 'poor' }, skillRanks: 4,
      align: 'Any.',
      classSkills: ['Bluff', 'Climb', 'Craft', 'Diplomacy', 'Handle Animal', 'Intimidate',
        'Knowledge (nobility)', 'Profession', 'Ride', 'Sense Motive', 'Swim'],
      prof: { armor: ['light', 'medium', 'heavy', 'shields (excl. tower)'], weapons: ['simple', 'martial'] },
      casting: null,
      features: [
        { lvl: 1, name: 'Challenge', text: '1/day, +class level damage against one target, -2 AC against everyone else. +1/day every three levels.' },
        { lvl: 1, name: 'Mount', text: 'An animal companion that serves as a mount, using cavalier level as effective druid level.' },
        { lvl: 1, name: 'Order', text: 'Choose an order; grants class skills, an edict, and order abilities.' },
        { lvl: 1, name: 'Tactician', text: 'Gain a teamwork feat and grant it to allies within 30 ft. for 3 + CHA mod rounds, 1/day.' },
        { lvl: 2, name: 'Order Ability', text: 'First order ability.' },
        { lvl: 3, name: 'Cavalier’s Charge', text: '+4 on attack when charging (instead of +2), no AC penalty.' },
        { lvl: 4, name: 'Expert Trainer', text: 'Add 1/2 cavalier level to Handle Animal with your mount.' },
        { lvl: 4, name: 'Challenge 2/day', text: 'Second daily challenge.' },
        { lvl: 5, name: 'Banner', text: 'Allies within 60 ft. who can see it gain +2 on fear saves and +1 on charge attacks.' },
        { lvl: 6, name: 'Bonus Feat', text: 'A bonus feat; another every three levels.' },
        { lvl: 7, name: 'Challenge 3/day', text: 'Third daily challenge.' },
        { lvl: 7, name: 'Mighty Charge', text: 'Double threat range on a charge; free bull rush, disarm, sunder or trip without provoking.' }
      ]
    },

    /* ----------------------------------------------------------------- INQUISITOR */
    {
      name: 'Inquisitor', src: 'APG', hd: 8, bab: 'threeq',
      saves: { fort: 'good', ref: 'poor', will: 'good' }, skillRanks: 6,
      align: "Within one step of the deity's alignment.",
      classSkills: ['Bluff', 'Climb', 'Craft', 'Diplomacy', 'Disguise', 'Heal', 'Intimidate',
        'Knowledge (arcana)', 'Knowledge (dungeoneering)', 'Knowledge (nature)', 'Knowledge (planes)',
        'Knowledge (religion)', 'Perception', 'Profession', 'Ride', 'Sense Motive', 'Spellcraft',
        'Stealth', 'Survival', 'Swim'],
      prof: { armor: ['light', 'medium', 'shields (excl. tower)'], weapons: ['simple', 'hand crossbow', 'longbow', 'repeating crossbow', 'shortbow', "deity's favored weapon"] },
      casting: {
        type: 'spontaneous', ability: 'wis', list: 'inquisitor', cantripsAtWill: true, maxSpellLvl: 3,
        spd: { 1: { 1: 1 }, 2: { 1: 2 }, 3: { 1: 3 }, 4: { 1: 3, 2: 1 }, 5: { 1: 4, 2: 2 }, 6: { 1: 4, 2: 3 }, 7: { 1: 4, 2: 3, 3: 1 } },
        known: { 1: { 0: 4, 1: 2 }, 2: { 0: 5, 1: 3 }, 3: { 0: 6, 1: 4 }, 4: { 0: 6, 1: 4, 2: 2 }, 5: { 0: 6, 1: 4, 2: 3 }, 6: { 0: 6, 1: 4, 2: 4 }, 7: { 0: 6, 1: 5, 2: 4, 3: 2 } }
      },
      features: [
        { lvl: 1, name: 'Domain', text: 'One cleric domain (or an inquisition), granting its powers but not its bonus spells.' },
        { lvl: 1, name: 'Judgement', text: '1/day, a combat blessing (bonus to attack, AC, damage, DR, healing, etc.) lasting until combat ends. +1/day every three levels.' },
        { lvl: 1, name: 'Monster Lore', text: 'Add WIS mod to Knowledge checks to identify creatures.' },
        { lvl: 1, name: 'Orisons', text: '0-level spells cast at will.' },
        { lvl: 1, name: 'Stern Gaze', text: '+1/2 class level (min 1) on Intimidate and Sense Motive.' },
        { lvl: 2, name: 'Cunning Initiative', text: 'Add WIS mod to initiative in addition to DEX.' },
        { lvl: 2, name: 'Detect Alignment', text: 'At will, detect the alignment matching your deity.' },
        { lvl: 2, name: 'Track', text: 'Add 1/2 class level to Survival to follow tracks.' },
        { lvl: 3, name: 'Solo Tactics', text: 'Treat allies as having your teamwork feats for your own benefit.' },
        { lvl: 3, name: 'Teamwork Feat', text: 'A bonus teamwork feat; another every three levels.' },
        { lvl: 4, name: 'Judgement 2/day', text: 'Second daily judgement.' },
        { lvl: 5, name: 'Bane', text: 'Make a weapon bane against one creature type for class level rounds/day.' },
        { lvl: 5, name: 'Discern Lies', text: 'Class level rounds/day, as the spell.' },
        { lvl: 6, name: 'Teamwork Feat', text: 'Second bonus teamwork feat.' },
        { lvl: 7, name: 'Judgement 3/day', text: 'Third daily judgement.' }
      ]
    },

    /* ----------------------------------------------------------------- ORACLE */
    {
      name: 'Oracle', src: 'APG', hd: 8, bab: 'threeq',
      saves: { fort: 'poor', ref: 'poor', will: 'good' }, skillRanks: 4,
      align: 'Any.',
      classSkills: ['Craft', 'Diplomacy', 'Heal', 'Knowledge (history)', 'Knowledge (planes)',
        'Knowledge (religion)', 'Profession', 'Sense Motive', 'Spellcraft'],
      prof: { armor: ['light', 'medium', 'shields (excl. tower)'], weapons: ['simple'] },
      casting: {
        type: 'spontaneous', ability: 'cha', list: 'cleric', cantripsAtWill: true, maxSpellLvl: 3,
        spd: { 1: { 1: 3 }, 2: { 1: 4 }, 3: { 1: 5 }, 4: { 1: 6, 2: 3 }, 5: { 1: 6, 2: 4 }, 6: { 1: 6, 2: 5, 3: 3 }, 7: { 1: 6, 2: 6, 3: 4 } },
        known: { 1: { 0: 4, 1: 2 }, 2: { 0: 5, 1: 2 }, 3: { 0: 5, 1: 3 }, 4: { 0: 6, 1: 3, 2: 1 }, 5: { 0: 6, 1: 4, 2: 2 }, 6: { 0: 7, 1: 4, 2: 2, 3: 1 }, 7: { 0: 7, 1: 5, 2: 3, 3: 2 } }
      },
      features: [
        { lvl: 1, name: 'Mystery', text: 'Choose a mystery; it grants class skills, bonus spells and a revelation list.' },
        { lvl: 1, name: 'Oracle’s Curse', text: 'A permanent affliction that also grants benefits as you level.' },
        { lvl: 1, name: 'Revelation', text: 'A revelation from your mystery; more at 3rd and 7th.' },
        { lvl: 1, name: 'Orisons', text: '0-level spells cast at will.' },
        { lvl: 3, name: 'Revelation', text: 'Second revelation.' },
        { lvl: 7, name: 'Revelation', text: 'Third revelation.' }
      ]
    },

    /* ----------------------------------------------------------------- SUMMONER */
    {
      name: 'Summoner', src: 'APG', hd: 8, bab: 'threeq',
      saves: { fort: 'poor', ref: 'poor', will: 'good' }, skillRanks: 2,
      align: 'Any.',
      classSkills: ['Craft', 'Fly', 'Handle Animal'].concat(KN.all).concat(['Linguistics', 'Profession',
        'Ride', 'Spellcraft', 'Use Magic Device']),
      prof: { armor: ['light'], weapons: ['simple'] },
      casting: {
        type: 'spontaneous', ability: 'cha', list: 'summoner', cantripsAtWill: true, maxSpellLvl: 3,
        arcaneFailure: true,
        spd: { 1: { 1: 1 }, 2: { 1: 2 }, 3: { 1: 3 }, 4: { 1: 3, 2: 1 }, 5: { 1: 4, 2: 2 }, 6: { 1: 4, 2: 3 }, 7: { 1: 4, 2: 3, 3: 1 } },
        known: { 1: { 0: 4, 1: 2 }, 2: { 0: 5, 1: 3 }, 3: { 0: 6, 1: 4 }, 4: { 0: 6, 1: 4, 2: 2 }, 5: { 0: 6, 1: 4, 2: 3 }, 6: { 0: 6, 1: 4, 2: 4 }, 7: { 0: 6, 1: 5, 2: 4, 3: 2 } }
      },
      features: [
        { lvl: 1, name: 'Eidolon', text: 'An outsider bound to you, sharing your alignment. Its evolution pool and abilities scale with your level.' },
        { lvl: 1, name: 'Life Link', text: 'Sacrifice hp to keep the eidolon from being sent back; the bond breaks at long range.' },
        { lvl: 1, name: 'Summon Monster I', text: '(3 + CHA mod)/day, cast summon monster as a standard action, lasting min/level. Improves every two levels.' },
        { lvl: 2, name: 'Bond Senses', text: 'Share the eidolon’s senses for class level rounds/day.' },
        { lvl: 4, name: 'Shield Ally', text: '+2 AC and +2 on saves while adjacent to your eidolon.' },
        { lvl: 6, name: 'Maker’s Call', text: 'Call the eidolon to your side, as dimension door.' },
        { lvl: 7, name: 'Transposition', text: 'Use maker’s call to swap places with the eidolon.' }
      ]
    },

    /* ----------------------------------------------------------------- WITCH */
    {
      name: 'Witch', src: 'APG', hd: 6, bab: 'half',
      saves: { fort: 'poor', ref: 'poor', will: 'good' }, skillRanks: 2,
      align: 'Any.',
      classSkills: ['Craft', 'Fly', 'Heal', 'Intimidate', 'Knowledge (arcana)', 'Knowledge (history)',
        'Knowledge (nature)', 'Knowledge (planes)', 'Profession', 'Spellcraft', 'Use Magic Device'],
      prof: { armor: [], weapons: ['simple'] },
      casting: {
        type: 'prepared', ability: 'int', list: 'witch', familiarBook: true, maxSpellLvl: 4,
        arcaneFailure: true,
        spd: {
          1: { 0: 3, 1: 1 }, 2: { 0: 4, 1: 2 }, 3: { 0: 4, 1: 2, 2: 1 }, 4: { 0: 4, 1: 3, 2: 2 },
          5: { 0: 4, 1: 3, 2: 2, 3: 1 }, 6: { 0: 4, 1: 3, 2: 3, 3: 2 }, 7: { 0: 4, 1: 4, 2: 3, 3: 2, 4: 1 }
        }
      },
      features: [
        { lvl: 1, name: 'Familiar', text: 'A familiar that stores your spells — it is your spellbook. Losing it costs you your prepared list.' },
        { lvl: 1, name: 'Hex', text: 'Choose a hex; another at every even level.' },
        { lvl: 1, name: 'Cantrips', text: 'Prepared 0-level spells are not expended when cast.' },
        { lvl: 2, name: 'Hex', text: 'Second hex.' },
        { lvl: 4, name: 'Hex', text: 'Third hex.' },
        { lvl: 6, name: 'Hex', text: 'Fourth hex.' }
      ]
    }
  ];

  /* Index by name for O(1) lookup. */
  D.CLASS_BY_NAME = {};
  D.CLASSES.forEach(function (c) { D.CLASS_BY_NAME[c.name] = c; });
})();
