// Sky Word — word data.
// All entries are lowercase. ANSWERS are common, fair words used as puzzle
// solutions; EXTRA_VALID widens the set of words a player is allowed to GUESS
// so legitimate guesses aren't rejected. VALID[n] = ANSWERS[n] ∪ EXTRA_VALID[n].
// Lengths/format are checked by tools/check-words.mjs.

export const LENGTHS = [4, 5, 6];

// Words the game can pick as the secret solution (kept common + recognizable).
export const ANSWERS = {
  4: [
    'able', 'acid', 'aged', 'also', 'area', 'army', 'away', 'baby', 'back', 'ball',
    'band', 'bank', 'base', 'bath', 'bean', 'bear', 'beat', 'been', 'bell', 'belt',
    'best', 'bird', 'bite', 'blue', 'boat', 'body', 'bone', 'book', 'boot', 'born',
    'both', 'bowl', 'bulk', 'bush', 'busy', 'cake', 'call', 'calm', 'camp', 'card',
    'care', 'cart', 'case', 'cash', 'cast', 'cell', 'chat', 'chef', 'chip', 'city',
    'clay', 'club', 'coal', 'coat', 'code', 'cold', 'cook', 'cool', 'copy', 'cord',
    'core', 'corn', 'cost', 'crew', 'crop', 'cube', 'cure', 'dark', 'dash', 'data',
    'date', 'dawn', 'deal', 'dear', 'deck', 'deep', 'deer', 'desk', 'dial', 'diet',
    'dirt', 'dish', 'dock', 'does', 'doll', 'done', 'door', 'dose', 'down', 'draw',
    'drop', 'drum', 'duck', 'dull', 'dust', 'each', 'earn', 'ease', 'east', 'easy',
    'edge', 'even', 'evil', 'exit', 'face', 'fact', 'fade', 'fail', 'fair', 'fall',
    'fame', 'farm', 'fast', 'fate', 'fear', 'feed', 'feel', 'feet', 'fell', 'file',
  ],
  5: [
    'about', 'above', 'abuse', 'actor', 'acute', 'admit', 'adopt', 'adult', 'after', 'again',
    'agent', 'agree', 'alarm', 'album', 'alert', 'alien', 'alike', 'alive', 'allow', 'alone',
    'along', 'aloud', 'alter', 'among', 'angel', 'anger', 'angle', 'angry', 'ankle', 'apart',
    'apple', 'apply', 'arena', 'argue', 'arise', 'armor', 'array', 'arrow', 'aside', 'asset',
    'audio', 'avoid', 'await', 'awake', 'award', 'aware', 'bacon', 'badge', 'badly', 'baker',
    'basic', 'batch', 'beach', 'beard', 'beast', 'began', 'begin', 'being', 'below', 'bench',
    'birth', 'black', 'blade', 'blame', 'blank', 'blast', 'blaze', 'blend', 'blind', 'block',
    'blood', 'bloom', 'board', 'boost', 'bound', 'brain', 'brake', 'brand', 'brave', 'bread',
    'break', 'breed', 'brick', 'bride', 'brief', 'bring', 'broad', 'brown', 'brush', 'build',
    'built', 'bunch', 'burst', 'cabin', 'cable', 'candy', 'cargo', 'carry', 'catch', 'cause',
    'chain', 'chair', 'chalk', 'chant', 'chaos', 'charm', 'chart', 'chase', 'cheap', 'check',
    'cheek', 'cheer', 'chess', 'chest', 'chief', 'child', 'chill', 'china', 'chose', 'chunk',
    'civil', 'claim', 'clash', 'class', 'clean', 'clear', 'clerk', 'click', 'cliff', 'climb',
    'cling', 'clock', 'close', 'cloth', 'cloud', 'clown', 'coach', 'coast', 'color', 'comet',
    'couch', 'cough', 'could', 'count', 'court', 'cover', 'crack', 'craft', 'crash', 'crawl',
    'crazy', 'cream', 'creek', 'crime', 'crisp', 'cross', 'crowd', 'crown', 'crude', 'cruel',
    'crush', 'curve', 'cycle', 'daily', 'dairy', 'daisy', 'dance', 'death', 'debut', 'delay',
    'dense', 'depth', 'devil', 'diary', 'digit', 'dirty', 'ditch', 'dizzy', 'dodge', 'doing',
  ],
  6: [
    'abroad', 'accept', 'access', 'across', 'action', 'active', 'advice', 'affect', 'afford', 'afraid',
    'agenda', 'almost', 'always', 'amount', 'animal', 'annual', 'answer', 'anyone', 'appeal', 'appear',
    'around', 'arrive', 'artist', 'aspect', 'assist', 'attack', 'attend', 'author', 'avenue', 'backup',
    'ballot', 'banana', 'banner', 'barely', 'barrel', 'basket', 'battle', 'beauty', 'become', 'before',
    'behalf', 'behind', 'belief', 'belong', 'beside', 'better', 'beyond', 'bishop', 'border', 'borrow',
    'bottle', 'bottom', 'bought', 'bounce', 'branch', 'breath', 'bridge', 'bright', 'broken', 'bronze',
    'budget', 'bullet', 'bundle', 'burden', 'bureau', 'button', 'camera', 'cancel', 'candle', 'canvas',
    'canyon', 'carbon', 'career', 'castle', 'casual', 'cattle', 'caught', 'center', 'chance', 'change',
    'charge', 'cheese', 'cherry', 'choice', 'choose', 'chosen', 'church', 'circle', 'clever', 'client',
    'closed', 'closer', 'cloudy', 'coffee', 'column', 'combat', 'comedy', 'coming', 'common', 'cookie',
    'corner', 'cotton', 'county', 'couple', 'course', 'cousin', 'coward', 'cradle', 'create', 'credit',
  ],
};

