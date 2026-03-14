### **ZoomOSC**
**Events (Outputs)**
*   **User Outputs**: Participant Video Turned On, Participant Video Turned Off, Participant Unmuted, Participant Muted, Active Speaker Changed, Spotlight Started, Chat Message Received, User Online, User Role Updates, User Offline, User’s Hand Raised, User’s Hand Lowered, Spotlight Stopped, List Output, User Rename Event, User Emoji Changed, User is Speaking, User Stopped Speaking, User Leaves Waiting Room, User Joined Waiting Room, User started sharing audio, User stopped sharing audio, User started sharing video, and User stopped sharing video.
*   **Meeting and System Outputs**: Meeting Status Changed, Gallery Order, Ping Reply (Pong), Gallery Count, Gallery Shape, List of Breakout Rooms, Spotlight Order, Webinar Emoji Reaction Count, and Live Transcription Data.
*   **Webinar and Q&A Outputs**: Webinar Question Deleted, Webinar Question Asked, Answer Deleted for Question, Answered Question with Text, Question Dismissed, Question Answered Live, Completed Live Answer to Question, List of Questions, List of Answers, and Question Information.
*   **Poll Outputs**: List of Polls, List of Poll Answers, List of Poll Question Info, and Poll Metadata Info.
*   **Device and Setting Outputs**: Mic Devices List, Speaker Devices List, Virtual Background List, Camera Devices List, Current Mic Device, Current Speaker Device, Mic Level, Current Camera Device, Speaker Volume, Waiting Room User List, Current Virtual Background, Current Video Filter, Windows List, and Screens List.

**Requests (Commands)**
*   **User Commands**:
    *   **Video/Mic**: Request Video On, Set Video Off, Toggle Video, Mute Mic, Unmute Mic, and Toggle Mic.
    *   **Spotlight**: Spotlight, Add Spotlight, Toggle Spotlight, and Un-Spotlight.
    *   **Hand Raising**: Raise Hand, Lower Hand, and Toggle Hand.
    *   **Pin**: Pin Participant, Add Pin, Pin to Second Screen, Un-Pin Participant, Un-Pin from Second Screen, Toggle Pin First Screen, and Toggle Pin Second Screen.
    *   **View**: Set Gallery View, Set Speaker View, Clear all Pins, Next Gallery Page, and Previous Gallery Page.
    *   **User Roles and Action**: Make Host, Make Co-Host, Reclaim Host, Revoke Co-Host, Make Panelist, Make Attendee, Eject from Meeting, and Rename.
    *   **Chat**: Send Chat.
    *   **Webinars**: Allow Attendee to Speak, Disallow Attendee to Speak, Allow to Record, and Disallow to Record.
    *   **Breakout Rooms**: Send User to Breakout Room, Remove User from Breakout Room, Assign User to Breakout Room, and Un-assign User from Breakout Room.
    *   **Waiting Rooms**: Send User to Waiting Room and Admit User from Waiting Room.
    *   **Screenshare**: List Screens, List Windows, Start Windowshare, Start Screenshare, Stop Share, Start Screenshare (Primary Display), Start Sharing Computer Audio (Only), Enable Computer Sound (for Sharing), Start Sharing Camera Source, Disable Computer Sound (for Sharing), Advance to Next Camera Share Source, Enable Video Share Optimization, Disable Video Share Optimization, Set Primary Window Size, and Set Primary Window Position.
    *   **Settings**: Display Usernames on Videos, Hide Usernames on Videos, Hide Non-Video Participants, Show Non-Video Participants, Enable “Original Sound”, Disable “Original Sound”, List All Camera Devices, List All Speaker Devices, Set Camera Device, Set Speaker Device, Set Mic Device, List All Mic Devices, Show Self View, Hide Self View, Get Current Camera Device, Get Current Mic Device, List Virtual Backgrounds, Get Current Speaker Device, Change Virtual Background, Get Current Virtual Background, Get Mic Level, Get Speaker Volume, Set Speaker Volume, Set Mic Level, Enable Mirror Video, Enable HD Video, Disable HD Video, Disable Mirror Video, and Set Video Filter.
