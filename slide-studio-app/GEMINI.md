# slide-studio-app
## description
Slides Studio plugin is designed to support HTML apps, slide-studio-app is the main app.  
Slide-studio-app is a reveal.js slide deck tool to navigate slides and emit slide tags through the slides studio api.

## features
* speaker-view page (slide-studio-app/index.html)
  * load a reveal js slide deck
  * view current slide and next slide in iframes. 
  * navigate slides through current slide iframe, tabulator table, or Server Sent Events(SSE). 
  * switch between modes
  * teleprompter mode - view slide notes as a telepromter
    * control teleprompter scroll speed 
    * control teleprompter font size
    * control ui directly or via SSE
    * other ui controls
  * Studio mode - configure slide settings in tabulator table
    * set slide scene
    * set slide camera shape
    * navigate between slides by clicking row id. 
  * Send slide state from the slide-studio-app/studio.html
* slide-view page (slide-studio-app/slide_view/slides_studio_slide_view.html)
  * receive slide state via SSE
  