// Additional real words accepted as guesses (not used as solutions).
export const EXTRA_VALID = {
  4: [
    'fill', 'film', 'find', 'fine', 'fire', 'fish', 'five', 'flag', 'flat', 'flaw',
    'flee', 'flip', 'flow', 'folk', 'font', 'food', 'fool', 'foot', 'fork', 'form',
    'fort', 'foul', 'four', 'free', 'frog', 'from', 'fuel', 'full', 'fund', 'gain',
    'game', 'gate', 'gave', 'gaze', 'gear', 'gift', 'girl', 'give', 'glad', 'glow',
    'goal', 'goat', 'gold', 'golf', 'gone', 'good', 'gown', 'grab', 'gray', 'grew',
    'grid', 'grim', 'grin', 'grip', 'grow', 'gulf', 'hair', 'half', 'hall', 'hand',
    'hang', 'hard', 'harm', 'hate', 'haul', 'have', 'hawk', 'haze', 'head', 'heal',
    'heap', 'hear', 'heat', 'heel', 'held', 'hell', 'help', 'herb', 'herd', 'hero',
    'hide', 'high', 'hill', 'hint', 'hire', 'hold', 'hole', 'holy', 'home', 'hood',
    'hook', 'hope', 'horn', 'hose', 'host', 'hour', 'huge', 'hunt', 'hurt', 'icon',
    'idea', 'idle', 'inch', 'into', 'iron', 'item', 'jail', 'jazz', 'join', 'joke',
  ],
  5: [
    'donor', 'dough', 'dozen', 'drain', 'drama', 'drank', 'drawn', 'dread', 'dream', 'dress',
    'dried', 'drift', 'drill', 'drink', 'drive', 'drone', 'drove', 'drown', 'eager', 'eagle',
    'early', 'earth', 'eaten', 'ebony', 'eight', 'elbow', 'elder', 'elect', 'elite', 'ember',
    'empty', 'enemy', 'enjoy', 'enter', 'entry', 'equal', 'erase', 'error', 'essay', 'event',
    'every', 'exact', 'exile', 'exist', 'extra', 'fable', 'fairy', 'faith', 'false', 'fancy',
    'fatal', 'fault', 'favor', 'feast', 'fence', 'ferry', 'fetch', 'fever', 'fiber', 'field',
    'fifty', 'fight', 'final', 'first', 'flame', 'flash', 'fleet', 'flesh', 'float', 'flock',
    'flood', 'floor', 'flour', 'fluid', 'flush', 'focus', 'force', 'forge', 'forty', 'forum',
    'found', 'frame', 'fraud', 'fresh', 'frost', 'fruit', 'fully', 'funny', 'gauge', 'ghost',
    'giant', 'given', 'glare', 'glass', 'globe', 'gloom', 'glory', 'glove', 'grace', 'grade',
    'grain', 'grand', 'grant', 'grape', 'graph', 'grasp', 'grass', 'grave', 'great', 'greed',
    'green', 'greet', 'grief', 'grill', 'grind', 'groan', 'groom', 'gross', 'group', 'grove',
    'grown', 'guard', 'guess', 'guest', 'guide', 'guilt', 'habit', 'happy', 'harsh', 'haste',
    'hatch', 'haven', 'heart', 'heavy', 'hedge', 'hello', 'hobby', 'honey', 'honor', 'horse',
    'hotel', 'hound', 'house', 'hover', 'human', 'humor', 'hurry', 'ideal', 'image', 'imply',
    'index', 'inner', 'input', 'issue', 'ivory', 'jelly', 'jewel', 'joint', 'juice', 'judge',
  ],
  6: [
    'damage', 'danger', 'dealer', 'debate', 'decade', 'decide', 'defeat', 'defend', 'define', 'degree',
    'demand', 'depend', 'desert', 'design', 'desire', 'detail', 'detect', 'device', 'differ', 'dinner',
    'direct', 'divide', 'doctor', 'dollar', 'domain', 'double', 'dragon', 'drawer', 'driver', 'during',
    'easily', 'eating', 'editor', 'effect', 'either', 'eleven', 'emerge', 'empire', 'employ', 'enable',
    'ending', 'energy', 'engage', 'engine', 'enough', 'ensure', 'entire', 'equity', 'escape', 'estate',
    'ethnic', 'exceed', 'except', 'excess', 'expand', 'expect', 'expert', 'export', 'expose', 'extend',
    'fabric', 'facing', 'factor', 'fairly', 'fallen', 'family', 'famous', 'fasten', 'father', 'fellow',
    'female', 'figure', 'filter', 'finger', 'finish', 'fiscal', 'flavor', 'flight', 'flying', 'follow',
    'forest', 'forget', 'formal', 'format', 'former', 'fossil', 'foster', 'freeze', 'friend', 'frozen',
  ],
};

// Fast lookup of every accepted guess, keyed by length.
export const VALID = Object.fromEntries(
  LENGTHS.map((n) => [n, new Set([...(ANSWERS[n] || []), ...(EXTRA_VALID[n] || [])])]),
);

/** Pool the game draws secret solutions from for a given length. */
export function answerPool(len) {
  return ANSWERS[len] || [];
}

/** True if `word` is in our local accepted-guess set for its length. */
export function isLocalWord(word) {
  const w = (word || '').toLowerCase();
  const set = VALID[w.length];
  return Boolean(set && set.has(w));
}
