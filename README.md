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

## Football player collection (2025/26 edition)

The app includes eight real-footballer cards built with original Petit Foot artwork and Wikimedia Commons photos. A player card unlocks after completing a six-word French round with **four or more successful speech-to-text matches**. Repeated successful rounds unlock the next card. Progress and XP are stored only in the local browser (localStorage), so they are device-specific and can be lost if Safari data is cleared. There are no purchases or random loot boxes.

### Ratings
Card ratings use an **editorial Petit Foot 0–100 scale**:

`OVR = round(0.45 × estimated world standing + 0.55 × estimated position level)`

The two inputs are curated subjective estimates, **not independently verified world rankings, 2025/26 performance statistics, or official EA/league scores**. A higher number does not establish that a player is objectively better than another across positions. The three role attributes on each card are illustrative estimates as well.

### Photos / attribution

Photographs are loaded from Wikimedia Commons at runtime. Each unlocked card links to its file page and license and names its credited photographer; images are cropped by CSS for the card composition. Check the current rights status and commercial publicity/personality rights before any public/commercial release. A Creative Commons photo license alone does **not** grant endorsements or override image subjects' personality rights. We have not obtained player endorsements.

| Footballer | Commons filename | Attribution | License |
| --- | --- | --- | --- |
| Thibaut Courtois | Thibaut Courtois WC2022.jpg | Hossein Zohrevand / Tasnim News Agency | CC BY 4.0 |
| Virgil van Dijk | Liverpool vs. Chelsea, UEFA Super Cup 2019-08-14 05 (Virgil Van Dijk).jpg | Mehdi Bolourian / Fars Media Corporation | CC BY 4.0 |
| Jude Bellingham | Jude Bellingham 2022-11-21 1.jpg | Hossein Zohrevand / Tasnim News Agency | CC BY 4.0 |
| Mohamed Salah | Mohamed Salah 2022.png | Al AHLY TV | CC BY 3.0 |
| Lamine Yamal | Lamine Yamal in 2025 (cropped).jpg | Biso; cropped by Mickey Đại Phát | CC BY 4.0 |
| Kylian Mbappé | Kylian Mbappe 2017.jpg | Biser Todorov | CC BY 4.0 |
| Erling Haaland | Erling Haaland 2023.jpg | Jacek Stanislawek | CC BY-SA 4.0 |
| Lionel Messi | Inter Miami Messi 2024 (cropped).jpg | TheSoccerBoy; crop by CarterSterling | CC BY 4.0 |

For sources, follow `https://commons.wikimedia.org/wiki/File:<filename>`. Photo inclusion is informational, not sponsorship or endorsement. CC BY-SA imposes special sharing obligations for adapted photo material; evaluate those obligations before redistribution.
