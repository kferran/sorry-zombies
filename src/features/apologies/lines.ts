import type { Line } from './ApologyPicker';

/*
 * Every line the hero says lives here. To add one, copy a line and change the text.
 *
 * kind:  'hit' (zombie hurt), 'kill' (zombie down), 'apology' (Space / Sorry! button),
 *        'breakdown' (guilt hits 100), 'summaryWin', 'summaryLose' (end screen)
 * tier:  only for hit and kill lines.
 *        1 = waves 1–3, polite and short
 *        2 = waves 4–7, flustered
 *        3 = waves 8–10, long and philosophical
 * Keep each line under 110 characters so it fits the speech bubble.
 */
export const LINES: Line[] = [
  // ── Hits, tier 1: polite ──────────────────────────────
  { kind: 'hit', tier: 1, text: 'Oh gosh, sorry!' },
  { kind: 'hit', tier: 1, text: 'Pardon me!' },
  { kind: 'hit', tier: 1, text: 'Whoops, my fault.' },
  { kind: 'hit', tier: 1, text: 'So sorry, sir!' },
  { kind: 'hit', tier: 1, text: 'Excuse me, coming through.' },
  { kind: 'hit', tier: 1, text: 'Oof. Sorry about that.' },
  { kind: 'hit', tier: 1, text: 'That one was on me.' },
  { kind: 'hit', tier: 1, text: 'Oh no, are you okay?' },
  { kind: 'hit', tier: 1, text: 'My apologies, ma’am!' },
  { kind: 'hit', tier: 1, text: 'Sorry! Reflex!' },
  { kind: 'hit', tier: 1, text: 'Didn’t see you there. Well, I did. Sorry.' },

  // ── Hits, tier 2: flustered ───────────────────────────
  { kind: 'hit', tier: 2, text: 'Sorry sorry sorry sorry—' },
  { kind: 'hit', tier: 2, text: 'I swear I’m usually a pacifist!' },
  { kind: 'hit', tier: 2, text: 'That looked like it hurt. Did it hurt? Don’t answer.' },
  { kind: 'hit', tier: 2, text: 'I’m going to write you a card about this.' },
  { kind: 'hit', tier: 2, text: 'Please stop walking toward me so I can stop doing this!' },
  { kind: 'hit', tier: 2, text: 'I will absolutely be thinking about this in the shower.' },
  { kind: 'hit', tier: 2, text: 'Is there a manager I can apologize to?' },
  { kind: 'hit', tier: 2, text: 'Ahh! Sorry! That was a peas-ful warning!' },
  { kind: 'hit', tier: 2, text: 'You remind me of my uncle. Sorry, Uncle Gary.' },
  { kind: 'hit', tier: 2, text: 'I’m so sorry, I panic-click.' },

  // ── Hits, tier 3: philosophical ───────────────────────
  { kind: 'hit', tier: 3, text: 'Every pea I fire is a small betrayal of who I meant to be.' },
  { kind: 'hit', tier: 3, text: 'Were you someone’s dentist? I bet you were gentle with the floss.' },
  { kind: 'hit', tier: 3, text: 'If I hurt you to survive, which of us is really the monster? Sorry.' },
  { kind: 'hit', tier: 3, text: 'We are all just shambling toward something, aren’t we?' },
  { kind: 'hit', tier: 3, text: 'I’m sorry. I’ve been sorry since wave one, and I’ll be sorry after.' },
  { kind: 'hit', tier: 3, text: 'Somewhere a houseplant you used to water is wondering where you went.' },
  { kind: 'hit', tier: 3, text: 'I don’t know your name, and that is the saddest part.' },
  { kind: 'hit', tier: 3, text: 'Forgive me. Or don’t. Your feelings are valid, even undead.' },
  { kind: 'hit', tier: 3, text: 'In another life we carpool. Today, sadly, peas.' },
  { kind: 'hit', tier: 3, text: 'Is it violence if I feel this bad about it? Asking for me.' },

  // ── Kills, tier 1 ─────────────────────────────────────
  { kind: 'kill', tier: 1, text: 'Oh no. Oh no no no. I’m so sorry.' },
  { kind: 'kill', tier: 1, text: 'Rest well, buddy. Truly sorry.' },
  { kind: 'kill', tier: 1, text: 'I’ll tell everyone you were very brave.' },
  { kind: 'kill', tier: 1, text: 'That was not how I wanted our first meeting to go.' },
  { kind: 'kill', tier: 1, text: 'Sorry! I’ll send flowers. What do zombies like? Brains? Flowers?' },
  { kind: 'kill', tier: 1, text: 'Goodnight, sweet stranger. So sorry.' },
  { kind: 'kill', tier: 1, text: 'I feel terrible. I want that on the record.' },
  { kind: 'kill', tier: 1, text: 'Sorry! Please leave a review. Kind ones only.' },

  // ── Kills, tier 2 ─────────────────────────────────────
  { kind: 'kill', tier: 2, text: 'I’ve made a mistake. Several. About twelve so far.' },
  { kind: 'kill', tier: 2, text: 'Somebody is going to miss you at bowling night.' },
  { kind: 'kill', tier: 2, text: 'I am writing all your names in a little notebook. Okay, I’m guessing the names.' },
  { kind: 'kill', tier: 2, text: 'Why do you keep doing this to me? I mean— why do I keep doing this to you?' },
  { kind: 'kill', tier: 2, text: 'You had your whole afterlife ahead of you!' },
  { kind: 'kill', tier: 2, text: 'This is the worst block party I have ever hosted.' },
  { kind: 'kill', tier: 2, text: 'That’s it. I’m starting therapy after this.' },
  { kind: 'kill', tier: 2, text: 'If it helps, you were my favorite one. Don’t tell the others.' },

  // ── Kills, tier 3 ─────────────────────────────────────
  { kind: 'kill', tier: 3, text: 'And so another soul returns to the soil, and I return to my apologizing.' },
  { kind: 'kill', tier: 3, text: 'You were hungry. I was scared. History will judge us both, mostly me.' },
  { kind: 'kill', tier: 3, text: 'What is a hero, if not a man who says sorry 300 times before lunch?' },
  { kind: 'kill', tier: 3, text: 'I will carry you with me. Not literally. Emotionally. Sorry.' },
  { kind: 'kill', tier: 3, text: 'The peas were never the answer. They were only ever the question.' },
  { kind: 'kill', tier: 3, text: 'Let it be known: he walked toward me, and I simply did not want to be eaten.' },
  { kind: 'kill', tier: 3, text: 'Is this what being an adult is? Making choices and feeling bad forever?' },
  { kind: 'kill', tier: 3, text: 'Farewell. May your next life have fewer peas and more naps.' },

  // ── Proper apologies (Full Conscience) ────────────────
  { kind: 'apology', text: 'I want you to know that was not okay, and I take full responsibility.' },
  { kind: 'apology', text: 'I hear you. I see you. I hit you. I’m sorry.' },
  { kind: 'apology', text: 'No excuses. I did that. I’m sorry.' },
  { kind: 'apology', text: 'I’d like to formally apologize on behalf of myself and my peas.' },
  { kind: 'apology', text: 'Your pain matters to me. Please hold still while I mean that.' },
  { kind: 'apology', text: 'I’m not sorry you got hurt, I’m sorry I hurt you. Big difference.' },
  { kind: 'apology', text: 'Let’s both take a breath. Well, I will. Sorry.' },
  { kind: 'apology', text: 'That was out of line, and so was I. Sincerely sorry.' },
  { kind: 'apology', text: 'I’m working on myself. This is part of the work. Sorry.' },

  // ── Breakdowns (guilt hits 100) ───────────────────────
  { kind: 'breakdown', text: 'I can’t do this anymore! I need a minute!' },
  { kind: 'breakdown', text: 'Everyone I meet ends up hurt! Is it me? IT’S ME!' },
  { kind: 'breakdown', text: '*sobbing* they all had little shoes...' },
  { kind: 'breakdown', text: 'Hold on. I’m having a feeling. A big one.' },
  { kind: 'breakdown', text: 'I just need everyone to stop for one second and let me be sad.' },

  // ── End screen ────────────────────────────────────────
  { kind: 'summaryWin', text: 'You survived. Your therapist is going to be very busy.' },
  { kind: 'summaryWin', text: 'The horde is gone. The guilt is forever.' },
  { kind: 'summaryWin', text: 'Victory! Remember to write those sympathy cards.' },
  { kind: 'summaryWin', text: 'You won. Somewhere, a zombie mom is very disappointed in you.' },
  { kind: 'summaryLose', text: 'They got you. Honestly, after all that, fair.' },
  { kind: 'summaryLose', text: 'You were eaten, which some would call justice.' },
  { kind: 'summaryLose', text: 'At least now you know how they felt.' },
  { kind: 'summaryLose', text: 'Overwhelmed, outnumbered, and still apologizing.' },
];