*   **Global Commands**:
    *   **Global Functions**: Enable Users Unmuting, Disable User Unmuting, Clear Spotlight, Lower All Raised Hands, Join a Meeting, Leave Meeting, Ping ZoomOSC, End Meeting, Eject All Webinar Attendees, Unmute All, Mute All, Send Chat to Everyone, Get Webinar Reaction Count, Reset Webinar Reaction Counters, and Start a Meeting.
    *   **Breakout Rooms**: Request Breakout Rooms List, Create Breakout Room, Delete Breakout Room, Open Breakout Rooms, Close Breakout Rooms, Configure Breakout Rooms, Delete All Breakout Rooms, and Broadcast Message to Breakout Rooms.
    *   **Meeting and Webinar Q&A**: Answer Question with Text, Mark Question as Answering Live, Finish Answering Question, Dismiss Question, Delete Question, Reopen Question, Get Question List, Get Question Info, Get Answer List, and Get Answer Info.
    *   **Polls**: Start Poll, Stop Poll, Get Poll Answers, Get Poll Info, Get List of Polls, Relaunch Poll, and Get Poll Questions.
    *   **Recording**: Pause Local Recording, Start Local Recording, Stop Local Recording, Resume Local Recording, Pause Cloud Recording, Start Cloud Recording, Stop Cloud Recording, and Resume Cloud Recording.
    *   **Waiting Rooms and ZAK Join**: Disable Waiting Room, Enable Waiting Room, ZAK Join Meeting, ZAK Start Meeting, Message Waiting Room, and Admit All from Waiting Room.
    *   **Memory Management**: Update TargetIDs, Include, Load via OSC, Load from Target List, Save to Target List, Reset, List, Subscription Level, Gallery Track Mode, Request Order of Gallery View, and Request Order of Spotlights.
    *   **Gallery Tracking and Data Requests**: Request Gallery Count.


##ZOomOSC requests and events with arguments

Based on the provided ZoomOSC documentation, here is an outline of the ZoomOSC API events (Outputs) and requests (Commands) grouped by category. 

*Note: User Commands are appended to a target designation (e.g., `/zoom/userName/`, `/zoom/galIndex/`, `/zoom/zoomID/`, `/zoom/me/`, or group macros like `/zoom/all/`). The schemas below use `../` to represent this prefix for User Commands. The schema arguments use `{type name}` format as defined in the source.*

### 1. User Commands (Requests needing a Target)

**Video / Mic Commands**
*   **Request Video On:** `../videoOn`
*   **Set Video Off:** `../videoOff`
*   **Toggle Video:** `../toggleVideo`
*   **Mute Mic:** `../mute`
*   **Unmute Mic:** `../unMute`
*   **Toggle Mic:** `../toggleMute`

**Spotlight Commands**
*   **Spotlight:** `../spot`
*   **Add Spotlight:** `../addSpot`
*   **Toggle Spotlight:** `../toggleSpot`
*   **Un-Spotlight:** `../unSpot`

**Hand Raising Commands**
*   **Raise Hand:** `../raiseHand`
*   **Lower Hand:** `../lowerHand`
*   **Toggle Hand:** `../toggleHand`

**Pin Commands**
*   **Pin Participant:** `../pin`
*   **Add Pin:** `../addPin`
*   **Pin to Second Screen:** `../pin2`
*   **Un-Pin Participant:** `../unPin`
*   **Un-Pin from Second Screen:** `../unPin2`
*   **Toggle Pin First Screen:** `../togglePin`
*   **Toggle Pin Second Screen:** `../togglePin2`

**View Commands**
*   **Set Gallery View:** `../setGalleryView`
*   **Set Speaker View:** `../setSpeakerView`
*   **Clear all Pins:** `../clearPin`
*   **Next Gallery Page:** `../galleryPageNext`
*   **Previous Gallery Page:** `../galleryPagePrev`

**User Roles and Action Commands**
*   **Make Host:** `../makeHost`
*   **Make Co-Host:** `../makeCoHost`
*   **Reclaim Host:** `../reclaimHost`
*   **Revoke Co-Host:** `../revokeCoHost`
*   **Make Panelist:** `../makePanelist`
*   **Make Attendee:** `../makeAttendee`
*   **Eject from Meeting:** `../eject`
*   **Rename:** `../rename`

**Chat Commands**
*   **Send Chat:** `../chat {str chat message}`

**Webinars**
*   **Allow Attendee to Speak:** `../allowToSpeak`
*   **Disallow Attendee to Speak:** `../disallowToSpeak`
*   **Allow to Record:** `../allowToRecord`
*   **Disallow to Record:** `../disallowToRecord`

