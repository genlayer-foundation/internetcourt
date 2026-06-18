# Launch video

This directory holds the Internet Court launch video — a ~11MB branded MOTION + SFX
clip (`internet-court-launch.mp4`).

## Git tracking

By default, `.mp4` binaries in this folder are **gitignored**
(`frontend/.gitignore`: `/public/video/*.mp4`). The canonical launch clip is the
exception: `internet-court-launch.mp4` is **committed** via a gitignore negation
(`!/public/video/internet-court-launch.mp4`), so it ships with the repo and is
available on prod. Any other `.mp4` dropped in this folder stays ignored.

## Local development

The file is copied locally from the user's machine:

```sh
cp "/Users/rasca/Downloads/VIDEO 1 - INTERNET COURT MOTION + SFX v2.mp4" \
  frontend/public/video/internet-court-launch.mp4
```

With the file present, `/video/internet-court-launch.mp4` resolves in dev.

## Production

Because `internet-court-launch.mp4` is committed (see "Git tracking" above), it is
deployed with the app and `/video/internet-court-launch.mp4` resolves on prod — no
separate hosting needed. If you add other (still-ignored) `.mp4` files, those would
need to be hosted separately and referenced by URL.
