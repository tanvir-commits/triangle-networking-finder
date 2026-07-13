# Triangle Networking Finder

A mobile-first static web app that helps you find nearby Triangle places where you are likely to meet successful, affluent, educated, and well-connected professionals.

Built for use from **Durham, NC 27707**.

## Live app

After deployment, open:

`https://tanvir-commits.github.io/triangle-networking-finder/`

## Features

- 46 curated real places across churches, premium fitness, yoga, country clubs, professional networking, culture, and upscale social venues
- Search, category filters, drive-time filter, and sorting
- Networking score ranking
- Favorites shortlist, visited tracking, personal ratings and notes
- Export / import / reset for local browser data
- Light and dark mode
- No backend, no login, no paid APIs

## Local development

```bash
npm install
npm run dev
```

## Use on your iPhone over Wi-Fi

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Then open the LAN URL shown in the terminal, for example:

```text
http://192.168.1.100:5173
```

Your phone must be on the same Wi-Fi network as your PC.

## Deploy to GitHub Pages

```bash
npm run deploy
```

This builds the app and publishes the `dist` folder to the `gh-pages` branch.

## Data notes

- Drive times are approximate from Durham 27707 and can be refined later
- Every entry uses a real organization website and Google Maps search link
- Audience descriptions are based on public positioning, programming, and membership models — not unsupported demographic claims
