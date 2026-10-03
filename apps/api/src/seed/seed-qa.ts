/**
 * Seed the Q&A area with community content. Idempotent: questions are
 * upserted by slug (existing rows are left untouched), members by username.
 * Finishes by reindexing `searchVec` so hybrid search works immediately.
 *
 * Run: npm run seed:qa
 */
import { prisma } from '../db/prisma';
import { hashPassword } from '../lib/password';
import { slugify } from '../lib/slug';
import { refreshSearchVecs } from '../lib/search';
import { logQuestionAction } from '../lib/question-log';

interface SeedMember {
  username: string;
  displayName: string;
  pronouns: string;
}

interface SeedAnswer {
  author: string;
  body: string;
  best?: boolean;
  daysAgo: number;
}

interface SeedQuestion {
  author: string;
  title: string;
  topic: string;
  body: string;
  daysAgo: number;
  views: number;
  answers: SeedAnswer[];
  /** votes: [answerIndex, voterUsername, value] — value 1 = up, -1 = down */
  votes: Array<[number, string, 1 | -1]>;
}

const MEMBERS: SeedMember[] = [
  { username: 'maya_r', displayName: 'Maya', pronouns: 'she/her' },
  { username: 'devon_k', displayName: 'Devon', pronouns: 'he/him' },
  { username: 'sam_k', displayName: 'Sam', pronouns: 'they/them' },
  { username: 'alex_t', displayName: 'Alex', pronouns: 'he/him' },
  { username: 'priya_s', displayName: 'Priya', pronouns: 'she/her' },
  { username: 'noor_a', displayName: 'Noor', pronouns: 'she/her' }
];

