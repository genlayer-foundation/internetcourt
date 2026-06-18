# Launch video

This directory holds the Internet Court launch video — a ~11MB branded MOTION + SFX
clip (`internet-court-launch.mp4`).

## Why the mp4 is not in git

The `.mp4` is **gitignored** (see `frontend/.gitignore`: `/public/video/*.mp4`) because
the binary is too large to commit. Only this README is tracked.

## Local development

The file is copied locally from the user's machine:

```sh
cp "/Users/rasca/Downloads/VIDEO 1 - INTERNET COURT MOTION + SFX v2.mp4" \
  frontend/public/video/internet-court-launch.mp4
```

With the file present, `/video/internet-court-launch.mp4` resolves in dev.

## Production (follow-up)

Because the mp4 is gitignored, **production will not have it.** The clip must be
uploaded separately (e.g. Vercel Blob or another public host) and the `src` in the
Watch section / blog video post swapped to that URL — otherwise it 404s on prod.
