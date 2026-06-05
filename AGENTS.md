# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

YouTube Video Player Playground - a single-page app that uses the official YouTube IFrame Player API for playback and the YouTube Data API for metadata, comments, and chapters. Built for the "Disconnect" app.

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

### Static frontend (`index.html`, `player.html`)

The frontend is static HTML with embedded CSS and vanilla JavaScript - no framework and no bundler.

`index.html` renders the small video grid. `player.html` owns the watch page and loads the official YouTube IFrame Player API directly from YouTube.

The YouTube iframe is treated as an untouched video surface. Custom app controls live in the surrounding toolbar, side panel, and mobile chapter strip rather than inside or on top of the iframe.

### Backend (`api/video.js`)

Single Vercel serverless function that proxies YouTube API v3 requests. Handles four query modes based on query params:

- Default: initial video load (metadata + first comments page)
- `?commentsPage=TOKEN`: paginated comments
- `?replies=PARENT_ID`: nested replies
- `?channelId=ID`: channel info

Responses are cached with `Cache-Control: public, max-age=300, stale-while-revalidate=600`.

### Data flow

1. `loadVideoData()` fetches `/api/video?id={VIDEO_ID}`.
2. Backend queries YouTube v3 endpoints and returns combined JSON.
3. Frontend renders video info, chapters, channel settings, and comments.
4. YouTube playback is controlled only through the official IFrame API methods such as `seekTo()` and `setPlaybackRate()`.
5. User interactions (load more, expand replies) trigger additional API calls.

### Key frontend systems

**Chapters**: Parsed from the video description via regex. Desktop shows a side panel with thumbnails; mobile shows horizontal scrollable chips. Chapter clicks call `player.seekTo()` through the IFrame API.

**Comments**: 3-level threading using `@mention`-based nesting. Visual connector lines between replies are calculated dynamically with `getBoundingClientRect()`. Global state: `nextCommentsPageToken`, `loadingComments`, `allComments`.

**App controls**: Chapters, comments, save progress, finish, channel speed, and fullscreen controls live outside the iframe in the app toolbar. The native YouTube fullscreen button is hidden with the supported `fs=0` player parameter, and the app uses the browser Fullscreen API on the surrounding watch shell.

**Channel settings**: Per-channel playback speed is stored in `localStorage` by YouTube channel ID and applied with `player.setPlaybackRate()` when the player/data are ready.

**Responsive breakpoint**: 760px - below this, the toolbar stacks and chapters appear as a horizontal strip below the player.

### Environment

- `GOOGLE_API_KEY` in `.env` - required for all API calls
- No TypeScript, no test suite, no linter configured
