'use strict';

const WORLD_NAMES = {
  73: 'Adamantoise',
  90: 'Aegis',
  43: 'Alexander',
  44: 'Anima',
  23: 'Asura',
  68: 'Atomos',
  69: 'Bahamut',
  91: 'Balmung',
  78: 'Behemoth',
  24: 'Belias',
  34: 'Brynhildr',
  79: 'Cactuar',
  45: 'Carbuncle',
  80: 'Cerberus',
  70: 'Chocobo',
  74: 'Coeurl',
  62: 'Diabolos',
  92: 'Durandal',
  93: 'Excalibur',
  53: 'Exodus',
  54: 'Faerie',
  35: 'Famfrit',
  46: 'Fenrir',
  58: 'Garuda',
  63: 'Gilgamesh',
  81: 'Goblin',
  94: 'Gungnir',
  47: 'Hades',
  95: 'Hyperion',
  59: 'Ifrit',
  48: 'Ixion',
  40: 'Jenova',
  49: 'Kujata',
  55: 'Lamia',
  64: 'Leviathan',
  36: 'Lich',
  83: 'Louisoix',
  75: 'Malboro',
  82: 'Mandragora',
  96: 'Masamune',
  37: 'Mateus',
  65: 'Midgardsormr',
  71: 'Moogle',
  66: 'Odin',
  39: 'Omega',
  28: 'Pandaemonium',
  56: 'Phoenix',
  97: 'Ragnarok',
  60: 'Ramuh',
  98: 'Ridill',
  99: 'Sargatanas',
  29: 'Shinryu',
  67: 'Shiva',
  57: 'Siren',
  76: 'Tiamat',
  61: 'Titan',
  72: 'Tonberry',
  50: 'Typhon',
  51: 'Ultima',
  77: 'Ultros',
  30: 'Unicorn',
  52: 'Valefor',
  31: 'Yojimbo',
  41: 'Zalera',
  32: 'Zeromus',
  42: 'Zodiark',
};

const CLASS_TOOLTIPS = {
  'Paladin / Gladiator': 'PLD',
  'Gladiator': 'GLA',
  'Warrior / Marauder': 'WAR',
  'Marauder': 'MRD',
  'Dark Knight': 'DRK',
  'Gunbreaker': 'GNB',
  
  'White Mage / Conjurer': 'WHM',
  'Conjurer': 'CNJ',
  'Scholar': 'SCH',
  'Astrologian': 'AST',

  'Monk / Pugilist': 'MNK',
  'Pugilist': 'PGL',
  'Dragoon / Lancer': 'DRG',
  'Lancer': 'LNC',
  'Ninja / Rogue': 'NIN',
  'Rogue': 'ROG',
  'Samurai': 'SAM',
  'Bard / Archer': 'BRD',
  'Archer': 'ARC',
  'Machinist': 'MCH',
  'Dancer': 'DNC',
  'Black Mage / Thaumaturge': 'BLM',
  'Thaumaturge': 'THM',
  'Summoner / Arcanist': 'SMN',
  'Arcanist': 'ACN',
  'Red Mage': 'RDM',
  'Blue Mage (Limited Job)': 'BLU',

  'Carpenter': 'CRP',
  'Blacksmith': 'BSM',
  'Armorer': 'ARM',
  'Goldsmith': 'GSM',
  'Leatherworker': 'LTW',
  'Weaver': 'WVR',
  'Alchemist': 'ALC',
  'Culinarian': 'CUL',
  'Miner': 'MIN',
  'Botanist': 'BTN',
  'Fisher': 'FSH',
};

const BASE_JOB_LEVELS = {
  'DRK': 30,
  'GNB': 60,
  'AST': 30,
  'SAM': 50,
  'MCH': 30,
  'DNC': 60,
  'RDM': 50,
};

const LODESTONE_BASE_URI = 'https://na.finalfantasyxiv.com';
const LODESTONE_SEARCH_URI = LODESTONE_BASE_URI + '/lodestone/character/';


let initialized = false;
const cache = {};
const domParser = new DOMParser();

async function fetchDocument(url, ...fetchArgs) {
  console.log('fetch', url);
  const response = await fetch('https://cors-anywhere.herokuapp.com/' + url, ...fetchArgs);
  const html = await response.text();
  return domParser.parseFromString(html, 'text/html');
}