const QUESTIONS: SeedQuestion[] = [
  // ---------- coming-out ----------
  {
    author: 'priya_s',
    title: 'How do I come out to my parents when my family is very religious?',
    topic: 'coming-out',
    body: 'I love my parents and my faith, but I can feel the conversation coming — I started seeing someone and I do not want to lie to them. Every time I imagine telling them, I picture disappointment. How do people do this without blowing up the whole family?',
    daysAgo: 6,
    views: 148,
    answers: [
      {
        author: 'maya_r',
        best: true,
        daysAgo: 5,
        body: `A few things I wish someone had told me:

- **Safety first, always.** If you depend on them (housing, tuition), you are allowed to wait. Coming out is a choice, not an obligation with a deadline.
- **Tell the calmest one first.** If one parent is softer, start there. One ally inside the house changes everything.
- **Consider a letter.** It lets them react privately, without you watching their face. You can follow up in person a day or two later.
- **Line up support before you do it.** A friend to text, someone to stay with, a plan for the evening. You deserve backup.
- **Their first reaction is not their forever reaction.** Shock, silence, even anger — many parents come around. The first 72 hours are the loudest.

You are not doing anything wrong by being honest about who you are.`
      },
      {
        author: 'devon_k',
        daysAgo: 5,
        body: `One reframe that helped me: you are not asking them to change their theology tonight. You are telling them something true about their kid.

If faith matters to them, you can say so directly: "This doesn't have to threaten what we believe. I'm still the same person who calls you every Sunday." Many families hold both — slowly, imperfectly. Give it time and keep showing up as yourself.`
      }
    ],
    votes: [[0, 'devon_k', 1], [0, 'alex_t', 1], [0, 'sam_k', 1], [1, 'maya_r', 1]]
  },
  {
    author: 'alex_t',
    title: 'I came out to my sister and she told everyone. How do I handle it?',
    topic: 'coming-out',
    body: 'I finally told my sister something I had kept secret for years, and within a week half the family knew — plus some of her friends I have never met. I am furious and embarrassed at the same time. Where do I even start?',
    daysAgo: 11,
    views: 96,
    answers: [
      {
        author: 'sam_k',
        best: true,
        daysAgo: 10,
        body: `Your anger makes complete sense. Sharing something this big without asking is a betrayal of trust, even when it came from excitement rather than malice.

Have one direct conversation with her, calmly and privately: **"When you shared something this big without checking with me, it made me feel unsafe with you. I need you to let me decide who hears what, from me."** Then decide what the information diet looks like going forward — she can absolutely be trusted again, just with less.

For everyone else: get ahead of it yourself. One short call or message to the people who actually matter to you — "I told my sister, word travels, and I wanted you to hear it from me." You take back the narrative in about ten minutes.`
      },
      {
        author: 'noor_a',
        daysAgo: 9,
        body: `Also worth remembering: you cannot un-ring the bell, so spend your energy on damage control, not rage. The people who react badly were going to react badly eventually; the people who love you will mostly just say "okay, thanks for telling me."

And tell your sister what you need next time — most siblings genuinely do not get how high the stakes feel from the inside.`
      }
    ],
    votes: [[0, 'maya_r', 1], [0, 'priya_s', 1], [0, 'noor_a', 1], [1, 'sam_k', 1]]
  },
  {
    author: 'sam_k',
    title: 'Do I actually have to come out, or can I just live my life?',
    topic: 'coming-out',
    body: 'Everyone keeps telling me I should come out, but honestly I am fine just being me around the people who know. I do not owe long speeches to relatives. Is there some rule I am missing?',
    daysAgo: 21,
    views: 132,
    answers: [
      {
        author: 'alex_t',
        best: true,
        daysAgo: 20,
        body: `There is no rule. Coming out is not a ceremony you owe anyone — it is an ongoing, situational choice you make for the rest of your life.

Some contexts are worth it because they make your life better: close friends, a partner, a doctor who needs the full picture. Other contexts — judgmental coworkers, distant relatives — you are allowed to keep on a need-to-know basis. Privacy is not cowardice; in some situations it is wisdom.

The only real test: does telling this person make my life more honest and more free, or less safe? Answer that per person, and you are done.`
      },
      {
        author: 'maya_r',
        daysAgo: 19,
        body: `The "you should come out" pressure usually comes from people who feel it is a milestone. For many of us it is not a milestone at all — it is admin. Do the admin where it helps you, skip it where it does not, and never let anyone guilt you into a conversation you are not ready for.`
      }
    ],
    votes: [[0, 'sam_k', 1], [0, 'noor_a', 1], [0, 'devon_k', 1], [1, 'alex_t', 1]]
  },
  {
    author: 'noor_a',
    title: 'How do I come out at work without it becoming a whole thing?',
    topic: 'coming-out',
    body: 'I joined a new team and people keep asking if I have a husband, a boyfriend, etc. I want to be honest but I absolutely do not want a company-wide moment, balloons, or an HR announcement. What is the low-key way to do this?',
    daysAgo: 15,
    views: 87,
    answers: [
      {
        author: 'devon_k',
        best: true,
        daysAgo: 14,
        body: `Casual and matter-of-fact beats a formal announcement every time. People take their cue from your tone.

- Drop it in natural conversation: "my girlfriend and I went hiking this weekend."
- Start with the one colleague you actually like — one ally on a team changes the whole room.
- An easy opener that does nothing loudly: pronouns in your email signature or chat profile.
- Check the handbook once so you know where HR stands, then never think about it again.

You control the scope. It is a sentence, not a speech.`
      },
      {
        author: 'maya_r',
        daysAgo: 13,
        body: `If the company has an LGBTQ+ employee group, join it quietly — instant allies, and they will handle the awkward questions so you do not have to.

If someone misgenders you or makes an assumption, one calm correction is enough: "Actually, it's she." No essay, no anger required. Repeating it boringly is how it sticks.`
      }
    ],
    votes: [[0, 'noor_a', 1], [0, 'alex_t', 1], [1, 'devon_k', 1]]
  },

  // ---------- identity ----------
  {
    author: 'priya_s',
    title: 'Am I bisexual if I have only ever dated one gender?',
    topic: 'identity',
    body: 'I have known I was attracted to more than one gender since school, but my dating history is all men because that is who I happened to meet. Online people say I only count if I have "done the field" with everyone. That cannot be right, can it?',
    daysAgo: 8,
    views: 173,
    answers: [
      {
        author: 'maya_r',
        best: true,
        daysAgo: 8,
        body: `That is absolutely not right. Orientation describes **who you are attracted to**, not your dating résumé.

Nobody asks a straight woman who has only dated one man whether she is "sure" she is straight. You do not have to audition for a label — if it describes your inner experience accurately, it is yours. Plenty of bisexual people end up with one gender for a season, a decade, or a lifetime and are no less bisexual for it.

Your history reflects who you happened to meet, not the edges of your capacity.`
      },
      {
        author: 'sam_k',
        daysAgo: 7,
        body: `Also: labels are tools, not contracts. Take one for a test drive and see if it makes your life feel more honest. If it stops fitting later, you are allowed to update — that is not "lying," that is paying attention to yourself.`
      }
    ],
    votes: [[0, 'priya_s', 1], [0, 'devon_k', 1], [0, 'alex_t', 1], [0, 'sam_k', 1], [1, 'maya_r', 1]]
  },
  {
    author: 'sam_k',
    title: 'How do I tell if I am non-binary or just not very feminine?',
    topic: 'identity',
    body: 'I am assigned female, I have never related to dresses and makeup, and lately "she" feels oddly loud. But maybe I am just a tomboy who is over feminine expectations? There seems to be a quiz for everything and I cannot find one that fits.',
    daysAgo: 17,
    views: 121,
    answers: [
      {
        author: 'devon_k',
        best: true,
        daysAgo: 16,
        body: `There is no quiz — and you do not need to solve this to be valid.

One useful distinction: look for **euphoria**, not only discomfort. When someone used they/them for me before I had words for anything, there was a click — a small rightness that had nothing to do with hating what I was. Discomfort can come from sexism alone; the click is usually gender.

Try reversible experiments for a month: different clothes, a different name in a group chat, they/them with two safe friends. Nothing is binding, and whatever you learn is useful either way.`
      },
      {
        author: 'priya_s',
        daysAgo: 15,
        body: `Separate two questions that get tangled: **"Do I like feminine things?"** and **"What am I?"** A woman can hate dresses and still be a woman. Expression and gender are different axes — you can be butch, femme, both, neither, and any of it can belong to any gender.

If the she/her loudness keeps showing up when nothing else is wrong, that is worth sitting with — gently, with no deadline.`
      }
    ],
    votes: [[0, 'sam_k', 1], [0, 'maya_r', 1], [0, 'noor_a', 1], [1, 'devon_k', 1]]
  },
  {
    author: 'maya_r',
    title: 'I am 42 and just realized I am gay. Is it too late?',
    topic: 'identity',
    body: 'Married, kids, the whole plan — and somewhere in the middle of it I admitted the truth to myself. I feel like I lost my twenties and now everyone else got a head start. Is there actually a community for people like me, or am I going to be the weird old person at the club?',
    daysAgo: 29,
    views: 214,
    answers: [
      {
        author: 'alex_t',
        best: true,
        daysAgo: 28,
        body: `I came out at 41, so I can be specific: no, it is not too late, and no, you will not be the weird old person.

What you gain in your forties that you did not have in your twenties: you know who you are, you can afford to be picky, and you can smell inauthenticity from across the room. Dating gets *easier* when you stop performing.

And the timeline grief is real — I am not going to pretend otherwise. You can grieve the years and be thrilled about the ones ahead in the same week. That is normal. You did not "waste" those years; you survived them as yourself. Now you get the rest.`
      },
      {
        author: 'noor_a',
        daysAgo: 26,
        body: `There are whole communities for later-in-life queers — meetups explicitly for people who came out after thirty, parents' groups, weekend groups. You will walk into a room and think "oh, THESE are my people," because everyone there also has a before and an after.

Second acts are not epilogues. Some of the most interesting people I know started over at forty, fifty, sixty.`
      }
    ],
    votes: [[0, 'maya_r', 1], [0, 'priya_s', 1], [0, 'sam_k', 1], [0, 'noor_a', 1], [1, 'alex_t', 1]]
  },

  // ---------- gender / transition ----------
  {
    author: 'noor_a',
    title: 'How do I find a doctor who actually knows trans healthcare?',
    topic: 'gender',
    body: 'My GP changes the subject whenever gender comes up and I do not know where to start. I want someone who has done this before, not someone who is learning on me. How do people find these doctors?',
    daysAgo: 9,
    views: 105,
    answers: [
      {
        author: 'devon_k',
        best: true,
        daysAgo: 9,
        body: `A practical search order that works:

1. **Ask a local LGBTQ+ center or community group** — their referral list is the single best source; doctors get on it by actually being good.
2. **Call the clinic before booking** and ask directly: *"Do you have patients on hormone therapy? What does your process look like?"* Confident answer = good sign. Hesitation = keep looking.
3. **Informed-consent clinics** skip gatekeeping — they explain options, check bloodwork, and treat you like an adult.
4. Red flags: requiring you to "prove" who you are, long mandatory psych referrals with no path, or refusing to use your name before you have any paperwork.

Also worth checking: does the front desk ask your pronouns at intake? Small signals predict big ones.`
      },
      {
        author: 'sam_k',
        daysAgo: 8,
        body: `Reviews in trans forums and Reddit threads for your city are surprisingly accurate — search "informed consent + your city" and you will usually find current, specific experiences. Pharmacists are also underrated allies: they see which clinics send reliable prescriptions and will often tell you straight up.`
      }
    ],
    votes: [[0, 'sam_k', 1], [0, 'maya_r', 1], [0, 'priya_s', 1], [1, 'devon_k', 1]]
  },
  {
    author: 'alex_t',
    title: 'Is it okay to try out pronouns before I am sure I am trans?',
    topic: 'gender',
    body: 'A friend offered to call me they/them for a while and I said yes, now I feel like I started something I cannot take back. Am I allowed to experiment, or does trying it out mean I have to be "officially" something?',
    daysAgo: 24,
    views: 88,
    answers: [
      {
        author: 'sam_k',
        best: true,
        daysAgo: 23,
        body: `Trying them on is exactly how you find out. There is no admission process — pronouns are not a contract you sign.

Ask your friend to use them for two weeks. Notice what it feels like when it lands right, and what it feels like when it does not. Both answers are data. If they stop feeling right, you say "thanks, back to she/her please" and everyone moves on with their lives — genuinely, nobody keeps score.

The only way to lose here is to never test anything and stay stuck in the question mark.`
      },
      {
        author: 'devon_k',
        daysAgo: 22,
        body: `Low-cost experiments are your friends: a different name in a game or group chat, clothes in a different section of the store, a photo edit. None of it is a commitment; all of it tells you something. People who are "just curious" usually feel neutral after a month. People where it clicks feel *relief*. Watch for the relief.`
      }
    ],
    votes: [[0, 'maya_r', 1], [0, 'noor_a', 1], [0, 'alex_t', 1], [1, 'sam_k', 1]]
  },
  {
    author: 'maya_r',
    title: 'What is actually involved in starting HRT?',
    topic: 'gender',
    body: 'I have been reading forums for months and now I am more confused than when I started — some people say gatekeeping, some say informed consent, everyone describes a different timeline. What does the realistic first six months look like?',
    daysAgo: 13,
    views: 156,
    answers: [
      {
        author: 'devon_k',
        best: true,
        daysAgo: 12,
        body: `The realistic version, stripped of forum noise:

**Month 0–1:** Find a clinician (informed-consent is the easy path in most places now). Baseline bloodwork. A conversation about your goals, medical history, and — worth raising early — **fertility preservation**, because hormones can affect it and it is easier to plan before than after. You leave with a prescription or a short to-do list.

**Month 1–3:** Second bloodwork, dose adjustments. Emotion often shifts first. Physical changes are slow — months, not weeks — which is the part forums underplay.

**Month 3–6:** Changes accumulate gradually. You settle into a rhythm: bloods every few months, prescription refills, life continuing.

Two firm notes: **do not DIY** without medical monitoring — the risks are real and bloodwork exists for a reason — and having someone in your corner (friend, therapist, support group) makes the slow parts easier. This is a marathon with checkpoints, not a leap.`
      },
      {
        author: 'noor_a',
        daysAgo: 11,
        body: `Prep list that served me well: book bloods before you need them, line up a therapist even if you feel fine (you will have feelings, everyone does), and make a small private log — monthly photos and notes — because day-to-day you will feel like nothing is happening, and then six months later the photos disagree with you.`
      }
    ],
    votes: [[0, 'sam_k', 1], [0, 'maya_r', 1], [0, 'priya_s', 1], [0, 'alex_t', 1], [1, 'devon_k', 1]]
  },

  // ---------- relationships ----------
  {
    author: 'priya_s',
    title: 'My partner is not out to their family and the holidays are exhausting me',
    topic: 'relationships',
    body: 'We have been together two years. At their family events I am "the friend" and I smile through dinner while holding their hand under the table. I understand fear. I am also tired of pretending. How do couples actually get through this without resentment building?',
    daysAgo: 19,
    views: 143,
    answers: [
      {
        author: 'maya_r',
        best: true,
        daysAgo: 18,
        body: `Talk about this **on a calm Tuesday, not at the dinner table.** Three things to cover:

- **Agree on the script together.** "Friend" vs. a softer truth vs. full disclosure — you should both know the plan before you walk in, so you are improvising as a team.
- **Name your actual need.** Is it being acknowledged? Not lying? Fewer events? "I need to be introduced as your partner to at least the people we see every year" is a concrete ask.
- **Give yourself an exit.** You are allowed to attend fewer events, arrive separately, or leave after two hours. Patience for their process does not mean invisibility on demand.

If secrecy has been static for years with no movement, that is a different conversation — possibly with a couples counselor as referee. If it is slow but real (small disclosures, private intimacy, a plan), it may just be a long road. Resentment grows in silence, so say the tired part out loud, kindly.`
      },
      {
        author: 'devon_k',
        daysAgo: 17,
        body: `One nuance from the other side: for some people this is about real safety — housing, inheritance, immigration, being cut off financially. That does not erase your pain, but it changes the stakes. What helped my partner and me was small acts of private recognition that cost nothing publicly: she is my emergency contact, my family calls her my partner, we take couple photos in our own home. The public fiction stayed for a while; the private reality was never fake.`
      }
    ],
    votes: [[0, 'priya_s', 1], [0, 'sam_k', 1], [0, 'alex_t', 1], [1, 'maya_r', 1]]
  },
  {
    author: 'devon_k',
    title: 'How do I meet people outside of dating apps?',
    topic: 'relationships',
    body: 'Apps make me feel like a product. I want to meet someone in the wild, but every suggestion I get is "go to a bar," and bars are not really my scene. Where do queer adults actually meet each other?',
    daysAgo: 26,
    views: 167,
    answers: [
      {
        author: 'alex_t',
        best: true,
        daysAgo: 25,
        body: `The trick: **recurring beats one-off.** A single event gives you one awkward night; the same group every week gives you familiarity, which is where almost all real connections come from.

- Queer sports leagues (run, football, climbing, volleyball) — no skill required, they need bodies.
- Volunteering — Pride, community centers, helplines, fundraisers. You meet the invested people.
- Choir, book club, board game night, film screenings, hiking groups.
- Classes where you will see the same faces: ceramics, language, dance.

Go three times before you decide it is not for you. First time everyone is nervous; by the third you are the familiar face someone saves a seat for. And yes — say yes to the awkward coffee. Half of adult friendship and dating is just showing up hungry for connection.`
      },
      {
        author: 'noor_a',
        daysAgo: 23,
        body: `Also: friends of friends is still the number one way couples meet. Tell your circle you are open to being set up — not desperately, just honestly. House parties beat bars for meeting actual humans, and queer people throw a lot of them.`
      }
    ],
    votes: [[0, 'maya_r', 1], [0, 'sam_k', 1], [0, 'noor_a', 1], [0, 'priya_s', 1], [1, 'devon_k', 1]]
  },
  {
    author: 'sam_k',
    title: 'How do I tell if I am being fetishized or genuinely desired?',
    topic: 'relationships',
    body: 'Dating as a trans person, I keep meeting people who are obsessed with one specific thing about me and nothing else. The interest feels intense but strangely hollow. Is there a way to tell early who wants ME versus who wants a fantasy?',
    daysAgo: 33,
    views: 118,
    answers: [
      {
        author: 'devon_k',
        best: true,
        daysAgo: 32,
        body: `Early signals, in rough order of reliability:

- **Do they ask boring questions?** Fetishizers want access to the interesting part. Partners ask what you do, what annoyed you today, what your sister said. Curiosity about your *ordinary life* is the greenest flag there is.
- **Do they know what you actually told them?** Pronouns used right without prompts, remembering your job interview — attention vs. projection.
- **Do they want you in daylight?** Someone who only shows up at night, never tags you, never meets your friends is managing an image, not building something.
- **How do they talk about people like you in general?** Listen to the "jokes."

Trust the hollow feeling — it is usually accurate. You owe nobody a trial period while you collect evidence.`
      },
      {
        author: 'priya_s',
        daysAgo: 30,
        body: `The one-question test I use: mention something genuinely unglamorous about yourself — a weird hobby, a family obligation, a bad week — and see whether they lean in or lose interest. Fantasy loses interest in logistics. People fall in love with logistics.`
      }
    ],
    votes: [[0, 'maya_r', 1], [0, 'alex_t', 1], [0, 'noor_a', 1], [1, 'sam_k', 1]]
  },

  // ---------- mental health ----------
  {
    author: 'alex_t',
    title: 'I feel completely alone in this. Is that normal?',
    topic: 'mental-health',
    body: `I have not told a single person. I go to work, come home, scroll through other people's lives, and feel like I am the only person carrying this. Everyone else seems to have people. Is this just what it feels like before things get better, or is this just what it feels like?`,
    daysAgo: 4,
    views: 189,
    answers: [
      {
        author: 'maya_r',
        best: true,
        daysAgo: 4,
        body: `It is normal — probably the single most universal queer experience there is. Almost every one of us has had the version of this night: the ceiling, the phone, the feeling of being the only one.

Two things that are true at once:

1. **The loneliness is real and worth taking seriously.** It is not a character flaw and it is not evidence that you are broken or unwantable. It is what happens when you carry something big alone.
2. **It shrinks with contact, not with shame.** Not with "when I am ready" — that day never arrives on its own. One small connection a week: a message in a community group, one honest text to a safe friend, one event on the calendar.

You do not have to tell your whole story to take a first step. You just have to be in a room — physical or virtual — with one other person who gets it. That is how the ceiling nights end.`
      },
      {
        author: 'priya_s',
        daysAgo: 3,
        body: `If the heaviness has been there most days for weeks, please talk to a professional as well as a community — a good therapist gives you a place to set it all down, and there is no prerequisite of being "far enough along" to deserve one. If you are in crisis, reach a local helpline tonight — you do not have to white-knuckle this part.`
      }
    ],
    votes: [[0, 'sam_k', 1], [0, 'devon_k', 1], [0, 'noor_a', 1], [0, 'priya_s', 1], [1, 'maya_r', 1]]
  },
  {
    author: 'priya_s',
    title: 'How do I find a therapist who actually understands queer issues?',
    topic: 'mental-health',
    body: 'I tried therapy once and spent the first three sessions explaining what bisexuality is. I left more exhausted than when I arrived. How do I find someone where that is not the whole agenda?',
    daysAgo: 37,
    views: 94,
    answers: [
      {
        author: 'noor_a',
        best: true,
        daysAgo: 36,
        body: `Screen them **on the phone before you book.** Two questions do most of the work:

1. *"What is your experience working with LGBTQ+ clients?"*
2. *"Are you familiar with [whatever you actually want to work on — anxiety, family, transition]?"*

A good therapist answers warmly and specifically. A mediocre one gets vague or defensive — that is your answer, hang up and dial the next one.

Directories with identity filters help (local LGBTQ+ center referrals are gold), but the phone test is better than any profile. And remember: **the first session is an interview and you are the employer.** If it is not a fit, you are allowed to leave — that is not failing at therapy, that is doing therapy correctly.`
      },
      {
        author: 'alex_t',
        daysAgo: 34,
        body: `One reframe: "affirming" is the floor, not the ceiling. You are also allowed to want someone competent at the actual thing you came in for — grief, panic, work stress. The best fit is a therapist who gets your context *and* does not make your context the whole session.`
      }
    ],
    votes: [[0, 'maya_r', 1], [0, 'sam_k', 1], [1, 'noor_a', 1]]
  },
  {
    author: 'noor_a',
    title: 'Does family rejection ever stop hurting?',
    topic: 'mental-health',
    body: 'It has been three years since my parents stopped speaking to me. Everyone says it gets better with time. It has not. I need honesty from people who have actually been through this — does it actually get better, or do you just get better at hiding it?',
    daysAgo: 47,
    views: 231,
    answers: [
      {
        author: 'alex_t',
        best: true,
        daysAgo: 46,
        body: `Honest answer, from someone eight years in: **it softens rather than vanishes.** Anyone who tells you it just stops has not lived it.

What actually changes over time:

- The grief goes from daily weather to seasonal. Holidays still sting; ordinary Tuesdays stop ambush-ing you.
- You build a life that is not waiting for approval — a partner, friends who know all of you, a home where you are not performing. That life does not fill the exact parental-shaped hole, but it makes the room bigger than the hole.
- Some families come back eventually, on new terms. Some do not. Either way, you stop arranging yourself around the question.

Therapy genuinely helps carry this one — grief this specific deserves a professional co-pilot. And "it gets better" was never meant as a shrug; it was meant as a promise that you are allowed to build something good *while* it still hurts. You are not behind.`
      },
      {
        author: 'maya_r',
        daysAgo: 44,
        body: `Boundaries helped me more than forgiveness did. Low or no contact during the healing period is a legitimate choice, not a failure of love. The goal is not to reach some movie-scene reconciliation — it is to get to a place where their choices no longer dictate your week. That part is on your timeline.`
      }
    ],
    votes: [[0, 'noor_a', 1], [0, 'maya_r', 1], [0, 'sam_k', 1], [0, 'priya_s', 1], [0, 'devon_k', 1], [1, 'alex_t', 1]]
  },

  // ---------- health ----------
  {
    author: 'devon_k',
    title: 'How often should I actually get tested for STIs?',
    topic: 'health',
    body: 'There is a lot of conflicting advice — after every partner, every few months, only if something feels wrong. I would like a schedule a normal person can keep, and I would like to stop feeling weird walking into the clinic.',
    daysAgo: 7,
    views: 128,
    answers: [
      {
        author: 'noor_a',
        best: true,
        daysAgo: 7,
        body: `A schedule most clinicians are happy with:

- **New partner, or symptoms of any kind** → test before or soon after.
- **Otherwise, every 3–6 months** if you are sexually active with more than one person. Put it in your calendar next to the dentist — same energy, no drama.
- **Ask for the full panel**, and mention what you actually do — throat and rectal swabs are part of the picture for many people, and most GPs only test one site unless you say so.

On the weirdness: clinics see dozens of people a day doing the exact responsible thing you are doing. Testing is the *boring, normal* part of having a sex life. The people who should feel awkward are the ones skipping it. Results are quick now, often a few days, and free or cheap at most sexual health services.`
      },
      {
        author: 'sam_k',
        daysAgo: 6,
        body: `Make it a two-minute habit: book the next one while you are still in the waiting room. Momentum beats motivation, and the second visit is always easier than the first.`
      }
    ],
    votes: [[0, 'devon_k', 1], [0, 'maya_r', 1], [0, 'priya_s', 1], [1, 'noor_a', 1]]
  },
  {
    author: 'maya_r',
    title: 'Do I still need protection if it is only oral sex?',
    topic: 'health',
    body: 'Genuine question, not a joke — the advice online either treats everything as zero risk or scares you into a hazmat suit. What is the actual risk level and is protection realistically worth it?',
    daysAgo: 31,
    views: 152,
    answers: [
      {
        author: 'devon_k',
        best: true,
        daysAgo: 30,
        body: `Reality, without the scare quotes: **risk is not zero, and it is not huge.** Several STIs transmit through oral sex — gonorrhea, syphilis, herpes, and HPV are the main ones — and throat infections often have no symptoms at all, which is why testing includes swabs.

Worth knowing:
- Condoms and dental dams reduce the risk meaningfully. They are cheap and nobody has ever filed a complaint about preparedness.
- The biggest practical lever is **testing**, including throat swabs, especially with new or multiple partners.
- If everyone has tested recently and there are no symptoms, risk is genuinely low — "low" is not "none," and that is the whole game.

Nobody is suggesting fear. Just honest math: low effort, real reduction. That is usually a good trade.`
      },
      {
        author: 'noor_a',
        daysAgo: 28,
        body: `The framing I use: protection is not about trusting someone or doubting them — most people who transmit an STI do not know they have one. It is just physics. Make the decision about the situation, never about the person's character.`
      }
    ],
    votes: [[0, 'maya_r', 1], [0, 'sam_k', 1], [0, 'priya_s', 1], [1, 'devon_k', 1]]
  },
  {
    author: 'priya_s',
    title: 'I want to ask my doctor about PrEP but I am embarrassed',
    topic: 'health',
    body: 'I know what PrEP is. I have read everything. But the moment I imagine actually saying the words out loud to my GP, I freeze. Is there a script? Does anyone bring this up without feeling strange about it?',
    daysAgo: 22,
    views: 99,
    answers: [
      {
        author: 'maya_r',
        best: true,
        daysAgo: 21,
        body: `Here is your script — doctors hear this many times a week:

> *"I'd like to talk about PrEP. Am I a candidate, and what are my options?"*

That is the entire opening. From there it is a standard medical conversation: bloodwork, kidney checks, how often to take it, what to do about missed doses.

Two facts that lower the temperature:
- **PrEP protects against HIV, not other STIs.** You may still want condoms for the rest of the menu — it is a both-and, not a replacement.
- **Confidentiality applies.** It goes in your file like anything else; your doctor is not calling your mother.

If in-person feels like too much, sexual health clinics and some telehealth services handle PrEP start-to-finish without a waiting room. Write your two questions on your phone before you go in — nerves delete memory, paper does not.`
      },
      {
        author: 'devon_k',
        daysAgo: 20,
        body: `For what it is worth: every doctor I know treats a patient bringing up PrEP as a *good* visit — someone informed, proactive, and easy to help. The embarrassment is entirely on our side of the desk. Ask once, get the info, then it is just a routine prescription.`
      }
    ],
    votes: [[0, 'sam_k', 1], [0, 'alex_t', 1], [0, 'noor_a', 1], [1, 'priya_s', 1]]
  },

  // ---------- family ----------
  {
    author: 'maya_r',
    title: 'My teenager just came out to me. What am I supposed to say?',
    topic: 'family',
    body: 'My 15-year-old sat me down last night and told me they think they are bi. I managed "thank you for telling me" but then I panicked and asked a bunch of questions I am now cringing about. What should I actually be doing right now?',
    daysAgo: 14,
    views: 176,
    answers: [
      {
        author: 'alex_t',
        best: true,
        daysAgo: 13,
        body: `The fact that you are asking this question already puts you ahead of most parents. The core script, in order:

1. **"Thank you for telling me. I love you."** You got this part right. For many kids, that sentence is the whole ballgame.
2. **"Do you want to talk about it, or should we just hang out?"** Let them lead. Some want a conversation; some immediately want to talk about pizza. Both mean it went well.
3. **Go easy on questions.** Interrogation reads as a test they might fail. Curiosity can wait for tomorrow and the day after — you have years.
4. **Do not out them.** Their friends, their aunts, their school — they decide who knows, at their pace. Ask before you tell anyone, even proudly.
5. **Get your own support.** Parents' groups (PFLAG and similar) are not for the kid — they are for you to process any surprise away from your child's face.

Keep the door open, correct people in front of them, and carry on with dinner. Your calm is their safety.`
      },
      {
        author: 'noor_a',
        daysAgo: 12,
        body: `Practical follow-ups that matter more than the perfect speech: use the name and pronouns they ask for, every time, in front of everyone — consistency builds trust faster than any talk. And watch the school situation gently; if bullying shows up, knowing early lets you act. Mostly though? They told YOU. That means you are their safe person. Protect that above all.`
      }
    ],
    votes: [[0, 'maya_r', 1], [0, 'priya_s', 1], [0, 'devon_k', 1], [0, 'sam_k', 1], [1, 'alex_t', 1]]
  },
  {
    author: 'sam_k',
    title: 'How do I get through Thanksgiving with relatives who "do not agree"?',
    topic: 'family',
    body: 'The family group chat is already arguing and dinner is on Thursday. I would like to show up, eat the good food, and not have my existence turned into a debate topic between the turkey and dessert. Realistic strategies welcome.',
    daysAgo: 41,
    views: 112,
    answers: [
      {
        author: 'devon_k',
        best: true,
        daysAgo: 40,
        body: `Go in with a battle plan, not a hope:

- **Arrive in your own car** (or have an exit time set with a friend). The single best decision of the evening is knowing you can leave.
- **Seat your ally next to you.** The supportive cousin, the quiet uncle — whoever runs interference. Tell them ahead of time what you need: subject changes, rescue conversations, "we are not doing this tonight."
- **Prepare one line and reuse it:** *"I'm not debating this at dinner — pass the potatoes."* You do not owe anyone a conversation about your validity. Repeat it, boringly, as many times as needed. Boredom is a shield.
- **Plan the decompress.** Text a friend, watch something stupid, take the long way home. Holidays cost queer people extra; budget for it.

And if declining is the healthier choice — host your own, go to a friend's, order the fancy meal for one — that is not losing. That is self-respect with better side dishes.`
      },
      {
        author: 'priya_s',
        daysAgo: 38,
        body: `Something that works for my family: pre-brief the friendly members in a side chat an hour before — "I need tonight to be normal, back me up if it goes sideways." Allies who know the plan in advance act instantly instead of freezing. And afterwards, do something kind for yourself; you performed normalcy for people who made it hard, and that is genuinely tiring.`
      }
    ],
    votes: [[0, 'maya_r', 1], [0, 'alex_t', 1], [0, 'noor_a', 1], [1, 'sam_k', 1]]
  },

  // ---------- faith ----------
  {
    author: 'priya_s',
    title: 'Can I be gay and still have a faith?',
    topic: 'faith',
    body: 'I grew up in church and my faith still matters to me, but every headline tells me these two things cannot coexist. I am not ready to give up either one. Am I just being naive, or is there room for both?',
    daysAgo: 35,
    views: 137,
    answers: [
      {
        author: 'maya_r',
        best: true,
        daysAgo: 34,
        body: `You are not being naive — you are being honest, which is harder.

Room for both looks like this:
- **Affirming congregations exist in almost every tradition** — churches, synagogues, mosques, and fellowships that read their texts differently and have done the work. They are not a compromise; they are often very warm rooms.
- **Nobody else mediates your relationship with the sacred.** Loud voices do not get to sign your name on your own faith.
- You do not have to resolve every theological question this year. Doubt and devotion have shared a pew for centuries.

Search "affirming + your tradition + your city," or ask an LGBTQ+ center — they usually keep a list of welcoming congregations. Many people find that the faith they were told they had to abandon was the one waiting for them to arrive whole.`
      },
      {
        author: 'alex_t',
        daysAgo: 31,
        body: `Two valid paths I have seen people walk with dignity: **stay and find the affirming room**, or **leave the building without leaving belief** — private practice, online communities, books by queer theologians. A third path, deconstructing altogether, is also valid. The only wrong move is letting someone else choose your answer for you.`
      }
    ],
    votes: [[0, 'priya_s', 1], [0, 'sam_k', 1], [0, 'devon_k', 1], [0, 'noor_a', 1], [1, 'maya_r', 1]]
  },

  // ---------- workplace ----------
  {
    author: 'devon_k',
    title: 'My boss keeps making "jokes." Do I say something?',
    topic: 'workplace',
    body: 'Nothing I could take to HR in one neat package — just a steady drip of comments that land wrong, plus the occasional "it was just a joke" when someone flinches. Do I confront him, report him, or just keep my head down?',
    daysAgo: 52,
    views: 124,
    answers: [
      {
        author: 'noor_a',
        best: true,
        daysAgo: 51,
        body: `The calculus, honestly weighed:

- **Document now, regardless of what you decide.** Dates, exact words, who was in the room — in your own notes. Patterns become visible on paper that stay invisible in memory.
- **One calm intervention can work once:** *"That one's a bit dated, man."* Short, no essay, said like a colleague not a prosecutor. If he adjusts, problem solved. If the drip continues, you have your answer.
- **Then HR, in writing.** Email creates a record; hallway complaints do not. Stick to specifics — what was said, when, how it affects the work environment.
- **Find out who else hears it.** Allies turn "my word against his" into a pattern with witnesses.

You should not have to be the office educator — but you also should not have to absorb it indefinitely. Choose for your safety and your budget; both staying and going are legitimate strategies, and documenting keeps either option open.`
      },
      {
        author: 'alex_t',
        daysAgo: 49,
        body: `Worth adding: check whether there is an employee resource group or a trusted union rep — they often know exactly how complaints are handled at THIS company, which is the part HR manuals never tell you. And if you later decide to leave, that is not failing; it is spending your talent where it is not taxed by background static.`
      }
    ],
    votes: [[0, 'devon_k', 1], [0, 'maya_r', 1], [0, 'sam_k', 1], [1, 'noor_a', 1]]
  },

  // ---------- community ----------
  {
    author: 'alex_t',
    title: 'How do I make queer friends as an adult when everything is bars?',
    topic: 'community',
    body: 'I moved to a new city at 34. The apps are for dating, the scene is for drinking, and my knees are for sitting. I want friends — actual, text-on-a-Tuesday friends — and I do not know where people like us just... hang out.',
    daysAgo: 18,
    views: 158,
    answers: [
      {
        author: 'sam_k',
        best: true,
        daysAgo: 17,
        body: `Adult friendship runs on **repeated unplanned contact** — which bars are actually bad at and structured groups are great at.

- **Pick one recurring thing** and commit to it for two months: queer sports league, choir, volunteer crew, book club, hiking group, maker night. Familiar faces become real friends around visit three.
- **Say yes to the awkward coffee.** The invitation where you think "I barely know them" is the one that works. Everyone in the group is privately hoping someone will suggest it.
- **Host low-stakes things.** Board games at yours, a park hang, a cookout. Someone has to be the initiator, and it might as well be you.
- **Online local groups count** as a doorway — a city Discord or Facebook group that actually meets up in person.

One real friend is a win. You are not behind; you are just between the old structure and the new one, which is exactly where everyone else who moved city is too.`
      },
      {
        author: 'maya_r',
        daysAgo: 16,
        body: `Practical timing note: most cities have a "new in town" style queer meetup, and people go to those precisely because they know nobody — so the awkwardness is mutual and pre-approved. Volunteer for Pride season too: you will see the same crew every weekend for a month, which fast-forwards six months of normal acquaintance into actual friendship.`
      }
    ],
    votes: [[0, 'alex_t', 1], [0, 'maya_r', 1], [0, 'noor_a', 1], [0, 'priya_s', 1], [0, 'devon_k', 1], [1, 'sam_k', 1]]
  },
  {
    author: 'noor_a',
    title: 'Where do queer people actually hang out besides bars and clubs?',
    topic: 'community',
    body: 'Not a dating question this time — I genuinely want daytime, sober, all-ages places where the community just exists. Coffee shops that are not coded for cruising, parks, bookshops? Does that scene exist or is it a myth?',
    daysAgo: 58,
    views: 103,
    answers: [
      {
        author: 'priya_s',
        best: true,
        daysAgo: 56,
        body: `It exists, you just have to know the rhythm:

- **Bookshops and cafes with event nights** — queer book clubs, zine fairs, author nights. Look for shops that host, not just sell.
- **Daytime community events** — knitting circles, craft fairs, film matinees at LGBTQ+ centers, sober socials (many cities have them weekly now).
- **Sports in daylight** — running clubs, beach volleyball, climbing crews. Half of them are not officially "queer" but functionally are.
- **Pride beyond the parade** — mutual aid groups, advocacy meetings, choir rehearsals. The community doing things at 7pm on a Wednesday.

The trick with all of these: check the calendar rather than the vibe. Places do not always look queer from the sidewalk; their Tuesday evening listing gives it away.`
      },
      {
        author: 'devon_k',
        daysAgo: 54,
        body: `Also: follow the community accounts for your city — Instagram pages that post "sober Sunday picnic" or "queer board game cafe meetup" exist for most decent-sized towns now. The daytime scene is less visible but very much alive; it just does not have a neon sign out front.`
      }
    ],
    votes: [[0, 'noor_a', 1], [0, 'sam_k', 1], [1, 'priya_s', 1]]
  },

  // ---------- coming-out (more) ----------
  {
    author: 'alex_t',
    title: `Is it worth coming out if I am only going to date one person?`,
    topic: 'coming-out',
    body: `I have only ever been interested in one person so far, and they happen to be the same gender as me. Everyone keeps telling me I should come out, but it feels strange to make a whole announcement about something that might just be one relationship. Does coming out only matter when you are dating around?`,
    daysAgo: 5,
    views: 121,
    answers: [
      {
        author: 'maya_r',
        best: true,
        daysAgo: 4,
        body: `Coming out is not about audience size, it is about not hiding. If staying private costs you nothing right now, that is completely valid — you do not owe anyone a performance. The question to ask is whether you would feel relief if the people around you just knew. If yes, tell the two or three people who matter first. If no, wait.`
      },
      {
        author: 'sam_k',
        daysAgo: 3,
        body: `One relationship counts. I came out while dating exactly one person and people acted like I had joined a club with a membership drive. You are allowed to describe yourself on your own timeline, and one person is plenty of reason to start being honest if you want to be.`
      }
    ],
    votes: [
      [0, 'devon_k', 1],
      [0, 'priya_s', 1],
      [1, 'noor_a', 1]
    ]
  },
  {
    author: 'noor_a',
    title: `I came out at a party and now I regret it. Can I take it back?`,
    topic: 'coming-out',
    body: `I had two drinks and told a room of people I am gay. The next morning I panicked — not because it is not true, but because I wanted to choose the moment. Now it is all over group chats. Is there a way to un-say this, or do I just own it?`,
    daysAgo: 4,
    views: 96,
    answers: [
      {
        author: 'priya_s',
        best: true,
        daysAgo: 3,
        body: `You cannot un-say it, but you can set the terms. Send one calm message to the group chat: it is true, you would appreciate people not spreading it further, and you will talk about it when you are ready. People respond to a clear instruction. The moment stops feeling stolen when you decide what happens next.`
      },
      {
        author: 'alex_t',
        daysAgo: 2,
        body: `Regret about the timing is not regret about the truth — hold on to that distinction. In my experience the party crowd forgets the drama within a week, while you keep replaying it for months. The gap between how loud it feels to you and how little others dwell on it is bigger than you think.`
      }
    ],
    votes: [
      [0, 'sam_k', 1],
      [0, 'devon_k', 1],
      [1, 'maya_r', 1]
    ]
  },

  // ---------- identity (more) ----------
  {
    author: 'devon_k',
    title: `Can I use more than one label, or do I have to pick just one?`,
    topic: 'identity',
    body: `Bi and queer both fit me depending on the day. When people ask, I freeze because I feel like I am supposed to choose a team. Is it normal to hold more than one label at the same time?`,
    daysAgo: 7,
    views: 134,
    answers: [
      {
        author: 'sam_k',
        best: true,
        daysAgo: 6,
        body: `Labels are tools, not team jerseys. Use whichever one communicates what you need in that moment — bi with family, queer with friends, both in your own head. Nobody audits your vocabulary, and changing your mind later does not invalidate today.`
      },
      {
        author: 'maya_r',
        daysAgo: 5,
        body: `Totally normal. I say bi to older relatives who need something concrete and queer in community spaces where the wider word just fits. You can also answer the question with a question: "why do you ask?" buys you time and sometimes tells you whether the person deserves the real answer.`
      }
    ],
    votes: [
      [0, 'priya_s', 1],
      [1, 'noor_a', 1]
    ]
  },
  {
    author: 'maya_r',
    title: `How do I stop second-guessing something I finally feel sure about?`,
    topic: 'identity',
    body: `Some days I feel completely sure, and then one comment from a relative sends me back to square one. I am tired of the cycle. How do you make peace with it so it stops feeling like a question every morning?`,
    daysAgo: 6,
    views: 108,
    answers: [
      {
        author: 'priya_s',
        best: true,
        daysAgo: 5,
        body: `Certainty comes in waves, and doubt after a sharp comment does not erase what you know — it just shows you are still carrying their voice. What helped me: write down on a good day how you feel and why, in your own words. Re-read it the next time the doubt creeps in. You are arguing with yourself using evidence from your clear moments.`
      },
      {
        author: 'devon_k',
        daysAgo: 4,
        body: `It fades as this becomes ordinary life instead of an event. The first year everything felt like a referendum on my identity; by the second, getting dressed was just getting dressed. The cycle shortens the longer you let yourself live inside the answer.`
      }
    ],
    votes: [
      [0, 'sam_k', 1],
      [0, 'alex_t', 1],
      [1, 'noor_a', 1]
    ]
  },
  {
    author: 'sam_k',
    title: `What does it mean if I do not want a label at all?`,
    topic: 'identity',
    body: `Every time I go to a queer space there is a discussion about which flag to fly. I am happy with myself as I am and I do not really want to name it. Am I avoiding something, or is no-label a real place to stand?`,
    daysAgo: 8,
    views: 87,
    answers: [
      {
        author: 'noor_a',
        best: true,
        daysAgo: 7,
        body: `Questioning the need for labels is as valid as choosing them. Plenty of people live happily without filing themselves under a heading — you are not avoiding anything by declining the paperwork. The community part comes from shared space and values, not from which word you wear at the door.`
      },
      {
        author: 'alex_t',
        daysAgo: 6,
        body: `Labels are optional equipment. Some people navigate with a map, some just walk. If "no label" describes you accurately, then you already have your label — it just happens to be a blank one.`
      }
    ],
    votes: [
      [0, 'maya_r', 1],
      [0, 'priya_s', 1],
      [1, 'devon_k', 1]
    ]
  },

  // ---------- gender (more) ----------
  {
    author: 'sam_k',
    title: `What is the difference between genderfluid and just questioning?`,
    topic: 'gender',
    body: `I have days where I feel different, and I cannot tell if I am exploring or if this is actually how I am built. Where is the line between questioning and an identity?`,
    daysAgo: 7,
    views: 142,
    answers: [
      {
        author: 'priya_s',
        best: true,
        daysAgo: 6,
        body: `Questioning is the process, genderfluid describes a pattern you notice inside that process. There is no deadline for figuring out which one you are living — you can call yourself questioning for a year and nobody can challenge that. If the shifting keeps showing up after the novelty wears off, that is information, not confusion.`
      },
      {
        author: 'devon_k',
        daysAgo: 5,
        body: `Keep a tiny log for a month: one line a day about how you feel. Patterns become visible fast, and you stop relying on whichever day happens to be loudest. Whatever the log says, you are allowed to use a word that fits it.`
      }
    ],
    votes: [
      [0, 'maya_r', 1],
      [0, 'noor_a', 1],
      [1, 'alex_t', 1]
    ]
  },
  {
    author: 'priya_s',
    title: `My pronouns are they/them but people keep getting it wrong. How do I correct them without being rude?`,
    topic: 'gender',
    body: `At work people try for a week and then slip back. I do not want to be the pronoun police every meeting, but being ignored stings. What actually works?`,
    daysAgo: 5,
    views: 167,
    answers: [
      {
        author: 'sam_k',
        best: true,
        daysAgo: 4,
        body: `Pick a low-effort script and use it every single time — mine is a quick "they, remember" with a smile, no speech attached. Consistency beats comfort: people recalibrate when correction is boring instead of dramatic. It is not rude to correct someone who has forgotten; the forgetting is the rude part.`
      },
      {
        author: 'maya_r',
        daysAgo: 3,
        body: `Ask one colleague who already gets it to model it in conversation. People follow correction patterns from peers faster than they follow policy. At my last job that one ally fixed the whole floor within a month.`
      }
    ],
    votes: [
      [0, 'devon_k', 1],
      [0, 'alex_t', 1],
      [1, 'noor_a', 1]
    ]
  },

  // ---------- relationships (more) ----------
  {
    author: 'noor_a',
    title: `How do I bring up an open relationship without sounding selfish?`,
    topic: 'relationships',
    body: `My partner and I have been together four years. I want to talk about opening up, but every article I read makes it sound like the beginning of the end. How do I start that conversation honestly?`,
    daysAgo: 6,
    views: 118,
    answers: [
      {
        author: 'alex_t',
        best: true,
        daysAgo: 5,
        body: `Frame it as curiosity, not a deficit — "here is something I would like us to explore together" lands very differently from "something is missing." Pick a calm, non-bedroom moment, say you are happy with them first, and be genuinely ready for any answer, including no. The conversation goes badly when it is really a request disguised as a chat.`
      },
      {
        author: 'maya_r',
        daysAgo: 4,
        body: `Talk feelings before logistics: what scares each of you, what would feel threatening, what would feel like relief. Couples who skip that part and jump to rules end up with rules that ignore the actual anxieties underneath them.`
      }
    ],
    votes: [
      [0, 'priya_s', 1],
      [0, 'sam_k', 1],
      [1, 'devon_k', 1]
    ]
  },
  {
    author: 'alex_t',
    title: `My girlfriend wants me to meet her family but she is not out to them yet. What do I do?`,
    topic: 'relationships',
    body: `I would be introduced as her "friend", and her parents are the kind who would ask questions. I do not want to pressure her, but playing invisible for a whole weekend feels awful. Has anyone navigated this?`,
    daysAgo: 4,
    views: 173,
    answers: [
      {
        author: 'priya_s',
        best: true,
        daysAgo: 3,
        body: `Decide together what you can both live with, in advance. Agree on how you are introduced, what you will say if they ask, and an exit signal if it gets heavy. Her timeline still matters — but so does your dignity, and pretending to be "just a friend" is a cost that needs to be named, not assumed.`
      },
      {
        author: 'devon_k',
        daysAgo: 2,
        body: `Meet them as the friend who is obviously important to her. Pressure rarely outpaces fear, but support often does — when she sees you handle the visit with grace, the next conversation about honesty gets a lot shorter.`
      }
    ],
    votes: [
      [0, 'maya_r', 1],
      [0, 'noor_a', 1],
      [1, 'sam_k', 1]
    ]
  },

  // ---------- mental-health (more) ----------
  {
    author: 'devon_k',
    title: `Therapy has not helped me accept myself yet. Is that normal?`,
    topic: 'mental-health',
    body: `Three months in and I still leave sessions feeling worse. My therapist is fine about LGBTQ things, I think — I just do not know if I am doing it wrong. Do acceptance and self-compassion actually get easier?`,
    daysAgo: 8,
    views: 129,
    answers: [
      {
        author: 'maya_r',
        best: true,
        daysAgo: 7,
        body: `Tell your therapist exactly what you wrote here: "I leave feeling worse." That sentence is the most useful thing they can hear, and good therapy can handle it. If they get defensive or sidestep it, that tells you something too — a modality switch or a new therapist is a legitimate move.`
      },
      {
        author: 'sam_k',
        daysAgo: 6,
        body: `Three months is early, and self-acceptance rarely moves in a straight line — often it dips right before a breakthrough because you are finally touching the real material. Also consider a queer support group alongside individual therapy. Hearing other people say your exact fear out loud does something a one-to-one room sometimes cannot.`
      }
    ],
    votes: [
      [0, 'priya_s', 1],
      [0, 'noor_a', 1],
      [1, 'alex_t', 1]
    ]
  },
  {
    author: 'priya_s',
    title: `How do I deal with the guilt of hurting people when I came out?`,
    topic: 'mental-health',
    body: `My mum cried for a week and my brother will not speak to me. I know I did the right thing for me, but the house feels like a funeral. Does the guilt ever stop?`,
    daysAgo: 5,
    views: 154,
    answers: [
      {
        author: 'noor_a',
        best: true,
        daysAgo: 4,
        body: `Their grief is theirs to move through, not yours to carry. You did not cause harm — you stopped hiding, and they are reacting to news, not to an injury you inflicted. It feels like a funeral because a version of their assumption about you has ended; that is a loss they are allowed to feel without it becoming your fault.`
      },
      {
        author: 'alex_t',
        daysAgo: 3,
        body: `The guilt fading is not the same as caring less. You are watching people adjust at their own speed, and their pace is not a scorecard on how much you love them. My family took about eighteen months; yours may take less.`
      }
    ],
    votes: [
      [0, 'maya_r', 1],
      [0, 'devon_k', 1],
      [1, 'sam_k', 1]
    ]
  },

  // ---------- health (more) ----------
  {
    author: 'maya_r',
    title: `I am scared to go to the doctor because of how I look. How do I find a trans-friendly clinic?`,
    topic: 'health',
    body: `Last visit the receptionist read my file out loud and the whole waiting room heard. I have put off checkups for two years. How do I find a place that will just treat me like anyone else?`,
    daysAgo: 6,
    views: 186,
    answers: [
      {
        author: 'sam_k',
        best: true,
        daysAgo: 5,
        body: `Look for informed-consent clinics and queer community boards where people name both good and bad experiences — reputation travels fast in our communities. Before booking, call and ask one scripted question: "Do you see trans patients regularly?" Their tone answers more than their script does.`
      },
      {
        author: 'devon_k',
        daysAgo: 4,
        body: `Send one email ahead of your appointment asking for a note on your file about your name and pronouns. It takes five minutes for them and it prevents the entire scene you are dreading. Ask for the appointment itself to be under your name too.`
      }
    ],
    votes: [
      [0, 'priya_s', 1],
      [0, 'noor_a', 1],
      [1, 'alex_t', 1]
    ]
  },
  {
    author: 'sam_k',
    title: `Should I get tested even if I have only had one partner?`,
    topic: 'health',
    body: `We are exclusive and both fine, but the nurse made it sound like everyone should just get checked regularly. Is it necessary in a closed relationship?`,
    daysAgo: 7,
    views: 98,
    answers: [
      {
        author: 'priya_s',
        best: true,
        daysAgo: 6,
        body: `A baseline test is just smart — plenty of infections are completely quiet, and one conversation with your partner covers everything else. Think of it like a dental checkup: nothing is probably wrong, and finding out either way is the point.`
      },
      {
        author: 'maya_r',
        daysAgo: 5,
        body: `Testing is maintenance, not an accusation. Most couples do it at the start of a relationship precisely so this question stops coming up. If your partner reacts badly to the suggestion, that says more about their nerves than about your trust.`
      }
    ],
    votes: [
      [0, 'devon_k', 1],
      [0, 'noor_a', 1],
      [1, 'alex_t', 1]
    ]
  },

  // ---------- family (more) ----------
  {
    author: 'noor_a',
    title: `My in-laws do not know about my past marriage to a woman. Do I tell them?`,
    topic: 'family',
    body: `My husband knows everything. His parents are warm but very curious and they keep asking about my "history". I do not want to lie, but this feels like it is his family too. Who decides this?`,
    daysAgo: 6,
    views: 112,
    answers: [
      {
        author: 'alex_t',
        best: true,
        daysAgo: 5,
        body: `Decide together — a marriage history is shared information, not your secret alone. Agree on what you both say, and let him lead with his family if that is easier for everyone. What you should not do is improvise different versions in different rooms; inconsistency is what actually creates drama.`
      },
      {
        author: 'priya_s',
        daysAgo: 4,
        body: `A simple "I was married to a woman before this" usually lands far more calmly than people expect. You can answer without a speech, a disclaimer, or a TED talk about labels. Brief and matter-of-fact gives them nothing to react against.`
      }
    ],
    votes: [
      [0, 'maya_r', 1],
      [1, 'sam_k', 1],
      [1, 'devon_k', 1]
    ]
  },
  {
    author: 'alex_t',
    title: `How do I handle holidays when my family still deadnames me?`,
    topic: 'family',
    body: `Christmas is in three weeks. I am on HRT, I look different, and they keep using the old name "because it is easier". I want to be there for my niece but I leave every year feeling hollow. Do I skip it this year?`,
    daysAgo: 4,
    views: 214,
    answers: [
      {
        author: 'sam_k',
        best: true,
        daysAgo: 3,
        body: `Set one rule before you go — "use my name, or I will politely step out when you don't" — and follow through calmly, every time. Boundaries that are announced but not enforced teach people they have three strikes. The first follow-through is the hard one; after that the room adjusts fast.`
      },
      {
        author: 'noor_a',
        daysAgo: 2,
        body: `Short visits changed everything for me: two hours instead of two days, with an ally cousin's place nearby if I need air. Logistics are allowed to be part of self-care. You can love your niece and still refuse to be a punching bag — those are not in conflict.`
      }
    ],
    votes: [
      [0, 'priya_s', 1],
      [0, 'maya_r', 1],
      [1, 'devon_k', 1]
    ]
  },

  // ---------- faith (more) ----------
  {
    author: 'priya_s',
    title: `Is there a queer-friendly church, or is that an oxymoron?`,
    topic: 'faith',
    body: `I miss having a spiritual community but the last three churches made it clear where they stood on "the issue". Am I looking for something that does not exist?`,
    daysAgo: 9,
    views: 143,
    answers: [
      {
        author: 'maya_r',
        best: true,
        daysAgo: 8,
        body: `They exist — affirming congregations list themselves in denominational directories, and many wear it openly on their homepage rather than burying it. Expect imperfect people, just like anywhere; the difference is whether the doctrine leaves room for you. One visit tells you more than their website ever will.`
      },
      {
        author: 'devon_k',
        daysAgo: 7,
        body: `I found mine through a friend of a friend rather than a search engine — smaller communities were warmer than the big ones, and somebody sat with me the first Sunday instead of leaving me in a row. Ask around in queer spaces; half of us have a recommendation.`
      }
    ],
    votes: [
      [0, 'sam_k', 1],
      [0, 'noor_a', 1],
      [1, 'alex_t', 1]
    ]
  },

  // ---------- workplace (more) ----------
  {
    author: 'devon_k',
    title: `Should I mention being gay in my job interview?`,
    topic: 'workplace',
    body: `I have a final round next week. My old workplace was fine with it, but I do not know this company. Including it in "anything else?" feels risky; hiding it feels exhausting. What do people actually do?`,
    daysAgo: 5,
    views: 159,
    answers: [
      {
        author: 'noor_a',
        best: true,
        daysAgo: 4,
        body: `You never owe it in an interview — assess them first. A company's reaction to your very first casual mention tells you everything, and that first mention can happen after you have the offer and a probation period to observe. Exhaustion is a reason to disclose, but risk is a reason to wait; you are allowed to sequence it.`
      },
      {
        author: 'alex_t',
        daysAgo: 3,
        body: `I check their values page and recent pride posts first. Signals from them should come before disclosure from you — if they wave the flag, mentioning it costs nothing; if there is silence, you have just learned something useful about the place.`
      }
    ],
    votes: [
      [0, 'maya_r', 1],
      [0, 'priya_s', 1],
      [1, 'sam_k', -1]
    ]
  },

  // ---------- community (more) ----------
  {
    author: 'maya_r',
    title: `How do I find community outside of bars and clubs?`,
    topic: 'community',
    body: `I do not drink much and every event I find involves a pub. Are there daytime, sober, hobby-first ways to meet other queer people?`,
    daysAgo: 7,
    views: 137,
    answers: [
      {
        author: 'sam_k',
        best: true,
        daysAgo: 6,
        body: `Look for book clubs, sports leagues, and volunteer days run by queer organizations — the hobby is the excuse and the community comes free with it. Everyone is there for the activity first, which removes the "am I supposed to flirt?" tension that makes bar events weird.`
      },
      {
        author: 'priya_s',
        daysAgo: 5,
        body: `Online groups that plan hikes and board game nights got me my entire friend circle. Search your city plus "queer" plus whatever you already enjoy — if nothing exists, post that you are starting something. Someone always replies; the first meetup is usually just three people and that is plenty.`
      }
    ],
    votes: [
      [0, 'devon_k', 1],
      [0, 'noor_a', 1],
      [1, 'alex_t', 1]
    ]
  },
  {
    author: 'sam_k',
    title: `I feel like I am not queer enough to be in queer spaces. Is that a thing?`,
    topic: 'community',
    body: `I do not look the part, my story is quiet, and everyone seems to know each other. I keep standing at the edge of meetups wondering if someone is going to ask what I am doing here.`,
    daysAgo: 6,
    views: 176,
    answers: [
      {
        author: 'devon_k',
        best: true,
        daysAgo: 5,
        body: `Everyone felt like the new person once — organizers especially love first-timers who show up at all. Try the sentence "this is my first time here" and watch doors open; it is the one thing you can say that nobody can misread as you claiming to be a regular.`
      },
      {
        author: 'noor_a',
        daysAgo: 4,
        body: `Nobody handed me a credential either. You are not a guest in your own community — there is no bouncer checking how many years you have been here or how you dress. The feeling is real but it is imposter syndrome wearing a Pride lanyard, not a fact about you.`
      }
    ],
    votes: [
      [0, 'maya_r', 1],
      [0, 'priya_s', 1],
      [1, 'alex_t', 1]
    ]
  },

  // ---------- school (new topic) ----------
  {
    author: 'noor_a',
    title: `My teacher keeps splitting the class into boys and girls. What can I do?`,
    topic: 'school',
    body: `It happens twice a week for group work and every time it turns into a whole thing about where I should stand. I am not out to the class. Do I talk to the teacher alone first?`,
    daysAgo: 5,
    views: 104,
    answers: [
      {
        author: 'maya_r',
        best: true,
        daysAgo: 4,
        body: `A quiet private note or email asking to group by table numbers instead usually works — teachers want the class logistics solved too, and "can we mix up the groups another way" reads as a normal classroom suggestion, not a political statement. You never have to explain why.`
      },
      {
        author: 'alex_t',
        daysAgo: 3,
        body: `If the teacher does not help, your school counselor can raise it as general classroom-management practice — mixed groups, no lines by gender — without naming you at all. The fix does not have to come with a coming-out attached.`
      }
    ],
    votes: [
      [0, 'sam_k', 1],
      [0, 'priya_s', 1],
      [1, 'devon_k', 1]
    ]
  },
  {
    author: 'alex_t',
    title: `How do I talk to my school counselor about my name and pronouns?`,
    topic: 'school',
    body: `I have a meeting booked and I am terrified they will call my parents. I want to use a different name at school but I need to know who gets told first.`,
    daysAgo: 6,
    views: 148,
    answers: [
      {
        author: 'priya_s',
        best: true,
        daysAgo: 5,
        body: `Start with the question "what do you keep confidential?" — their answer tells you exactly how much detail to share. Most counselors will not out you to parents without serious cause, but you deserve to hear the policy in their own words before you decide to trust it.`
      },
      {
        author: 'sam_k',
        daysAgo: 4,
        body: `Bring a friend to wait outside and write the key sentence down before you go in — reading it beats improvising when your heart is pounding. Mine was: "I would like to use a different name at school, and I need to know who you will tell."`
      }
    ],
    votes: [
      [0, 'maya_r', 1],
      [0, 'noor_a', 1],
      [1, 'devon_k', 1]
    ]
  },

  // ---------- housing (new topic) ----------
  {
    author: 'devon_k',
    title: `Can a landlord refuse to rent to me because I am transgender?`,
    topic: 'housing',
    body: `A viewing went fine until they saw my documents. Suddenly the place was "no longer available". I do not know if I have a case or if I am just going to keep hearing excuses.`,
    daysAgo: 5,
    views: 165,
    answers: [
      {
        author: 'noor_a',
        best: true,
        daysAgo: 4,
        body: `In many places housing discrimination on the basis of gender identity is illegal — check your local tenant union or equality body, both usually have free advice lines. Keep the message thread and every date: what you have sounds like a refusal, and the paper trail is what makes it actionable.`
      },
      {
        author: 'maya_r',
        daysAgo: 3,
        body: `Document everything from now on: names, times, what was said, and the exact wording of any "sorry, it's gone" message. One landlord can claim coincidence; a pattern across landlords builds a case even when each individual excuse looks innocent on its own.`
      }
    ],
    votes: [
      [0, 'priya_s', 1],
      [0, 'sam_k', 1],
      [1, 'alex_t', 1]
    ]
  },
  {
    author: 'priya_s',
    title: `How do I handle a roommate who is uncomfortable with me being gay?`,
    topic: 'housing',
    body: `She was fine until her brother visited and made a comment. Now the flat feels tense. I share a lease and I am not leaving — but I do not want a cold war at home either.`,
    daysAgo: 4,
    views: 91,
    answers: [
      {
        author: 'alex_t',
        best: true,
        daysAgo: 3,
        body: `Name it once, calmly: "I noticed things changed after your visit — I want to understand." Tension grows in silence, and most people fold the moment the subtext is spoken aloud. If she cannot share space respectfully, that becomes a household-rules conversation instead of a personal one.`
      },
      {
        author: 'devon_k',
        daysAgo: 2,
        body: `A short house meeting about general respect usually resets the tone without making it about one topic — quiet hours, shared spaces, being decent to each other. Frame it as "how we live together" and her brother's comment stops being the agenda item.`
      }
    ],
    votes: [
      [0, 'maya_r', 1],
      [0, 'noor_a', 1],
      [1, 'sam_k', 1]
    ]
  },

  // ---------- legal (new topic) ----------
  {
    author: 'maya_r',
    title: `How do I change my name legally after coming out?`,
    topic: 'legal',
    body: `I use my name everywhere now except on paper. The forms I found online are a maze and half the advice contradicts itself. What is the realistic first step?`,
    daysAgo: 8,
    views: 198,
    answers: [
      {
        author: 'sam_k',
        best: true,
        daysAgo: 7,
        body: `Start at your local court or registry website and look for the name-change packet — one jurisdiction, one checklist, stop reading everything else. Many areas run free legal clinics specifically for queer clients walking through exactly this paperwork; one session collapses a month of forum threads.`
      },
      {
        author: 'noor_a',
        daysAgo: 6,
        body: `Order of operations saves headaches: legal name change first, then bank, then job, then ID — each place wants the previous document, so follow the chain and keep five certified copies. I ran out on copy three and had to order more.`
      }
    ],
    votes: [
      [0, 'priya_s', 1],
      [0, 'devon_k', 1],
      [1, 'alex_t', 1]
    ]
  },
  {
    author: 'sam_k',
    title: `Do I need a lawyer to change my gender marker?`,
    topic: 'legal',
    body: `Some people say it is a form, others say hire a lawyer. My location makes it sound like both a medical exam and a court hearing. How do I find out what actually applies to me?`,
    daysAgo: 7,
    views: 157,
    answers: [
      {
        author: 'devon_k',
        best: true,
        daysAgo: 6,
        body: `Rules differ by country, state, and even by which document you are updating — passport, ID, and birth certificate often have three separate processes. Start with a queer legal-service clinic; they will tell you in ten minutes what applies to you, and that answer beats any general blog post.`
      },
      {
        author: 'maya_r',
        daysAgo: 5,
        body: `I got mine with just a doctor letter and a registry form — less dramatic than the internet promised. The requirements are usually published on the official registry page for your region; find that page, not a forum thread from 2019.`
      }
    ],
    votes: [
      [0, 'priya_s', 1],
      [0, 'alex_t', 1],
      [1, 'noor_a', 1]
    ]
  }
];

