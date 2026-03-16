# Project Tracks

This file tracks all major tracks for the project. Each track has its own detailed plan in its respective folder.

---

- [x] **Track: Fix @slide-studio-app/ load process. The Speaker-view is not loading the iframes studio and teleprompter iframes succesfully. Socketcluster channels are expected to signal between the frames of the speaker-view (index.html). On load the Speaker-view page frame "current slide" gathers all the slide deck slides data attributes, then sends the slide deck data to the studio frame. During the presentation when the navigates to a slide with speaker notes, then the current slide frame sends the notes to the teleprompter frame. Ensure socketcluster channels are created and the pages load successful.**
*Link: [./tracks/fix_speaker_view_load_20260315/](./tracks/fix_speaker_view_load_20260315/)*