async function getLodestonePlayerURI(name, world) {
  const searchURI = LODESTONE_SEARCH_URI + `?worldname=${encodeURIComponent(world)}&q=${encodeURIComponent(name)}`;
  const doc = await fetchDocument(searchURI);
  const entries = Array.from(doc.querySelectorAll('.ldst__window .entry'));
  // filter for exact match in case player name partially matches someone else
  const playerEntry = entries.filter(elem =>
    elem.getElementsByClassName('entry__name')[0].innerHTML === name)[0];
  return LODESTONE_BASE_URI + playerEntry.getElementsByTagName('a')[0].getAttribute('href');
}

function getLodestoneJobs(doc) {
  const pairs = Array.from(doc.querySelectorAll('.character__level__list li'));
  const parsedPairs = pairs.map(elem => [
    CLASS_TOOLTIPS[elem.getElementsByTagName('img')[0].dataset.tooltip] || elem.getElementsByTagName('img')[0].dataset.tooltip,
    Number(elem.innerText) || 0
  ]);
  const filteredPairs = parsedPairs.filter((([job, level]) =>
    // ignore crafters
    Util.isCombatJob(job) &&
    // ignore unlevelled jobs
    level > 14 &&
    // ignore unlocked but unlevelled jobs
    (!BASE_JOB_LEVELS.hasOwnProperty(job) || level > BASE_JOB_LEVELS[job]) &&
    // blue mages are like birds, they aren't real
    job !== 'BLU'
  ));
  filteredPairs.sort((a, b) => b[1] - a[1]);
  return filteredPairs;
}

function getLodestoneItemLevel(doc) {
  const itemTooltips = Array.from(doc.getElementsByClassName('ic_reflection_box'));
  const equippedItemTooltips = itemTooltips.filter(elem =>
    // ignore job crystals
    !elem.classList.contains('icon-c--13') &&
    // ignore empty gear slots
    elem.children.length > 0
  );
  const itemLevels = equippedItemTooltips.map(elem =>
    Number(elem.getElementsByClassName('db-tooltip__item__level')[0].innerText.match(/\d+/)[0]));
  const averageItemLevel = itemLevels.reduce((acc, cur) => acc + cur, 0) / itemLevels.length;
  return Math.round(averageItemLevel);
}

async function lodestoneLookup(name, world) {
  const playerPage = await fetchDocument(await getLodestonePlayerURI(name, world));

  const classIconSrc = playerPage.querySelector('.character__class_icon img').src;
  const classTooltip = playerPage.querySelector(`.character__level__list img[src="${classIconSrc}"]`).dataset.tooltip;
  const job = CLASS_TOOLTIPS[classTooltip];
  const level = playerPage.querySelector('.character__class__data p').innerText.match(/\d+/)[0];

  const itemLevel = getLodestoneItemLevel(playerPage);
  const jobs = getLodestoneJobs(playerPage);

  return {
    name,
    world,
    job,
    level,
    itemLevel,
    jobs,
  };
}

function renderPlayerLookup(player) {
  document.getElementById('playerlookup').innerHTML += `
    <li class="player">
      <img class="job ${Util.jobToRole(player.job)}" src="../../resources/icon/jobs/${player.job.toLowerCase()}.png" alt="${player.job}" />
      ${player.level !== null ? `<span class="level">${player.level}</span>` : ''}
      ${player.itemLevel !== null ? `<span class="item-level">${player.itemLevel}</span>` : ''}
      <span class="name">${player.name}</span>
      <ul class="job-levels">
        ${player.jobs.map(([job, level]) => `<li class="${Util.jobToRole(job)}">${job} ${level}</li>`).join('')}
      </ul>
    </li>
  `;
}

addOverlayListener('PartyChanged', async (evt) => {
  if (!initialized || (evt.party && evt.party.length > 1)) {
    document.getElementById('playerlookup').innerHTML = ''; // empty container
    if (!initialized) evt.party.shift(); // remove player character
    for (const player of evt.party) {
      const cacheKey = `${player.name},${player.worldId}`;
      let data = cache[cacheKey];
      if (!data) {
        data = await lodestoneLookup(player.name, WORLD_NAMES[player.worldId]);
        if (data.job !== player.job) {
          data.job = player.job;
          data.level = null;
          data.itemLevel = null;
        } else {
          data.jobs = data.jobs.filter(([job, level]) => job !== player.job);
        }
        cache[cacheKey] = data;
      }
      renderPlayerLookup(data);
    }
    initialized = true;
  }
});

callOverlayHandler({ call: 'cactbotRequestState' });