**Breakout Rooms**
*   **Send User to Breakout Room:** `../sendToBreakout {str breakout name | int breakout index}`
*   **Remove User from Breakout Room:** `../removeFromBreakout {str breakout name | int breakout index}`
*   **Assign User to Breakout Room:** `../assignToBreakout {str breakout name | int breakout index}`
*   **Un-assign User from Breakout Room:** `../unassignFromBreakout {str breakout name | int breakout index}`

**Waiting Rooms**
*   **Send User to Waiting Room:** `../sendToWaitingRoom`
*   **Admit User from Waiting Room:** `../admit`

**Screenshare Commands**
*   **List Screens:** `../listScreens`
*   **List Windows:** `../listWindows`
*   **Start Windowshare:** `../startWindowShare {int windowID | str windowName}`
*   **Start Screenshare:** `../startScreenShare {int screenID | str screenName}`
*   **Stop Share:** `../stopShare`
*   **Start Screenshare (Primary Display):** `../startScreenSharePrimary`
*   **Start Sharing Computer Audio (Only):** `../startAudioShare`
*   **Enable Computer Sound (for Sharing):** `../enableComputerSoundWhenSharing`
*   **Start Sharing Camera Source:** `../startCameraShare`
*   **Disable Computer Sound (for Sharing):** `../disableComputerSoundWhenSharing`
*   **Advance to Next Camera Share Source:** `../shareNextCamera`
*   **Enable Video Share Optimization:** `../enableOptimizeVideo`
*   **Disable Video Share Optimization:** `../disableOptimizeVideo`
*   **Set Primary Window Size:** `../setWindowSize {int width | int height}`
*   **Set Primary Window Position:** `../setWindowPosition {int x| int y}`

**Settings Commands**
*   **Display Usernames on Videos:** `../showUserNames`
*   **Hide Usernames on Videos:** `../hideUserNames`
*   **Hide Non-Video Participants:** `../hideNonVideoParticipants`
*   **Show Non-Video Participants:** `../showNonVideoParticipants`
*   **Enable “Original Sound”:** `../enableOriginalSound`
*   **Disable “Original Sound”:** `../disableOriginalSound`
*   **List All Camera Devices:** `../listCameraDevices`
*   **List All Speaker Devices:** `../listSpeakerDevices`
*   **Set Camera Device:** `../setCameraDevice {string deviceID | int index}`
*   **Set Speaker Device:** `../setSpeakerDevice {string deviceID | int index}`
*   **Set Mic Device:** `../setMicDevice {string deviceID | int index}`
*   **List All Mic Devices:** `../listMicDevices`
*   **Show Self View:** `../showSelfView`
*   **Hide Self View:** `../hideSelfView`
*   **Get Current Camera Device:** `../getCameraDevice`
*   **Get Current Mic Device:** `../getMicDevice`
*   **List Virtual Backgrounds:** `../listBackgrounds`
*   **Get Current Speaker Device:** `../getSpeakerDevice`
*   **Change Virtual Background:** `../setBackground {int index | str bgName}`
*   **Get Current Virtual Background:** `../getBackground`
*   **Get Mic Level:** `../getMicLevel`
*   **Get Speaker Volume:** `../getSpeakerVolume`
*   **Set Speaker Volume:** `../setSpeakerVolume {int 0> 100}`
*   **Set Mic Level:** `../setMicLevel {int 0> 100}`
*   **Enable Mirror Video:** `../enableMirrorVideo`
*   **Disable Mirror Video:** `../disableMirrorVideo`
*   **Enable HD Video (Setting):** `../enableHDVideo`
*   **Disable HD Video (Setting):** `../disableHDVideo`
*   **Set Video Filter:** `../setVideoFilter`

---

### 2. Global Commands (Requests not requiring a target)

