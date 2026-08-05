# Umbrella.lgbt — Product Specification

> **An everything queer app. Community-first, not dating-first.**
>
> Umbrella.lgbt is a general social platform for the entire LGBTQ+ community — not just another dating app. It brings queer people together online and in real life through community, discovery, knowledge-sharing, and self-expression.

---

## 1. Core Vision

A platform where every queer person, regardless of identity, age, location, or relationship status, has a place to belong.

The name "Umbrella" reflects the architecture: one platform covering the full spectrum of LGBTQ+ identities and needs, where other platforms only serve fragments (gay men on Grindr, lesbians on Her, everyone scattered across Reddit/Discord/TikTok).

## 2. Guiding Principles

- **Community-first, not dating-first.** Dating may happen organically, but it is never the core mechanic, never the default, and never forced by algorithms.
- **For the whole spectrum.** Gay, lesbian, bisexual, transgender, non-binary, intersex, asexual, aromantic, questioning, two-spirit — every identity under the umbrella.
- **Teen-safe by design.** Currently, nothing exists for queer 13-17 year olds. Umbrella fills that gap by architecting safe spaces from day zero.
- **Move people offline.** The success metric is not screen time. It's friendships made, events attended, questions answered, lives changed.
- **Built by and for queer people.** Trust is the currency. The community can tell who built the platform.
- **Privacy and safety are not afterthoughts.** End-to-end encrypted messaging, anonymous/closeted mode, data sovereignty, one-click account deletion.

## 3. Platform Architecture

The app has **four main sections** plus profiles and chats:

```
                        UMBRELLA.LGBT
                              │
        ┌──────────┬──────────┼──────────┬──────────┐
        │          │          │          │          │
    COMMUNITY     MEET       Q&A       PROFILES    CHATS
    (core)    (discovery)   (SEO)    (expression)  (DMs)
```

## 4. Section Details

### 4.1 Community (Core)

Community is the heart of the platform. Users create or join communities. Communities organize activities that bring queer people together.

Community is divided into three functional categories:

#### A. Real-Life Activities (Bring Queer People Together)

These features move people from screen to street:

- **Events system** — Community hosts create events with RSVP, capacity limits, date/time/location
- **Repeating events** — Weekly game night, monthly brunch, annual pride meetup
- **Map view** — See all upcoming queer events near you on a map
- **Event check-in** — Verify attendance via QR code or proximity; earn community badges
- **Post-event photo albums** — Group photo dumps after meetups; builds FOMO for next one
- **Activity type categories** — Sports, arts, activism, volunteering, social, dating mixers
- **Venue partnerships** — Queer-friendly venues list themselves; offer discounts to community events
- **Carpool/transport coordination** — Members traveling to same event coordinate rides
- **Accessibility tags** — Wheelchair access, quiet spaces, sober events, all-ages events
- **Safety check-in** — "I arrived safely" / "I'm heading home" status visible to event attendees
- **Per-event group chat** — Auto-created when you RSVP; persists or dissolves after event
- **Co-host system** — Events can have multiple organizers from the community
- **Recurring event subscriptions** — "Remind me every time this group does a hike"

#### B. Engagement Features (Keep People Active In-App)

- **Community challenges** — Weekly/monthly themed activities like "Post your pride outfit" or "Share a queer book you love"
- **Polls & voting** — Community decides next event theme, movie night film, meetup location
- **Photo/video sharing** — Scoped to each community (not a global algorithmic feed)
- **Community milestones** — Celebrate 100 members, 1 year anniversary, 50th meetup
- **Member spotlights** — Weekly featured member: "Meet Sarah, she organizes the hiking group"
- **Discussion threads** — Non-Q&A casual chatter within a community
- **Resource sharing** — Pin links, guides, recommendations within the community
- **Skill sharing** — "I can teach guitar." "I need help with makeup." — community matchmaking
- **Gratitude/thank-you posts** — Public appreciation for members who helped or hosted
- **Countdown to next event** — Creates anticipation; visible on community page
- **Attendance streaks** — "You've attended 5 events this month." Encouraging, not punishing
- **Community calendar sync** — Export to Google Calendar, Apple Calendar
- **Icebreaker prompts** — Auto-generated conversation starters for new members
- **Spin-off groups** — Large communities can spawn smaller focused sub-groups

#### C. Acquisition Features (Bring New People In)

- **Q&A SEO indexing** — All Q&A content is public and crawlable; Google brings people in through their questions
- **Community invites** — One-tap invite link; "Bring a friend to the next meetup"
- **Public event pages** — SEO-optimized; "Queer Board Game Night in Berlin" ranks on Google
- **Public community landing pages** — Each community has a public page showing member count, next event, description
- **Shareable community cards** — Auto-generated promo images for Instagram/TikTok from community stats
- **"Nearby queer events" widget** — Embeddable on partner websites and blogs
- **Guest browsing** — People can see events and Q&A without signing up; signup wall only when they try to interact
- **Referral system** — "Joined because of Alex" tracking; top inviters get recognition
- **Cross-platform event promotion** — One-click share event to Twitter, WhatsApp, Instagram
- **Interest-based onboarding** — New user picks interests → immediately shown matching communities and events near them

