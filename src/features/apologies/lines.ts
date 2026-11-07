import type { Line } from './ApologyPicker';

/*
 * Every line the hero says lives here. To add one, copy a line and change the text.
 *
 * kind:  'hit' (enemy hurt), 'kill' (enemy put down), 'rise' (a skeleton climbs out of its grave),
 *        'hurt' (the hero gets hit), 'ghostKill' / 'catKill' (a ghost / a hell-cat is put down;
 *        in a catKill line {name} becomes the cat's name, and a line without it gets
 *        "Sorry, <name>. " in front),
 *        'apology' (bow / Sorry! button), 'breakdown' (guilt hits 100),
 *        'preApology' (a guilty swing stops short), 'levelCleared' (end-of-level card),
 *        'bossJudge' (the Groundskeeper judges your apologies), 'bossDisappointed' (you hit it
 *        while it listens), 'bossAccept' (it accepts a bow), 'bossForgive' (it forgives you),
 *        'bossDefeat' (it fades out), 'summaryWin', 'summaryLose', 'summaryForgiven' (end screen)
 * tier:  only for hit, kill and rise lines.
 *        1 = early levels (arena waves 1–3), polite and short
 *        2 = middle levels (arena waves 4–7), flustered
 *        3 = late levels and the boss (arena waves 8–10), long and philosophical
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
  { kind: 'hit', tier: 2, text: 'Ahh! Sorry! That was a whip-ful warning!' },
  { kind: 'hit', tier: 2, text: 'You remind me of my uncle. Sorry, Uncle Gary.' },
  { kind: 'hit', tier: 2, text: 'I’m so sorry, I panic-click.' },

  // ── Hits, tier 3: philosophical ───────────────────────
  { kind: 'hit', tier: 3, text: 'Every crack of this whip is a small betrayal of who I meant to be.' },
  { kind: 'hit', tier: 3, text: 'Were you someone’s dentist? I bet you were gentle with the floss.' },
  { kind: 'hit', tier: 3, text: 'If I hurt you to survive, which of us is really the monster? Sorry.' },
  { kind: 'hit', tier: 3, text: 'We are all just shambling toward something, aren’t we?' },
  { kind: 'hit', tier: 3, text: 'I’m sorry. I’ve been sorry since wave one, and I’ll be sorry after.' },
  { kind: 'hit', tier: 3, text: 'Somewhere a houseplant you used to water is wondering where you went.' },
  { kind: 'hit', tier: 3, text: 'I don’t know your name, and that is the saddest part.' },
  { kind: 'hit', tier: 3, text: 'Forgive me. Or don’t. Your feelings are valid, even undead.' },
  { kind: 'hit', tier: 3, text: 'In another life we carpool. Today, sadly, whips.' },
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
  { kind: 'kill', tier: 3, text: 'The whip was never the answer. It was only ever the question.' },
  { kind: 'kill', tier: 3, text: 'Let it be known: he walked toward me, and I simply did not want to be eaten.' },
  { kind: 'kill', tier: 3, text: 'Is this what being an adult is? Making choices and feeling bad forever?' },
  { kind: 'kill', tier: 3, text: 'Farewell. May your next life have fewer whips and more naps.' },

  // ── Rising from graves, tier 1 ────────────────────────
  { kind: 'rise', tier: 1, text: 'Oh! Good evening. Don’t mind me.' },
  { kind: 'rise', tier: 1, text: 'Please, take your time getting up.' },
  { kind: 'rise', tier: 1, text: 'Sorry to wake you!' },
  { kind: 'rise', tier: 1, text: 'Careful, the ground is a bit loose there.' },

  // ── Rising from graves, tier 2 ────────────────────────
  { kind: 'rise', tier: 2, text: 'Oh no, another one! Hello! Please be friendly!' },
  { kind: 'rise', tier: 2, text: 'I just want you to know I did not dig that.' },
  { kind: 'rise', tier: 2, text: 'Stay down! Not rudely! Just, you know, optionally!' },
  { kind: 'rise', tier: 2, text: 'I’m only here for the quiet. Everyone is so alive tonight.' },

  // ── Rising from graves, tier 3 ────────────────────────
  { kind: 'rise', tier: 3, text: 'Of course you rise. I would, too, if I had been left here this long.' },
  { kind: 'rise', tier: 3, text: 'Every grave is a promise someone made, and I am about to break it.' },
  { kind: 'rise', tier: 3, text: 'You deserved a long rest. I deserve whatever happens next.' },
  { kind: 'rise', tier: 3, text: 'Up you come, and here I stand with a whip. What a way to meet.' },

  // ── Hero gets hit ─────────────────────────────────────
  { kind: 'hurt', text: 'Ow! No, no, that’s fair.' },
  { kind: 'hurt', text: 'I deserved that. Ow.' },
  { kind: 'hurt', text: 'Ouch! Thank you for the feedback!' },
  { kind: 'hurt', text: 'Ah! Okay! We’re even now! Are we even?' },
  { kind: 'hurt', text: 'That stung, but I respect the commitment.' },
  { kind: 'hurt', text: 'Ow. I’m not mad. I’m just a little bit mad.' },

  // ── Ghosts and hell-cats ──────────────────────────────
  { kind: 'ghostKill', text: 'I’m so sorry. I didn’t know you could be put down twice.' },
  { kind: 'ghostKill', text: 'Go gently, spirit. I’ll leave a light on.' },
  { kind: 'ghostKill', text: 'Was that a ghost, or just a very sad sheet?' },
  { kind: 'ghostKill', text: 'Oh dear. Now you’re more transparent than before.' },
  { kind: 'ghostKill', text: 'I hope the other side has better manners than I do.' },
  { kind: 'catKill', text: 'It had a name tag! It said {name}! Oh no!' },
  { kind: 'catKill', text: 'Someone is looking for you, {name}. I’m so sorry.' },
  { kind: 'catKill', text: 'Bad kitty. Good kitty. Sorry, kitty.' },
  { kind: 'catKill', text: 'I only wanted to pet you. From a distance. With a whip.' },
  { kind: 'catKill', text: '{name}? Was your name {name}? It’s on the tag. I’m so sorry.' },

  // ── Guilty swing stops short ──────────────────────────
  { kind: 'preApology', text: 'I’m about to hit you and I’m so sorry!' },
  { kind: 'preApology', text: 'Sorry in advance. Actually, I can’t. Sorry.' },
  { kind: 'preApology', text: 'I was going to swing, but I got sad first.' },
  { kind: 'preApology', text: 'Forgive me for what I almost did.' },
  { kind: 'preApology', text: 'This is going to hurt me more. Wait, no, you. Sorry.' },

  // ── Level cleared ─────────────────────────────────────
  { kind: 'levelCleared', text: 'It’s quiet now. Too quiet. My fault.' },
  { kind: 'levelCleared', text: 'We made it through. I made it through. Sorry.' },
  { kind: 'levelCleared', text: 'The path is clear. I left a lot of apologies back there.' },
  { kind: 'levelCleared', text: 'Onward. I’ll be sorry on the way.' },
  { kind: 'levelCleared', text: 'Another stretch of cemetery, apologized across.' },
  { kind: 'levelCleared', text: 'I’d like to thank everyone I had to whip. And apologize. Mostly apologize.' },

  // ── The Groundskeeper ─────────────────────────────────
  { kind: 'bossJudge', text: 'Two hundred years I have tended these graves. Now you will explain yourself.' },
  { kind: 'bossJudge', text: 'You have a great many apologies. Let us see how many were meant.' },
  { kind: 'bossJudge', text: 'I hear every word you say in my cemetery. Say something true.' },
  { kind: 'bossJudge', text: 'Speak, little whip-bearer. I am listening. I am always listening.' },
  { kind: 'bossDisappointed', text: 'You strike me while I listen? How very disappointing.' },
  { kind: 'bossDisappointed', text: 'I was about to be kind. Now I am only tired.' },
  { kind: 'bossDisappointed', text: 'Is this what your apology looks like? A whip?' },
  { kind: 'bossDisappointed', text: 'Two hundred years, and still the living cannot wait their turn.' },
  { kind: 'bossAccept', text: 'A bow. Yes. That is a beginning.' },
  { kind: 'bossAccept', text: 'I accept this one. Do not waste it.' },
  { kind: 'bossAccept', text: 'Humility becomes you. Please keep it.' },
  { kind: 'bossAccept', text: 'Rise, then. We are not finished.' },
  { kind: 'bossForgive', text: 'You are forgiven, little one. The cemetery is yours to leave.' },
  { kind: 'bossForgive', text: 'Enough. I have heard what I needed. Go in peace.' },
  { kind: 'bossForgive', text: 'You carried every apology to the end. That counts for something.' },
  { kind: 'bossForgive', text: 'I forgive you. Please also forgive yourself. Gently.' },
  { kind: 'bossDefeat', text: 'So the old keeper rests at last.' },
  { kind: 'bossDefeat', text: 'Fine. Keep the cemetery. It was always lonely anyway.' },
  { kind: 'bossDefeat', text: 'I fade... but the graves remember what you did.' },
  { kind: 'bossDefeat', text: 'Two hundred years of work, undone by one whip. How rude.' },

  // ── Proper apologies (Full Conscience) ────────────────
  { kind: 'apology', text: 'I want you to know that was not okay, and I take full responsibility.' },
  { kind: 'apology', text: 'I hear you. I see you. I hit you. I’m sorry.' },
  { kind: 'apology', text: 'No excuses. I did that. I’m sorry.' },
  { kind: 'apology', text: 'I’d like to formally apologize on behalf of myself and my whip.' },
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
  { kind: 'summaryForgiven', text: 'The Groundskeeper forgave you. Try to forgive yourself next.' },
  { kind: 'summaryForgiven', text: 'Forgiven by a ghost. That is a very specific honor.' },
  { kind: 'summaryForgiven', text: 'You said sorry until it counted. Well done, truly.' },
  { kind: 'summaryForgiven', text: 'The cemetery is quiet, the keeper is at peace, and you can finally go home.' },
];
