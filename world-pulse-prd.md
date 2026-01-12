# World Pulse

**A daily question for the entire internet.**

Everyone votes. Watch opinions shift in real-time across a world map. Simple, addictive, endlessly shareable.

---

## The Concept

One question. One day. One world.

Every day at midnight UTC, a new question goes live. Anyone on the internet can cast their vote. Results update in real-time on an interactive world map, showing how opinions differ across countries and continents.

Tomorrow's question? The community decides. Submit your question ideas, upvote the best ones, and watch the top-voted question go live the next day.

---

## Core Loop

```
See today's question
        ↓
   Cast your vote
        ↓
 Watch global results live
        ↓
Vote on tomorrow's question
        ↓
   Return tomorrow
```

---

## Key Features

### The Daily Question
- One question active at a time, changes every 24 hours (midnight UTC)
- Binary or multiple choice (2-4 options max for clarity)
- Questions range from silly to philosophical:
  - "Pineapple on pizza?"
  - "Is a hot dog a sandwich?"
  - "Should AI have rights?"
  - "Cats or dogs?"
  - "Would you rather fight 100 duck-sized horses or 1 horse-sized duck?"

### Real-Time World Map
- Interactive globe showing vote distribution by country
- Colors shift as votes come in (smooth animations)
- Hover/tap for detailed regional breakdowns
- "Pulse" animation when vote activity spikes
- Toggle between globe view and flat map

### Community Question Queue
- Anyone can submit question proposals
- Community upvotes their favorites
- Top voted question becomes tomorrow's question
- Basic content filters to prevent abuse
- Community flagging for moderation

### Engagement Mechanics
- **Anonymous by default** - No accounts required, fingerprint for rate limiting
- **Streak counter** - "You've voted 15 days in a row"
- **Achievements:**
  - "Early Bird" - voted in first hour
  - "Night Owl" - voted in final hour
  - "Contrarian" - voted with <10% minority
  - "Mainstream" - voted with majority 10 times
  - "Globe Trotter" - voted from 5+ countries
- **Share cards** - Auto-generated images showing your vote vs the world

### Social Layer (Future)
- Daily recap email (opt-in)
- Regional discussion threads

---

## User Experience

### First Visit
1. Land on homepage, see today's question prominently displayed
2. Two big buttons for the options (or 3-4 for multi-choice)
3. Vote with single click
4. Immediately see results animate on the map
5. Prompt to submit a question for tomorrow

### Return Visit
1. See today's question (or reminder you already voted)
2. Explore the map, see regional breakdowns
3. Browse question queue, upvote favorites
4. Check your streak, achievements
5. Share your take on social media

### Mobile Experience
- Full-screen question card
- Swipe left/right to vote (Tinder-style option)
- Simplified map with tap-to-zoom regions
- Bottom sheet for question queue
- Native share integration

---

## Technical Architecture

### Stack
```
┌─────────────────────────────────────────────────────┐
│                   Cloudflare Workers                │
├─────────────────────────────────────────────────────┤
│  Workers          │  API endpoints, SSR             │
│  Durable Objects  │  Real-time vote aggregation     │
│  KV               │  Question cache, config         │
│  D1               │  Historical data, questions     │
│  R2               │  Share card images              │
│  Analytics Engine │  Vote analytics, trends         │
└─────────────────────────────────────────────────────┘
```

### Frontend
- **Framework:** React or SolidJS (for performance)
- **Map:** Globe.gl, D3.js, or Mapbox GL
- **Animations:** Framer Motion or GSAP
- **Styling:** Tailwind CSS
- **Build:** Vite

### Key Technical Decisions

**Real-time vote counting**
- One Durable Object per country for horizontal scale
- Aggregator DO collects country totals into global view
- WebSockets via Durable Objects push updates to clients
- Batched updates (every 100ms) to prevent thrashing

**Rate limiting & identity**
- Browser fingerprinting (FingerprintJS or custom)
- IP-based rate limiting via CF
- One vote per fingerprint per question
- No personally identifiable data stored