### 4.2 Meet (People Discovery)

A browsable directory of all users, inspired by Spacehey (MySpace).

- **NOT a dating swipe mechanic.** No matching algorithm. Just discovery.
- All users are visible and filterable.
- Filter by: online status, location, identity, interests, age range
- "Who's around me right now" energy
- If romance, friendship, or anything else happens — it happens organically
- Users browse profiles, find people they connect with, and message them
- Profile previews in the directory show: photo, name, pronouns, flags, interests, online status, mutual communities

### 4.3 Q&A (Knowledge / SEO Engine)

A Quora/Reddit-style question-and-answer space, separate from community discussions.

- Users ask questions; the community answers
- **Every question is a public, permanent, SEO-optimized page**
- URL structure: `umbrella.lgbt/q/how-do-i-come-out-to-religious-parents`
- **Google-indexed.** No login required to read. This is the top-of-funnel acquisition engine.
- Answers are threaded, upvoted, sorted by quality
- "Best answer" can be pinned by the question author or by community voting
- Questions tagged by topic: gender identity, coming out, relationships, health, legal rights, transitioning, family, sex ed, mental health, activism, culture
- Someone googling "how do I know if I'm trans" lands on your Q&A page → discovers the platform → signs up

### 4.4 Chats

1-on-1 direct messaging between users.

- End-to-end encrypted
- Self-destructing messages option
- Group chats: per community, per event
- Closeted/anonymous mode support in chats
- Block and report built in

### 4.5 Profiles (Expression / MySpace DNA)

- Customizable HTML/CSS profile page (MySpace-style)
- Top friends display
- Profile songs / music player
- Status / mood indicator
- Personal blog on profile
- Bulletins (broadcast posts to friends)
- Friends list with mutual connections
- Profile comments section (wall)
- Custom profile layouts & themes
- Profile photo albums
- Interests & hobbies list
- "Who I'd like to meet" section
- Gender & sexuality display fields
- Pronouns field
- Zodiac / personality fields
- About me / bio (rich text)
- Friend requests with message
- Online now indicator
- Browse users by interests/location
- Layout/theme marketplace
- Identity constellation: multiple flags, multiple pronouns, multiple labels simultaneously
- Closeted/anonymous mode toggle per session (profile visibility changes accordingly)
- Face/voice anonymization filters for profile media

---

## 5. Confirmed Design Decisions

- **No dating algorithm.** Dating is not a feature. It can happen organically through Meet + Chat, but the platform never matches people romantically.
- **Q&A is separate from Community.** Community discussions are casual and internal. Q&A is public, structured, SEO-indexed, and permanent.
- **"Other stuff" that shows up on Google like Reddit/Quora** — this is the Q&A section. It is the primary acquisition channel.
- **Community's main purpose is activities.** The point of communities is to organize real-life and virtual events that bring queer people together.
- **Meet is a directory, not a feed.** All users browsable. Filterable. No algorithms pushing people at each other.
- **Chat is essential.** DMs connect people. As long as you have Meet + Chat, organic connections (friendship or romance) will happen.
- **The goal is both:** meet in real life AND bring all queer people together virtually.
- **Teenagers don't use dating apps.** Current queer platforms lose this entire demographic because they're branded as dating/hookup apps. Umbrella is for them too.
- **Queer people want guidance.** The Q&A section answers real questions — about identity, safety, health, coming out, legal rights — that currently scatter across Reddit, Quora, and random blogs.
- **Spacehey proves the model.** A MySpace clone organically attracted a disproportionately queer userbase because it offers self-expression and community without dating pressure. The need is real and unmet.

---

## 6. Feature List (No Explanations)

### Community Features
- Create community
- Join community
- Community roles (owner, moderator, member)
- Community rules & guidelines
- Community banner & icon
- Community about page
- Create event
- RSVP to event (yes / maybe / no)
- Event capacity limits
- Repeating / recurring events
- Event categories (sports, arts, activism, volunteering, social, dating mixer)
- Map view of nearby events
- Event check-in (QR code / proximity)
- Post-event photo albums
- Venue partnership listings
- Venue discount codes for community members
- Carpool / transport coordination
- Accessibility tags (wheelchair access, quiet space, sober event, all-ages)
- Safety check-in ("I arrived safely" / "heading home")
- Per-event group chat
- Event co-hosts
- Recurring event subscription / reminders
- Community challenges
- Community polls & voting
- Photo/video sharing within community
- Community milestones tracking
- Member spotlights
- Discussion threads
- Resource sharing (pinned links, guides)
- Skill sharing board
- Gratitude / thank-you posts
- Countdown to next event
- Attendance streaks
- Calendar sync (Google Calendar, Apple Calendar)
- Icebreaker prompts
- Spin-off sub-groups
- Public community landing page
- Community invite links
- Shareable community cards (Instagram/TikTok auto-generated)
- "Nearby queer events" embeddable widget
- Cross-platform event sharing

