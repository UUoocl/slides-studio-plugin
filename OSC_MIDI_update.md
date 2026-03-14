Design Pattern Analysis
  The approach of creating specific routes for each device is a form of Dynamic Routing or Runtime Route Registration.


  In the context of SSE and device messaging, this is often associated with:
   1. Topic-based Publish-Subscribe (Pub/Sub): Each device acts as a "topic" (the route), and clients "subscribe" by connecting to that
      specific endpoint.
   2. The Observer Pattern: The server acts as the subject, and the SSE clients are observers. By splitting them into unique routes, you are
      creating a more granular observation model where clients only receive data for the specific "subject" (device) they care about.


  Implementation Details
  I modified src/utils/serverLogic.ts to iterate through your oscDevices and midiDevices settings when starting the Fastify server:


   * OSC Routes: /api/osc/events/${deviceName}
   * MIDI Routes: /api/midi/events/${deviceName}

  To ensure these routes are kept in sync when you add or remove devices in the settings tab, I recommend clicking the Restart Server button in
  the settings. I can also automate this restart if you'd like the server to refresh whenever the device list is modified.