**Question rotation**
- Scheduled Worker runs at midnight UTC
- Archives current question + results to D1
- Promotes top-voted question from queue
- Clears vote counters, notifies connected clients

**Share cards**
- Generated on-demand via Workers + Canvas API
- Cached in R2 with question+vote as key
- Open Graph tags for rich social previews

---

## MVP Scope

### Phase 1: Core Voting ✅
- [x] Question display page
- [x] Vote submission (one vote per IP)
- [x] Real-time global results (percentages)
- [x] Basic world map with country coloring
- [x] Mobile-responsive design
- [x] Manual question rotation (admin)

### Phase 2: Community Queue ✅
- [x] Question submission form
- [x] Question queue browsing
- [x] Upvoting questions
- [x] Automated daily rotation (top question wins)
- [x] Basic content filtering

### Phase 3: Polish ✅
- [x] Smooth map animations (pulse effects, transitions)
- [x] Regional drill-down (hover/click)
- [x] Share card generation
- [x] Streak tracking
- [x] Achievement system (auto-granting)

---

## Content Strategy

### Seed Questions
Launch with a curated set of engaging questions:
1. "Pineapple on pizza: yes or no?"
2. "Is a hot dog a sandwich?"
3. "Morning person or night owl?"
4. "Cats or dogs?"
5. "Is water wet?"
6. "Should toilet paper hang over or under?"
7. "Would you take a one-way trip to Mars?"

### Question Categories (future)
- **Silly** - Lighthearted debates
- **Philosophical** - Deep questions
- **Current Events** - Topical polls
- **Would You Rather** - Hypotheticals
- **Predictions** - "Will X happen this year?"

### Moderation Approach
- Automated filters for obvious violations
- Community flagging system
- Minimum upvotes required before going live
- Admin override capability
- No political/religious questions in MVP

---

## Success Metrics

### Primary
- **DAU (Daily Active Users)** - Unique voters per day
- **Return Rate** - % who vote multiple days
- **Streak Distribution** - Engagement depth

### Secondary
- **Questions Submitted** - Community participation
- **Shares** - Viral coefficient
- **Time on Site** - Engagement quality
- **Geographic Coverage** - Votes from X countries

### Targets (Month 1)
- 10,000 unique voters
- 30% return rate (day 2)
- 500 questions submitted
- 100 countries represented

---

## Future Roadmap

### Near-term
- Flash polls (1-hour questions for breaking events)
- Historical archive browser
- Time-lapse replay of voting patterns
- Embeddable widgets for other sites
- API for developers

### Medium-term
- Prediction markets ("What % will vote yes?")
- Regional leaderboards
- Daily recap newsletter
- Push notifications (web/mobile)
- Multi-language support

### Long-term
- Native mobile apps
- Sponsored questions (clearly labeled)
- Premium features (ad-free, extra stats)
- Partnerships (media outlets, brands)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Bot voting | Fingerprinting, rate limits, anomaly detection |
| Offensive questions | Filters, community flagging, min upvotes |
| Low engagement | Seed with great questions, social sharing |
| Regional bias | Promote in multiple regions, localization |
| Infrastructure costs | Cloudflare's generous free tier, caching |

---

## Name Candidates

| Name | Domain Check | Notes |
|------|--------------|-------|
| World Pulse | worldpulse.app | Strong, evocative |
| The Daily Vote | thedailyvote.com | Clear, descriptive |
| OneQuestion | onequestion.io | Simple, memorable |
| Vox Pop | voxpop.world | Latin flair |
| Global Pulse | globalpulse.io | Alternative |

---

## Open Questions

1. Should we show results before voting? (could bias votes)
2. How to handle time zones fairly? (midnight UTC, or rolling?)
3. Minimum upvotes needed for question to be eligible?
4. Should there be a "skip" option for questions you don't care about?
5. How to prevent pile-on voting in final hours?

---

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
- [Globe.gl](https://globe.gl/)
- [FingerprintJS](https://fingerprint.com/)
