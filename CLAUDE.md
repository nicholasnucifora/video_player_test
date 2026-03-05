# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Video Player Playground — a single-page app integrating Vidstack media player with YouTube video data, comments, and chapters. Built for the "Disconnect" app.

## Commands

```bash
npm run dev    # Start local Vercel dev server (runs API + static files)
npm run build  # No-op (static site, no build step)
```

## After Every Change

After completing any code change, always run:

```bash
git add . && git commit -m "<short description of change>" && git push
```

Deployment is via Vercel. The local dev server requires a `.env` file with `GOOGLE_API_KEY`.

## Architecture

### Single-file frontend (`index.html`)
The entire frontend is one large HTML file (~1300 lines) with embedded CSS and vanilla JavaScript — no framework, no bundler. Vidstack player is loaded from CDN.

### Backend (`api/video.js`)
Single Vercel serverless function that proxies YouTube API v3 requests. Handles four query modes based on query params:
- Default: initial video load (metadata + first comments page)
- `?commentsPage=TOKEN`: paginated comments
- `?replies=PARENT_ID`: nested replies
- `?channelId=ID`: channel info

Responses are cached with `Cache-Control: public, max-age=300, stale-while-revalidate=600`.

### Data flow
1. `loadVideoData()` fetches `/api/video?id={VIDEO_ID}`
2. Backend queries YouTube v3 endpoints and returns combined JSON
3. Frontend renders video info, chapters, and comments
4. User interactions (load more, expand replies) trigger additional API calls

### Key frontend systems

**Chapters**: Parsed from video description via regex, injected as WebVTT track into the player. Desktop shows side panel with thumbnails; mobile shows horizontal scrollable chips.

**Comments**: 3-level threading using `@mention`-based nesting. Visual connector lines between replies are calculated dynamically with `getBoundingClientRect()`. Global state: `nextCommentsPageToken`, `loadingComments`, `allComments`.

**Player controls**: Custom buttons injected into Vidstack's control bar (chapters, comments). Vidstack's native chapters button is intercepted and replaced.

**Responsive breakpoint**: 768px — below this, layout switches from theatre (side panel) to stacked, and fullscreen uses a fixed overlay panel.

### Environment
- `GOOGLE_API_KEY` in `.env` — required for all API calls
- No TypeScript, no test suite, no linter configured
