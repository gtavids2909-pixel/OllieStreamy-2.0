# Olliestreamy: Restore and Repair

## What it is
A video and live streaming platform, rebuilt from the uploaded `Olliestreamy-fixed.zip`.
The code goes back in exactly as uploaded. After that it gets run, checked, and any broken parts get fixed.

## Who it's for
- The owner of Olliestreamy, who needs their existing app running again with nothing changed
- The app's current viewers and streamers, who should get the same experience they had before

## Core features and experience
- **Exact restore:** all pages, screens, styling, wording and behaviour stay as they are in the zip. Nothing gets redesigned and no features are added.
- **Streaming features:** every feature in the uploaded code is kept, including video/live playback, browsing, accounts and anything else it has, and each one is confirmed to work.
- **Outside services:** every outside service the code uses (for example video hosting, payments, AI or email) is found and listed. The owner's own API keys are then plugged in. Code that talks to these services keeps the approach the original code uses, unless that approach is broken.
- **Bug fixing:** if something doesn't start, crashes or behaves wrongly, it gets fixed with the smallest change possible. The look and flow stay the same.

## Phase 1: what gets built now
1. Unpack the zip and put the app back in place exactly as uploaded.
2. List every outside service the app needs and ask the owner for those keys in one request.
3. Connect the keys and get the app running from start to finish.
4. Test the main streaming flows: open the app, browse, play or start a stream, and use the account features if the app has them.
5. Fix anything broken and report what was changed and why.