**Global Functions**
*   **Enable Users Unmuting:** `/zoom/enableUsersUnmute`
*   **Disable User Unmuting:** `/zoom/disableUsersUnmute`
*   **Clear Spotlight:** `/zoom/clearSpot`
*   **Lower All Raised Hands:** `/zoom/lowerAllHands`
*   **Join a Meeting:** `/zoom/joinMeeting {str meetingID} {str meetingPass} {str userName}`
*   **Leave Meeting:** `/zoom/leaveMeeting`
*   **Ping ZoomOSC:** `/zoom/ping {optional any argument to reply}`
*   **End Meeting:** `/zoom/endMeeting`
*   **Eject All Webinar Attendees:** `/zoom/ejectAttendees`
*   **Unmute All:** `/zoom/all/unMute`
*   **Mute All:** `/zoom/all/mute`
*   **Send Chat to Everyone:** `/zoom/chatAll {str message}`
*   **Get Webinar Reaction Count:** `/zoom/getWebinarReactionCounts`
*   **Reset Webinar Reaction Counters:** `/zoom/resetWebinarReactionCounts`
*   **Start a Meeting:** `/zoom/startMeeting {str meetingID} {str meetingPass} {str userName}`

**Breakout Rooms**
*   **Request Breakout Rooms List:** `/zoom/listBreakouts`
*   **Create Breakout Room:** `/zoom/createBreakout {string breakoutName | int bo_index}`
*   **Delete Breakout Room:** `/zoom/deleteBreakout {string breakoutName | int bo_index}`
*   **Open Breakout Rooms:** `/zoom/openBreakouts`
*   **Close Breakout Rooms:** `/zoom/closeBreakouts`
*   **Configure Breakout Rooms:** `/zoom/configureBreakouts {int postCloseSeconds} {int allowChooseBreakout (0=false, 1=true)} {int allowReturnAtWill} {int autoMoveParticipants} {int useTimer} {int closeWithTimer} {int breakoutDurationSeconds}`
*   **Delete All Breakout Rooms:** `/zoom/deleteAllBreakouts`
*   **Broadcast Message to Breakout Rooms:** `/zoom/broadcastToBreakouts {string message}`

**Meeting and Webinar Q&A**
*   **Answer Question with Text:** `/zoom/answerQuestionText {string answer, string question_id}`
*   **Mark Question as Answering Live:** `/zoom/answerQuestionLive {string question_id}`
*   **Finish Answering Question:** `/zoom/answerQuestionDone {string question_id}`
*   **Dismiss Question:** `/zoom/dismissQuestion {string question_id}`
*   **Delete Question:** `/zoom/deleteQuestion {string question_id}`
*   **Reopen Question:** `/zoom/reopenQuestion {string question_id}`
*   **Get Question List:** `/zoom/getQuestionList`
*   **Get Question Info:** `/zoom/getQuestionInfo {string question_id}`
*   **Get Answer List:** `/zoom/getAnswerList {(optional) string question_id}`
*   **Get Answer Info:** `/zoom/getAnswerInfo {string answer_id}`

**Polls**
*   **Start Poll:** `/zoom/startPoll {string poll_ID}`
*   **Stop Poll:** `/zoom/stopPoll {string poll_ID}`
*   **Get Poll Answers:** `/zoom/getPollAnswers {string poll_ID}`
*   **Get Poll Info:** `/zoom/getPollInfo {string poll_ID}`
*   **Get List of Polls:** `/zoom/getPollList`
*   **Relaunch Poll:** `/zoom/relaunchPoll {string poll_ID}`
*   **Get Poll Questions:** `/zoom/getPollQuestions {string poll_ID}`

**Recording**
*   **Pause Local Recording:** `/zoom/pauseLocalRecording`
*   **Start Local Recording:** `/zoom/startLocalRecording`
*   **Stop Local Recording:** `/zoom/stopLocalRecording`
*   **Resume Local Recording:** `/zoom/resumeLocalRecording`
*   **Pause Cloud Recording:** `/zoom/pauseCloudRecording`
*   **Start Cloud Recording:** `/zoom/startCloudRecording`
*   **Stop Cloud Recording:** `/zoom/stopCloudRecording`
*   **Resume Cloud Recording:** `/zoom/resumeCloudRecording`

**Waiting Rooms and ZAK Join**
*   **Disable Waiting Room:** `/zoom/disableWaitingRoom`
*   **Enable Waiting Room:** `/zoom/enableWaitingRoom`
*   **ZAK Join Meeting:** `/zoom/zakJoin {str zak} {str meetingID} {str name} [optional] {str password}`
*   **ZAK Start Meeting:** `/zoom/zakStart {str zak} {str meetingID} {str name} [optional] {str password}`
*   **Message Waiting Room:** `/zoom/messageWaitingRoom {str message}`
*   **Admit All from Waiting Room:** `/zoom/admitAll`

