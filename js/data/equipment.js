/* Pathfinder 1E Character Builder — weapons, armor, gear, magic items (CRB ch.6 & ch.15)
   w: weight (lb) · c: cost (gp) · dmg: Medium damage · cr: threat range · cm: crit multiplier
   rng: range increment (ft, 0 = melee) · t: damage type · sp: special qualities */
(function () {
  const PF = (window.PF = window.PF || {});
  const D = (PF.DATA = PF.DATA || {});

  /* ---------------------------------------------------------------- WEAPONS */
  D.WEAPONS = [
    /* --- unarmed --- */
    { name: 'Unarmed strike', cat: 'unarmed', hand: 'light', c: 0, dmg: '1d3', cr: 20, cm: 2, rng: 0, w: 0, t: 'B', sp: ['nonlethal'] },

    /* --- simple, light --- */
    { name: 'Dagger', cat: 'simple', hand: 'light', c: 2, dmg: '1d4', cr: 19, cm: 2, rng: 10, w: 1, t: 'P or S', sp: ['finesse'] },
    { name: 'Dagger, punching', cat: 'simple', hand: 'light', c: 2, dmg: '1d4', cr: 20, cm: 3, rng: 0, w: 1, t: 'P', sp: ['finesse'] },
    { name: 'Gauntlet', cat: 'simple', hand: 'light', c: 2, dmg: '1d3', cr: 20, cm: 2, rng: 0, w: 1, t: 'B', sp: [] },
    { name: 'Gauntlet, spiked', cat: 'simple', hand: 'light', c: 5, dmg: '1d4', cr: 20, cm: 2, rng: 0, w: 1, t: 'P', sp: [] },
    { name: 'Mace, light', cat: 'simple', hand: 'light', c: 5, dmg: '1d6', cr: 20, cm: 2, rng: 0, w: 4, t: 'B', sp: [] },
    { name: 'Sickle', cat: 'simple', hand: 'light', c: 6, dmg: '1d6', cr: 20, cm: 2, rng: 0, w: 2, t: 'S', sp: ['trip'] },

    /* --- simple, one-handed --- */
    { name: 'Club', cat: 'simple', hand: 'one', c: 0, dmg: '1d6', cr: 20, cm: 2, rng: 10, w: 3, t: 'B', sp: [] },
    { name: 'Mace, heavy', cat: 'simple', hand: 'one', c: 12, dmg: '1d8', cr: 20, cm: 2, rng: 0, w: 8, t: 'B', sp: [] },
    { name: 'Morningstar', cat: 'simple', hand: 'one', c: 8, dmg: '1d8', cr: 20, cm: 2, rng: 0, w: 6, t: 'B and P', sp: [] },
    { name: 'Shortspear', cat: 'simple', hand: 'one', c: 1, dmg: '1d6', cr: 20, cm: 2, rng: 20, w: 3, t: 'P', sp: [] },

    /* --- simple, two-handed --- */
    { name: 'Longspear', cat: 'simple', hand: 'two', c: 5, dmg: '1d8', cr: 20, cm: 3, rng: 0, w: 9, t: 'P', sp: ['reach', 'brace'] },
    { name: 'Quarterstaff', cat: 'simple', hand: 'two', c: 0, dmg: '1d6/1d6', cr: 20, cm: 2, rng: 0, w: 4, t: 'B', sp: ['double'] },
    { name: 'Spear', cat: 'simple', hand: 'two', c: 2, dmg: '1d8', cr: 20, cm: 3, rng: 20, w: 6, t: 'P', sp: ['brace'] },

    /* --- simple, ranged --- */
    { name: 'Crossbow, heavy', cat: 'simple', hand: 'ranged', c: 50, dmg: '1d10', cr: 19, cm: 2, rng: 120, w: 8, t: 'P', sp: ['full-round reload'] },
    { name: 'Crossbow, light', cat: 'simple', hand: 'ranged', c: 35, dmg: '1d8', cr: 19, cm: 2, rng: 80, w: 4, t: 'P', sp: ['move reload'] },
    { name: 'Dart', cat: 'simple', hand: 'ranged', c: 0.5, dmg: '1d4', cr: 20, cm: 2, rng: 20, w: 0.5, t: 'P', sp: ['thrown'] },
    { name: 'Javelin', cat: 'simple', hand: 'ranged', c: 1, dmg: '1d6', cr: 20, cm: 2, rng: 30, w: 2, t: 'P', sp: ['thrown'] },
    { name: 'Sling', cat: 'simple', hand: 'ranged', c: 0, dmg: '1d4', cr: 20, cm: 2, rng: 50, w: 0, t: 'B', sp: ['add STR to damage'] },

    /* --- martial, light --- */
    { name: 'Axe, throwing', cat: 'martial', hand: 'light', c: 8, dmg: '1d6', cr: 20, cm: 2, rng: 10, w: 2, t: 'S', sp: ['thrown'] },
    { name: 'Hammer, light', cat: 'martial', hand: 'light', c: 1, dmg: '1d4', cr: 20, cm: 2, rng: 20, w: 2, t: 'B', sp: ['thrown'] },
    { name: 'Handaxe', cat: 'martial', hand: 'light', c: 6, dmg: '1d6', cr: 20, cm: 3, rng: 0, w: 3, t: 'S', sp: [] },
    { name: 'Kukri', cat: 'martial', hand: 'light', c: 8, dmg: '1d4', cr: 18, cm: 2, rng: 0, w: 2, t: 'S', sp: ['finesse'] },
    { name: 'Pick, light', cat: 'martial', hand: 'light', c: 4, dmg: '1d4', cr: 20, cm: 4, rng: 0, w: 3, t: 'P', sp: [] },
    { name: 'Sap', cat: 'martial', hand: 'light', c: 1, dmg: '1d6', cr: 20, cm: 2, rng: 0, w: 2, t: 'B', sp: ['nonlethal'] },
    { name: 'Shield, light (bash)', cat: 'martial', hand: 'light', c: 0, dmg: '1d3', cr: 20, cm: 2, rng: 0, w: 0, t: 'B', sp: ['shield bash'] },
    { name: 'Spiked armor', cat: 'martial', hand: 'light', c: 0, dmg: '1d6', cr: 20, cm: 2, rng: 0, w: 0, t: 'P', sp: [] },
    { name: 'Spiked shield, light', cat: 'martial', hand: 'light', c: 0, dmg: '1d4', cr: 20, cm: 2, rng: 0, w: 0, t: 'P', sp: ['shield bash'] },
    { name: 'Starknife', cat: 'martial', hand: 'light', c: 24, dmg: '1d4', cr: 20, cm: 3, rng: 20, w: 3, t: 'P', sp: ['thrown'] },
    { name: 'Sword, short', cat: 'martial', hand: 'light', c: 10, dmg: '1d6', cr: 19, cm: 2, rng: 0, w: 2, t: 'P', sp: ['finesse'] },

    /* --- martial, one-handed --- */
    { name: 'Battleaxe', cat: 'martial', hand: 'one', c: 10, dmg: '1d8', cr: 20, cm: 3, rng: 0, w: 6, t: 'S', sp: [] },
    { name: 'Flail', cat: 'martial', hand: 'one', c: 8, dmg: '1d8', cr: 20, cm: 2, rng: 0, w: 5, t: 'B', sp: ['disarm', 'trip'] },
    { name: 'Longsword', cat: 'martial', hand: 'one', c: 15, dmg: '1d8', cr: 19, cm: 2, rng: 0, w: 4, t: 'S', sp: [] },
    { name: 'Pick, heavy', cat: 'martial', hand: 'one', c: 8, dmg: '1d6', cr: 20, cm: 4, rng: 0, w: 6, t: 'P', sp: [] },
    { name: 'Rapier', cat: 'martial', hand: 'one', c: 20, dmg: '1d6', cr: 18, cm: 2, rng: 0, w: 2, t: 'P', sp: ['finesse'] },
    { name: 'Scimitar', cat: 'martial', hand: 'one', c: 15, dmg: '1d6', cr: 18, cm: 2, rng: 0, w: 4, t: 'S', sp: [] },
    { name: 'Shield, heavy (bash)', cat: 'martial', hand: 'one', c: 0, dmg: '1d4', cr: 20, cm: 2, rng: 0, w: 0, t: 'B', sp: ['shield bash'] },
    { name: 'Spiked shield, heavy', cat: 'martial', hand: 'one', c: 0, dmg: '1d6', cr: 20, cm: 2, rng: 0, w: 0, t: 'P', sp: ['shield bash'] },
    { name: 'Trident', cat: 'martial', hand: 'one', c: 15, dmg: '1d8', cr: 20, cm: 2, rng: 10, w: 4, t: 'P', sp: ['brace', 'thrown'] },
    { name: 'Warhammer', cat: 'martial', hand: 'one', c: 12, dmg: '1d8', cr: 20, cm: 3, rng: 0, w: 5, t: 'B', sp: [] },

    /* --- martial, two-handed --- */
    { name: 'Falchion', cat: 'martial', hand: 'two', c: 75, dmg: '2d4', cr: 18, cm: 2, rng: 0, w: 8, t: 'S', sp: [] },
    { name: 'Flail, heavy', cat: 'martial', hand: 'two', c: 15, dmg: '1d10', cr: 19, cm: 2, rng: 0, w: 10, t: 'B', sp: ['disarm', 'trip'] },
    { name: 'Glaive', cat: 'martial', hand: 'two', c: 8, dmg: '1d10', cr: 20, cm: 3, rng: 0, w: 10, t: 'S', sp: ['reach'] },
    { name: 'Greataxe', cat: 'martial', hand: 'two', c: 20, dmg: '1d12', cr: 20, cm: 3, rng: 0, w: 12, t: 'S', sp: [] },
    { name: 'Greatclub', cat: 'martial', hand: 'two', c: 5, dmg: '1d10', cr: 20, cm: 2, rng: 0, w: 8, t: 'B', sp: [] },
    { name: 'Greatsword', cat: 'martial', hand: 'two', c: 50, dmg: '2d6', cr: 19, cm: 2, rng: 0, w: 8, t: 'S', sp: [] },
    { name: 'Guisarme', cat: 'martial', hand: 'two', c: 9, dmg: '2d4', cr: 20, cm: 3, rng: 0, w: 12, t: 'S', sp: ['reach', 'trip'] },
    { name: 'Halberd', cat: 'martial', hand: 'two', c: 10, dmg: '1d10', cr: 20, cm: 3, rng: 0, w: 12, t: 'P or S', sp: ['brace', 'trip'] },
    { name: 'Lance', cat: 'martial', hand: 'two', c: 10, dmg: '1d8', cr: 20, cm: 3, rng: 0, w: 10, t: 'P', sp: ['reach', 'mounted charge x2'] },
    { name: 'Ranseur', cat: 'martial', hand: 'two', c: 10, dmg: '2d4', cr: 20, cm: 3, rng: 0, w: 12, t: 'P', sp: ['reach', 'disarm'] },
    { name: 'Scythe', cat: 'martial', hand: 'two', c: 18, dmg: '2d4', cr: 20, cm: 4, rng: 0, w: 10, t: 'P or S', sp: ['trip'] },

    /* --- martial, ranged --- */
    { name: 'Longbow', cat: 'martial', hand: 'ranged', c: 75, dmg: '1d8', cr: 20, cm: 3, rng: 100, w: 3, t: 'P', sp: [] },
    { name: 'Longbow, composite', cat: 'martial', hand: 'ranged', c: 100, dmg: '1d8', cr: 20, cm: 3, rng: 110, w: 3, t: 'P', sp: ['add STR to damage (rated)'] },
    { name: 'Shortbow', cat: 'martial', hand: 'ranged', c: 30, dmg: '1d6', cr: 20, cm: 3, rng: 60, w: 2, t: 'P', sp: [] },
    { name: 'Shortbow, composite', cat: 'martial', hand: 'ranged', c: 75, dmg: '1d6', cr: 20, cm: 3, rng: 70, w: 2, t: 'P', sp: ['add STR to damage (rated)'] },

    /* --- exotic --- */
    { name: 'Kama', cat: 'exotic', hand: 'light', c: 2, dmg: '1d6', cr: 20, cm: 2, rng: 0, w: 2, t: 'S', sp: ['trip', 'monk'] },
    { name: 'Nunchaku', cat: 'exotic', hand: 'light', c: 2, dmg: '1d6', cr: 20, cm: 2, rng: 0, w: 2, t: 'B', sp: ['disarm', 'monk'] },
    { name: 'Sai', cat: 'exotic', hand: 'light', c: 1, dmg: '1d4', cr: 20, cm: 2, rng: 10, w: 1, t: 'B', sp: ['disarm', 'monk'] },
    { name: 'Siangham', cat: 'exotic', hand: 'light', c: 3, dmg: '1d6', cr: 20, cm: 2, rng: 0, w: 1, t: 'P', sp: ['monk'] },
    { name: 'Sword, bastard', cat: 'exotic', hand: 'one', c: 35, dmg: '1d10', cr: 19, cm: 2, rng: 0, w: 6, t: 'S', sp: ['martial if two-handed'] },
    { name: 'Waraxe, dwarven', cat: 'exotic', hand: 'one', c: 30, dmg: '1d10', cr: 20, cm: 3, rng: 0, w: 8, t: 'S', sp: [] },
    { name: 'Whip', cat: 'exotic', hand: 'one', c: 1, dmg: '1d3', cr: 20, cm: 2, rng: 0, w: 2, t: 'S', sp: ['reach', 'nonlethal', 'disarm', 'trip'] },
    { name: 'Chain, spiked', cat: 'exotic', hand: 'two', c: 25, dmg: '2d4', cr: 20, cm: 2, rng: 0, w: 10, t: 'P', sp: ['disarm', 'trip', 'finesse'] },
    { name: 'Curve blade, elven', cat: 'exotic', hand: 'two', c: 80, dmg: '1d10', cr: 18, cm: 2, rng: 0, w: 7, t: 'S', sp: ['finesse'] },
    { name: 'Flail, dire', cat: 'exotic', hand: 'two', c: 90, dmg: '1d8/1d8', cr: 20, cm: 2, rng: 0, w: 10, t: 'B', sp: ['double', 'disarm', 'trip'] },
    { name: 'Sword, two-bladed', cat: 'exotic', hand: 'two', c: 100, dmg: '1d8/1d8', cr: 19, cm: 2, rng: 0, w: 10, t: 'S', sp: ['double'] },
    { name: 'Urgrosh, dwarven', cat: 'exotic', hand: 'two', c: 50, dmg: '1d8/1d6', cr: 20, cm: 3, rng: 0, w: 12, t: 'S and P', sp: ['double', 'brace'] },
    { name: 'Bolas', cat: 'exotic', hand: 'ranged', c: 5, dmg: '1d4', cr: 20, cm: 2, rng: 10, w: 2, t: 'B', sp: ['nonlethal', 'trip'] },
    { name: 'Crossbow, hand', cat: 'exotic', hand: 'ranged', c: 100, dmg: '1d4', cr: 19, cm: 2, rng: 30, w: 2, t: 'P', sp: [] },
    { name: 'Crossbow, repeating heavy', cat: 'exotic', hand: 'ranged', c: 400, dmg: '1d10', cr: 19, cm: 2, rng: 120, w: 12, t: 'P', sp: ['5-shot magazine'] },
    { name: 'Crossbow, repeating light', cat: 'exotic', hand: 'ranged', c: 250, dmg: '1d8', cr: 19, cm: 2, rng: 80, w: 6, t: 'P', sp: ['5-shot magazine'] },
    { name: 'Net', cat: 'exotic', hand: 'ranged', c: 20, dmg: '—', cr: 20, cm: 2, rng: 10, w: 6, t: '—', sp: ['entangle', 'touch attack'] },
    { name: 'Shuriken', cat: 'exotic', hand: 'ranged', c: 0.02, dmg: '1d2', cr: 20, cm: 2, rng: 10, w: 0.5, t: 'P', sp: ['thrown', 'monk'] }
  ];
  D.WEAPON_BY_NAME = {};
  D.WEAPONS.forEach(function (w) { D.WEAPON_BY_NAME[w.name] = w; });

  /* ---------------------------------------------------------------- ARMOR & SHIELDS */
  /* ac: armor/shield bonus · mx: max DEX · acp: armor check penalty · asf: arcane spell failure % */
  D.ARMOR = [
    { name: 'None', type: 'none', c: 0, ac: 0, mx: null, acp: 0, asf: 0, spd30: 30, w: 0 },
    { name: 'Padded', type: 'light', c: 5, ac: 1, mx: 8, acp: 0, asf: 5, spd30: 30, w: 10 },
    { name: 'Leather', type: 'light', c: 10, ac: 2, mx: 6, acp: 0, asf: 10, spd30: 30, w: 15 },
    { name: 'Studded leather', type: 'light', c: 25, ac: 3, mx: 5, acp: -1, asf: 15, spd30: 30, w: 20 },
    { name: 'Chain shirt', type: 'light', c: 100, ac: 4, mx: 4, acp: -2, asf: 20, spd30: 30, w: 25 },
    { name: 'Hide', type: 'medium', c: 15, ac: 4, mx: 4, acp: -3, asf: 20, spd30: 20, w: 25 },
    { name: 'Scale mail', type: 'medium', c: 50, ac: 5, mx: 3, acp: -4, asf: 25, spd30: 20, w: 30 },
    { name: 'Chainmail', type: 'medium', c: 150, ac: 6, mx: 2, acp: -5, asf: 30, spd30: 20, w: 40 },
    { name: 'Breastplate', type: 'medium', c: 200, ac: 6, mx: 3, acp: -4, asf: 25, spd30: 20, w: 30 },
    { name: 'Splint mail', type: 'heavy', c: 200, ac: 7, mx: 0, acp: -7, asf: 40, spd30: 20, w: 45 },
    { name: 'Banded mail', type: 'heavy', c: 250, ac: 7, mx: 1, acp: -6, asf: 35, spd30: 20, w: 35 },
    { name: 'Half-plate', type: 'heavy', c: 600, ac: 8, mx: 0, acp: -7, asf: 40, spd30: 20, w: 50 },
    { name: 'Full plate', type: 'heavy', c: 1500, ac: 9, mx: 1, acp: -6, asf: 35, spd30: 20, w: 50 }
  ];

  D.SHIELDS = [
    { name: 'None', type: 'none', c: 0, ac: 0, mx: null, acp: 0, asf: 0, w: 0 },
    { name: 'Buckler', type: 'shield', c: 5, ac: 1, mx: null, acp: -1, asf: 5, w: 5 },
    { name: 'Shield, light wooden', type: 'shield', c: 3, ac: 1, mx: null, acp: -1, asf: 5, w: 5 },
    { name: 'Shield, light steel', type: 'shield', c: 9, ac: 1, mx: null, acp: -1, asf: 5, w: 6 },
    { name: 'Shield, heavy wooden', type: 'shield', c: 7, ac: 2, mx: null, acp: -2, asf: 15, w: 10 },
    { name: 'Shield, heavy steel', type: 'shield', c: 20, ac: 2, mx: null, acp: -2, asf: 15, w: 15 },
    { name: 'Shield, tower', type: 'shield', c: 30, ac: 4, mx: 2, acp: -10, asf: 50, w: 45 }
  ];

  /* ---------------------------------------------------------------- ADVENTURING GEAR */
  D.GEAR = [
    { name: 'Backpack', c: 2, w: 2 }, { name: 'Bedroll', c: 0.1, w: 5 },
    { name: 'Blanket, winter', c: 0.5, w: 3 }, { name: 'Caltrops', c: 1, w: 2 },
    { name: 'Candle', c: 0.01, w: 0 }, { name: 'Chain (10 ft.)', c: 30, w: 2 },
    { name: 'Crowbar', c: 2, w: 5 }, { name: 'Flint and steel', c: 1, w: 0 },
    { name: 'Grappling hook', c: 1, w: 4 }, { name: 'Hammer', c: 0.5, w: 2 },
    { name: 'Ink (1 oz. vial)', c: 8, w: 0 }, { name: 'Inkpen', c: 0.1, w: 0 },
    { name: 'Lamp, common', c: 0.1, w: 1 }, { name: 'Lantern, bullseye', c: 12, w: 3 },
    { name: 'Lantern, hooded', c: 7, w: 2 }, { name: 'Manacles', c: 15, w: 2 },
    { name: 'Mirror, small steel', c: 10, w: 0.5 }, { name: 'Oil (1-pint flask)', c: 0.1, w: 1 },
    { name: 'Piton', c: 0.1, w: 0.5 }, { name: 'Pole (10 ft.)', c: 0.05, w: 8 },
    { name: 'Pot, iron', c: 0.8, w: 4 }, { name: 'Rations, trail (per day)', c: 0.5, w: 1 },
    { name: 'Rope, hempen (50 ft.)', c: 1, w: 10 }, { name: 'Rope, silk (50 ft.)', c: 10, w: 5 },
    { name: 'Sack', c: 0.1, w: 0.5 }, { name: 'Signal whistle', c: 0.8, w: 0 },
    { name: 'Soap (per lb.)', c: 0.5, w: 1 }, { name: 'Spade or shovel', c: 2, w: 8 },
    { name: 'Spyglass', c: 1000, w: 1 }, { name: 'Tent, small', c: 10, w: 20 },
    { name: 'Torch', c: 0.01, w: 1 }, { name: 'Waterskin', c: 1, w: 4 },
    { name: 'Whetstone', c: 0.02, w: 1 }, { name: 'Holy symbol, wooden', c: 1, w: 0 },
    { name: 'Holy symbol, silver', c: 25, w: 1 }, { name: 'Holy water (flask)', c: 25, w: 1 },
    { name: 'Spell component pouch', c: 5, w: 2 }, { name: 'Spellbook, wizard’s', c: 15, w: 3 },
    { name: 'Thieves’ tools', c: 30, w: 1 }, { name: 'Thieves’ tools, masterwork', c: 100, w: 2 },
    { name: 'Healer’s kit', c: 50, w: 1 }, { name: 'Climber’s kit', c: 80, w: 5 },
    { name: 'Disguise kit', c: 50, w: 8 }, { name: 'Alchemist’s fire (flask)', c: 20, w: 1 },
    { name: 'Acid (flask)', c: 10, w: 1 }, { name: 'Antitoxin (vial)', c: 50, w: 0 },
    { name: 'Tanglefoot bag', c: 50, w: 4 }, { name: 'Thunderstone', c: 30, w: 1 },
    { name: 'Smokestick', c: 20, w: 0.5 }, { name: 'Sunrod', c: 2, w: 1 },
    { name: 'Arrows (20)', c: 1, w: 3 }, { name: 'Bolts, crossbow (10)', c: 1, w: 1 },
    { name: 'Bullets, sling (10)', c: 0.1, w: 5 }, { name: 'Explorer’s outfit', c: 10, w: 8 },
    { name: 'Artisan’s tools', c: 5, w: 5 }, { name: 'Artisan’s tools, masterwork', c: 55, w: 5 }
  ];

  /* ---------------------------------------------------------------- MAGIC ITEMS
     Body slots (CRB p.459) and a working set of items legal for a level 1-7 party. */
  D.MAGIC_SLOTS = ['Armor', 'Belt', 'Body', 'Chest', 'Eyes', 'Feet', 'Hands', 'Head', 'Headband',
    'Neck', 'Ring (1)', 'Ring (2)', 'Shield', 'Shoulders', 'Wrist', 'Weapon', 'Slotless'];

  D.MAGIC_ITEMS = [
    /* wondrous — the classic level 1-7 kit */
    { name: 'Amulet of Natural Armor +1', slot: 'Neck', c: 2000, w: 0, eff: { natural: 1 }, desc: '+1 natural armor bonus to AC.' },
    { name: 'Belt of Giant Strength +2', slot: 'Belt', c: 4000, w: 1, eff: { str: 2 }, desc: '+2 enhancement bonus to Strength.' },
    { name: 'Belt of Incredible Dexterity +2', slot: 'Belt', c: 4000, w: 1, eff: { dex: 2 }, desc: '+2 enhancement bonus to Dexterity.' },
    { name: 'Belt of Mighty Constitution +2', slot: 'Belt', c: 4000, w: 1, eff: { con: 2 }, desc: '+2 enhancement bonus to Constitution.' },
    { name: 'Headband of Alluring Charisma +2', slot: 'Headband', c: 4000, w: 1, eff: { cha: 2 }, desc: '+2 enhancement bonus to Charisma.' },
    { name: 'Headband of Inspired Wisdom +2', slot: 'Headband', c: 4000, w: 1, eff: { wis: 2 }, desc: '+2 enhancement bonus to Wisdom.' },
    { name: 'Headband of Vast Intelligence +2', slot: 'Headband', c: 4000, w: 1, eff: { int: 2 }, desc: '+2 enhancement bonus to Intelligence; one bonus skill.' },
    { name: 'Cloak of Resistance +1', slot: 'Shoulders', c: 1000, w: 1, eff: { saveAll: 1 }, desc: '+1 resistance bonus on all saving throws.' },
    { name: 'Cloak of Resistance +2', slot: 'Shoulders', c: 4000, w: 1, eff: { saveAll: 2 }, desc: '+2 resistance bonus on all saving throws.' },
    { name: 'Ring of Protection +1', slot: 'Ring (1)', c: 2000, w: 0, eff: { deflect: 1 }, desc: '+1 deflection bonus to AC.' },
    { name: 'Ring of Protection +2', slot: 'Ring (1)', c: 8000, w: 0, eff: { deflect: 2 }, desc: '+2 deflection bonus to AC.' },
    { name: 'Bracers of Armor +1', slot: 'Wrist', c: 1000, w: 1, eff: { armorBonus: 1 }, desc: '+1 armor bonus to AC; does not stack with worn armor.' },
    { name: 'Bracers of Armor +2', slot: 'Wrist', c: 4000, w: 1, eff: { armorBonus: 2 }, desc: '+2 armor bonus to AC; does not stack with worn armor.' },
    { name: 'Boots of Elvenkind', slot: 'Feet', c: 2500, w: 1, eff: { skill: { 'Acrobatics': 5 } }, desc: '+5 competence bonus on Acrobatics.' },
    { name: 'Cloak of Elvenkind', slot: 'Shoulders', c: 2500, w: 1, eff: { skill: { 'Stealth': 5 } }, desc: '+5 competence bonus on Stealth.' },
    { name: 'Gloves of Swimming and Climbing', slot: 'Hands', c: 6250, w: 0, eff: { skill: { 'Swim': 5, 'Climb': 5 } }, desc: '+5 competence bonus on Swim and Climb.' },
    { name: 'Handy Haversack', slot: 'Back', c: 2000, w: 5, eff: {}, desc: 'Holds 120 lb. in 12 cu. ft.; always weighs 5 lb. Retrieve any item as a move action.' },
    { name: 'Bag of Holding (Type I)', slot: 'Slotless', c: 2500, w: 15, eff: {}, desc: 'Holds 250 lb. in 30 cu. ft.; weighs 15 lb.' },
    { name: 'Eyes of the Eagle', slot: 'Eyes', c: 2500, w: 0, eff: { skill: { 'Perception': 5 } }, desc: '+5 competence bonus on Perception.' },
    { name: 'Hat of Disguise', slot: 'Head', c: 1800, w: 0, eff: {}, desc: 'At will, disguise self.' },
    { name: 'Boots of Striding and Springing', slot: 'Feet', c: 5500, w: 1, eff: { speed: 10 }, desc: '+10 ft. speed and +5 on Acrobatics to jump.' },
    { name: 'Amulet of Mighty Fists +1', slot: 'Neck', c: 4000, w: 0, eff: {}, desc: '+1 enhancement on all unarmed and natural attacks.' },
    { name: 'Circlet of Persuasion', slot: 'Head', c: 4500, w: 0, eff: {}, desc: '+3 competence bonus on CHA-based checks.' },

    /* consumables */
    { name: 'Potion of Cure Light Wounds', slot: 'Slotless', c: 50, w: 0, eff: {}, desc: 'Heals 1d8+1 hp.', consumable: true },
    { name: 'Potion of Cure Moderate Wounds', slot: 'Slotless', c: 300, w: 0, eff: {}, desc: 'Heals 2d8+3 hp.', consumable: true },
    { name: 'Potion of Bull’s Strength', slot: 'Slotless', c: 300, w: 0, eff: {}, desc: '+4 enhancement to STR for 3 minutes.', consumable: true },
    { name: 'Potion of Invisibility', slot: 'Slotless', c: 300, w: 0, eff: {}, desc: 'Invisible for 3 minutes or until you attack.', consumable: true },
    { name: 'Wand of Cure Light Wounds (50 charges)', slot: 'Slotless', c: 750, w: 0, eff: {}, desc: 'CL 1. Heals 1d8+1 per charge.', consumable: true },
    { name: 'Wand of Magic Missile (50 charges)', slot: 'Slotless', c: 750, w: 0, eff: {}, desc: 'CL 1. One missile, 1d4+1 force.', consumable: true },
    { name: 'Scroll (1st level, CL 1)', slot: 'Slotless', c: 25, w: 0, eff: {}, desc: 'A single 1st-level spell.', consumable: true },
    { name: 'Scroll (2nd level, CL 3)', slot: 'Slotless', c: 150, w: 0, eff: {}, desc: 'A single 2nd-level spell.', consumable: true }
  ];

  /* Weapon and armor enhancement pricing — the +N part only (CRB p.468/p.462). */
  D.ENHANCEMENT = {
    weapon: { 0: 0, 1: 2000, 2: 8000, 3: 18000, 4: 32000, 5: 50000 },
    armor:  { 0: 0, 1: 1000, 2: 4000, 3: 9000, 4: 16000, 5: 25000 },
    masterworkWeapon: 300, masterworkArmor: 150
  };

  D.COIN = { pp: 10, gp: 1, sp: 0.1, cp: 0.01 };
})();