### Meet Features
- User directory (browsable)
- Filter by online status
- Filter by location
- Filter by identity
- Filter by interests
- Filter by age range
- Filter by pronouns
- Filter by flags
- Mutual communities indicator
- Interest overlap indicator
- Profile preview card in directory
- Sort by: nearest, newest, recently active, mutual interests

### Q&A Features
- Ask question
- Answer question
- Upvote / downvote answers
- Nested comment threads on answers
- Pin best answer (by author or community vote)
- Question tags / topics
- Search questions
- Browse questions by topic
- Question URL slug (SEO-optimized)
- Public question pages (no login required to read)
- Google-indexed question pages
- Related questions sidebar
- Follow question (get notified of new answers)
- Profile Q&A activity (questions asked, answers given)

### Chat Features
- 1-on-1 direct messages
- Group chat per community
- Group chat per event
- End-to-end encryption
- Self-destructing messages
- Typing indicators
- Read receipts (optional)
- Photo / media sharing
- Voice messages
- Block user
- Report message / user
- Notification controls per chat

### Profile Features
- Customizable HTML/CSS profile
- Profile photo
- Cover photo
- Display name
- Username / handle
- Bio / About me (rich text)
- Pronouns (multiple)
- Flags (multiple — identity flags)
- Gender field
- Sexuality field
- Zodiac / personality fields
- Interests & hobbies
- "Who I'd like to meet"
- Top friends
- Friends list
- Mutual friends indicator
- Friend requests with message
- Profile song / music player
- Status / mood
- Personal blog
- Bulletins (broadcast to friends)
- Profile comments (wall)
- Photo albums
- Custom layouts & themes
- Layout/theme marketplace
- Online / offline / away indicator
- Last active timestamp (optional)
- Account creation date (cake day)
- Closeted / anonymous mode toggle
- Face/voice anonymization filters
- Block user
- Report profile
- Download my data
- Full account deletion (one-click)
- Profile visit history (optional — opt-in)

### Home / Feed Features
- Feed from joined communities (chronological)
- Feed from friends (chronological)
- Event recommendations based on interests + location
- Community recommendations
- Q&A recommendations
- No algorithmic engagement-maximizing dark patterns
- Guest browsing (see events and Q&A without account)
- Interest-based onboarding flow
- Multi-language support
- Community auto-translation

### Moderation Features
- Community moderation tools for owners/mods
- Remove posts / comments
- Ban / mute users from community
- Content flagging / reporting
- NSFW / content warning tags
- Spoiler tags
- Automated profanity / hate speech filters
- User trust / reputation scores for moderators
- Moderation log (transparent)
- Appeal system for bans/removals
- Platform-wide admin tools

### Safety & Privacy Features
- Closeted / anonymous mode (per session toggle)
- End-to-end encrypted DMs
- Self-destructing messages
- Two-factor authentication
- Session management (view/revoke active sessions)
- Login notifications
- Block user
- Report user / content
- Data export
- Full account deletion (one-click, irreversible)
- Privacy controls per profile field
- Location visibility controls
- No real-time GPS broadcasting
- No data sold to advertisers
- No third-party trackers

### Acquisition & Growth Features
- SEO-optimized Q&A pages
- SEO-optimized public event pages
- SEO-optimized public community pages
- Guest browsing (no signup required to view)
- Interest-based onboarding
- Community invite links
- Referral tracking
- Cross-platform sharing (Twitter, Instagram, WhatsApp, TikTok)
- Embeddable "nearby events" widget
- Shareable community cards (auto-generated images)

### Real-World Impact Features (Original to Umbrella)
- Found family groups (non-biological kinship networks)
- Mentorship matching (elder ↔ youth pairing)
- Regional queer resource directory (doctors, lawyers, shelters, therapists)
- Real-time LGBTQ+ legal rights map by GPS location
- Travel safety score per country/region
- One-tap crisis helpline connector (location-aware: Trevor Project, Trans Lifeline, local orgs)
- Coming-out story collection
- Gender transition journal/timeline
- PrEP / HIV resource locator
- Queer-owned business directory with verified badge
- Queer housing / roommate board
- Queer job board & freelance marketplace
- Queer wiki (community-edited knowledge base)
- Fundraising / crowdfunding for transition and emergencies
- Queer media library (user-curated films, books, music, art)
- AI-powered resource bot (trained on queer health, legal, history topics)
- Safety alert system (hostile events, police raids, protests near you)
- Community governance voting (feature requests, policy decisions)
- Cooperative ownership model (transparency dashboard)

### Technical Features
- Public API for third-party integrations
- Web-first with responsive design
- Mobile apps (iOS, Android) as companion
- Progressive Web App support
- Multi-language UI
- Community content auto-translation
- Search across all sections (communities, events, Q&A, users)
- Notification system (in-app, email, push — opt-in)
- Dark mode / light mode
- Accessibility (WCAG 2.1 AA minimum)
- Offline mode (cached content, queue interactions)