**Memory Management**
*   **Update TargetIDs:** `/zoom/update`
*   **Include:** `/zoom/include`
*   **Load via OSC:** `/zoom/load {string userName1} .. {string userNameN}`
*   **Load from Target List:** `/zoom/load`
*   **Save to Target List:** `/zoom/save`
*   **Reset:** `/zoom/reset`
*   **List:** `/zoom/list`
*   **Subscription Level:** `/zoom/subscribe {int mode}`
*   **Gallery Track Mode:** `/zoom/galTrackMode {int participantID = 0, zoomID = 1}`
*   **Request Order of Gallery View:** `/zoom/getGalleryOrder`
*   **Request Order of Spotlights:** `/zoom/getSpotOrder`

**Gallery Tracking and Data Requests**
*   **Request Gallery Count:** `/zoom/galCount`

---

### 3. Outputs (Events)

**User Outputs**
*(Note: Many of these append "usual user messages (4)", referring to the user's Zoom index, ZoomID, Name, etc.)*
*   **Participant Video Turned On:** `/zoomosc/user|me/videoOn usual user messages (4)`
*   **Participant Video Turned Off:** `/zoomosc/user|me/videoOff usual user messages (4)`
*   **Participant Unmuted:** *(Path not explicitly formatted, typically `/zoomosc/user|me/unMute`)*
*   **Participant Muted:** *(Path not explicitly formatted, typically `/zoomosc/user|me/mute`)*
*   **Active Speaker Changed:** `/zoomosc/user|me/activeSpeaker usual user messages (4)`
*   **Spotlight Started:** `/zoomosc/user|me/spotlightOn usual user messages (4)`
*   **Chat Message Received:** `/zoomosc/user|me/chat usual user messages (4), {str message} {str message_id}`
*   **User Role Updates:** `/zoomosc/user|me/roleChanged usual user messages (4), {int role}`
*   **User Online:** `/zoomosc/user|me/online usual user messages (4)`
*   **User Offline:** `/zoomosc/user|me/offline usual user messages (4)`
*   **User's Hand Raised:** `/zoomosc/user|me/handRaised usual user messages (4), {str message}`
*   **User's Hand Lowered:** `/zoomosc/user|me/handLowered usual user messages (4)`
*   **Spotlight Stopped:** `/zoomosc/user|me/spotlightOff usual user messages (4)`
*   **List Output:** `/zoomosc/user|me/list usual user messages (4) {int targetCount} {int listCount} {int userRole} {int onlineStatus} {in videoStatus} {int audioStatus} {int handRaised}`
*   **User Rename Event:** `/zoomosc/user|me/userNameChanged usual user messages (4) {str oldUserName}`
*   **User Emoji Changed:** `/zoomosc/user|me/emoji changed usual user messages (4) {int emojiID}`
*   **User is Speaking:** `/zoomosc/user|me/isSpeaking usual user messages (4)`
*   **User Stopped Speaking:** `/zoomosc/user|me/stoppedSpeaking usual user messages (4)`
*   **User Leaves Waiting Room:** `/zoomosc/user|me/leftWaitingRoom usual user messages (4)`
*   **User Joined Waiting Room:** `/zoomosc/user|me/joinedWaitingRoom usual user messages (4)`
*   **Live Transcription Data:** `/zoomosc/user|me/transcriptMessage usual user messages (4) for SPEAKER {str transcribed_text, int operation_type, str enum_language}`
*   **User started sharing audio:** `/zoomosc/user|me/audioShareStarted usual user messages (4)`
*   **User stopped sharing audio:** `/zoomosc/user|me/audioShareStopped usual user messages (4)`
*   **User started sharing video:** `/zoomosc/user|me/videoShareStarted usual user messages (4)`
*   **User stopped sharing video:** `/zoomosc/user|me/videoShareStopped usual user messages (4)`

**Meeting and System Outputs**
*   **Meeting Status Changed:** `/zoomosc/meetingStatusChanged {int status_code, int error_code, int exit_code}`
*   **Gallery Order:** *(Path not explicitly formatted in text, usually /zoomosc/galleryOrder)*
*   **Ping Reply (Pong):** *(Path not explicitly formatted)*
*   **List of Breakout Rooms Output:** `/zoomosc/listBreakouts {int index} {str bo_name}`
*   **Spotlight Order:** `/zoomosc/spotOrder {int item0} ... {int itemN}`
*   **Webinar Emoji Reaction Count:** `/zoomosc/webinarReactionCounts {int clapping, int thumbsup, int heart, int joy, int openmouth, int tada}`

**Webinar and Q&A Outputs**
*   **Webinar Question Deleted:** `/zoomosc/user|me/deletedQuestion usual user messages (4) for ASKER {str question, str question_id}`
*   **Webinar Question Asked:** `/zoomosc/user|me/askedQuestion usual user messages (4) for ASKER {str question, str question_id}`
*   **Answer Deleted for Question:** `/zoomosc/user|me/deletedAnswer usual user messages (4) for ANSWERER {str answer, int votes, str question_id, str answer_id}`
*   **Answered Question with Text:** `/zoomosc/user|me/answeredQuestionText usual user messages (4) for ANSWERER {str answer, int votes, str question_id, str answer_id}`
*   **Question Dismissed:** `/zoomosc/user|me/questionDismissed usual user messages (4) for ASKER {str question, int votes, str question_id}`
*   **Question Answered Live:** `/zoomosc/user|me/questionAnsweredLive usual user messages (4) for ASKER {str question, int votes, str question_id}`
*   **Completed Live Answer to Question:** `/zoomosc/user|me/questionAnsweredDone usual user messages (4) for ASKER {str question, int votes, str question_id}`
*   **List of Questions:** `/zoomosc/questionList {int list_index, int list_size, str question_id, str question_conent}`
*   **List of Answers:** `/zoomosc/answerList {int list_index, int list_size, str answer_id, str answer_conent}`
*   **Question Information:** `/zoomosc/questionInfo {int q_id, str sender_name, str q_content, bool isSenderMyself, int timestamp, bool isAnonymous, bool isMarkedAnswered, bool isMarkedDismissed, int votes, bool hasLiveAnswers, bool hasTextAnswers, bool isSelfUpVoiting, bool isSelfAnswering}`

**Poll Outputs**
*   **List of Polls:** `/zoomosc/polls {int list_index, int list_size, str poll_id, str poll_name, int pollStatus, int pollType, int isPollLibrary, int numQuestions}`
*   **List of Poll Answers:** `/zoomosc/pollAnswers {int list_index, int list_size, str poll_id, str poll_question_id, str poll_sub_question_id, str poll_answer_id, str poll_answer_name, int numChosen}`
*   **List of Poll Question Info:** `/zoomosc/pollQuestions {int list_index, int list_size, str poll_id, str poll_question_id, str poll_question_name, int question_type}`
*   **Poll Metadata Info:** `/zoomosc/pollInfo {str poll_id, str poll_name, int pollStatus, int pollType, int isPollLibrary, int numQuestions}`

**Device and Setting Outputs**
*   **Mic Devices List:** `/zoomosc/user|me/micDevices {int itemIndex}, {int listSize}, {str deviceID}, {str deviceName}, {int isSelected}`
*   **Speaker Devices List:** `/zoomosc/user|me/speakerDevices {int itemIndex}, {int listSize}, {str deviceID}, {str deviceName}, {int isSelected}`
*   **Virtual Background List:** `/zoomosc/user|me/backgrounds {int itemIndex}, {int listSize}, {str backgroundName}`
*   **Camera Devices List:** `/zoomosc/user|me/cameraDevices {int itemIndex}, {int listSize}, {str deviceID}, {str deviceName}, {int isSelected}`
*   **Current Mic Device:** `/zoomosc/user|me/micDevice {str deviceID} {str deviceName}`
*   **Current Speaker Device:** `/zoomosc/user|me/speakerDevice {str deviceID} {str deviceName}`
*   **Mic Level:** `/zoomosc/micLevel {int 0..100 level}`
*   **Current Camera Device:** `/zoomosc/user|me/cameraDevice {str deviceID} {str deviceName}`
*   **Speaker Volume:** `/zoomosc/speakerVolume {int 0..100 volume}`
*   **Waiting Room User List:** `/zoomosc/waitingRoomUserList usual user messages (4)`
*   **Current Virtual Background:** `/zoomosc/user|me/background {str bgID} {str bgName}`
*   **Current Video Filter:** `/zoomosc/user|me/filter {str filterID} {str filterName}`
*   **Windows List:** `/zoomosc/user|me/windows {str windowID} {str windowName}`
*   **Screens List:** `/zoomosc/user|me/screens {str screenID} {str screenName}`