async function main() {
  // --- members ---
  const passwordHash = await hashPassword(`seed-member-${Date.now()}-not-a-login`);
  const members = new Map<string, string>();
  for (const m of MEMBERS) {
    const user = await prisma.user.upsert({
      where: { username: m.username },
      create: { username: m.username, passwordHash, displayName: m.displayName, pronouns: m.pronouns },
      update: {}
    });
    members.set(m.username, user.id);
  }

  let createdQ = 0;
  let createdA = 0;
  let createdV = 0;
  const skipped: string[] = [];

  const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

  for (const q of QUESTIONS) {
    const slug = slugify(q.title);
    const existing = await prisma.question.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
      skipped.push(slug);
      // Backfill an audit entry for questions seeded before logging existed.
      const hasLog = await prisma.questionLog.findFirst({
        where: { questionId: existing.id, action: 'created' },
        select: { id: true }
      });
      if (!hasLog) {
        await logQuestionAction({
          questionId: existing.id,
          action: 'created',
          actor: { kind: 'seed', name: 'seed:qa' },
          detail: 'created by seed:qa (initial)'
        });
      }
      continue;
    }

    const question = await prisma.question.create({
      data: {
        userId: members.get(q.author)!,
        title: q.title,
        slug,
        bodyMd: q.body,
        topic: q.topic,
        status: 'PUBLISHED',
        viewCount: q.views,
        createdAt: daysAgo(q.daysAgo)
      }
    });
    createdQ++;
    await logQuestionAction({
      questionId: question.id,
      action: 'created',
      actor: { kind: 'seed', name: 'seed:qa' },
      detail: 'created by seed:qa'
    });

    const answerIds: string[] = [];
    for (let i = 0; i < q.answers.length; i++) {
      const a = q.answers[i];
      const answer = await prisma.answer.create({
        data: {
          questionId: question.id,
          userId: members.get(a.author)!,
          bodyMd: a.body,
          status: 'PUBLISHED',
          isBest: !!a.best,
          createdAt: daysAgo(a.daysAgo)
        }
      });
      answerIds.push(answer.id);
      if (a.best) {
        await prisma.question.update({ where: { id: question.id }, data: { bestAnswerId: answer.id } });
      }
      createdA++;
    }

    for (const [answerIdx, voter, value] of q.votes) {
      const answerId = answerIds[answerIdx];
      if (!answerId) continue;
      await prisma.answerVote.create({
        data: { answerId, userId: members.get(voter)!, value }
      });
      createdV++;
    }

    // keep answer.votes consistent with the seeded vote rows
    for (const answerId of answerIds) {
      const agg = await prisma.answerVote.aggregate({
        where: { answerId },
        _sum: { value: true }
      });
      await prisma.answer.update({
        where: { id: answerId },
        data: { votes: agg._sum.value ?? 0 }
      });
    }
  }

  await refreshSearchVecs();

  const totalQ = await prisma.question.count();
  const totalA = await prisma.answer.count();
  console.log(
    `QA seed done. +${createdQ} questions, +${createdA} answers, +${createdV} votes ` +
    `(totals: ${totalQ} questions, ${totalA} answers` +
    (skipped.length ? `, ${skipped.length} questions already existed)` : ')')
  );
}

main()
  .catch((err) => {
    console.error('QA seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
