# Petit Foot

A Norwegian-language, mobile-first French listening and speaking game for children, themed around football.

## Local setup

Requires Node.js 18+ and a Deepgram API key.

1. Copy `.env.example` to `.env`.
2. Set `DEEPGRAM_API_KEY` in `.env` (never commit this file).
3. Run `npm start`.
4. Open `http://localhost:5173` on your Mac.

## iPhone

Microphone access on an iPhone requires HTTPS. For temporary local testing on a Mac, run `cloudflared tunnel --url http://localhost:5173` and open the HTTPS address in iPhone Safari. Select Share → Add to Home Screen. Mac and local server must remain running. For always-on usage deploy the Node server to an HTTPS hosting provider and configure `DEEPGRAM_API_KEY` as a server environment variable.

## Implementation

Deepgram Aura-2 French voice for speech synthesis and Nova-3 French transcription. The backend proxies all Deepgram requests; API keys must never be bundled into frontend files. The browser automatically listens and stops on silence. Recognition feedback is forgiving *text matching*, not phoneme-level pronunciation grading.

Use `?debug=1` for transcript and scoring information. As with any application that handles a child's microphone audio, review consent, privacy and provider retention settings before public deployment.
