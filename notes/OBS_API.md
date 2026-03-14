Here is the outline of the API events and requests grouped by application, category, and specific event or request:

### **obs-websocket**
**Events**
*   **General Events**: ExitStarted, VendorEvent, and CustomEvent.
*   **Config Events**: CurrentSceneCollectionChanging, CurrentSceneCollectionChanged, SceneCollectionListChanged, CurrentProfileChanging, CurrentProfileChanged, and ProfileListChanged.
*   **Canvases Events**: CanvasCreated, CanvasRemoved, and CanvasNameChanged.
*   **Scenes Events**: SceneCreated, SceneRemoved, SceneNameChanged, CurrentProgramSceneChanged, CurrentPreviewSceneChanged, and SceneListChanged.
*   **Inputs Events**: InputCreated, InputRemoved, InputNameChanged, InputSettingsChanged, InputActiveStateChanged, InputShowStateChanged, InputMuteStateChanged, InputVolumeChanged, InputAudioBalanceChanged, InputAudioSyncOffsetChanged, InputAudioTracksChanged, InputAudioMonitorTypeChanged, and InputVolumeMeters.
*   **Transitions Events**: CurrentSceneTransitionChanged, CurrentSceneTransitionDurationChanged, SceneTransitionStarted, SceneTransitionEnded, and SceneTransitionVideoEnded.
*   **Filters Events**: SourceFilterListReindexed, SourceFilterCreated, SourceFilterRemoved, SourceFilterNameChanged, SourceFilterSettingsChanged, and SourceFilterEnableStateChanged.
*   **Scene Items Events**: SceneItemCreated, SceneItemRemoved, SceneItemListReindexed, SceneItemEnableStateChanged, SceneItemLockStateChanged, SceneItemSelected, and SceneItemTransformChanged.
*   **Outputs Events**: StreamStateChanged, RecordStateChanged, RecordFileChanged, ReplayBufferStateChanged, VirtualcamStateChanged, and ReplayBufferSaved.
*   **Media Inputs Events**: MediaInputPlaybackStarted, MediaInputPlaybackEnded, and MediaInputActionTriggered.
*   **Ui Events**: StudioModeStateChanged and ScreenshotSaved.

**Requests**
*   **General Requests**: GetVersion, GetStats, BroadcastCustomEvent, CallVendorRequest, GetHotkeyList, TriggerHotkeyByName, TriggerHotkeyByKeySequence, and Sleep.
*   **Config Requests**: GetPersistentData, SetPersistentData, GetSceneCollectionList, SetCurrentSceneCollection, CreateSceneCollection, GetProfileList, SetCurrentProfile, CreateProfile, RemoveProfile, GetProfileParameter, SetProfileParameter, GetVideoSettings, SetVideoSettings, GetStreamServiceSettings, SetStreamServiceSettings, GetRecordDirectory, and SetRecordDirectory.
*   **Sources Requests**: GetSourceActive, GetSourceScreenshot, and SaveSourceScreenshot.
*   **Canvases Requests**: GetCanvasList.
*   **Scenes Requests**: GetSceneList, GetGroupList, GetCurrentProgramScene, SetCurrentProgramScene, GetCurrentPreviewScene, SetCurrentPreviewScene, CreateScene, RemoveScene, SetSceneName, GetSceneSceneTransitionOverride, and SetSceneSceneTransitionOverride.
*   **Inputs Requests**: GetInputList, GetInputKindList, GetSpecialInputs, CreateInput, RemoveInput, SetInputName, GetInputDefaultSettings, GetInputSettings, SetInputSettings, GetInputMute, SetInputMute, ToggleInputMute, GetInputVolume, SetInputVolume, GetInputAudioBalance, SetInputAudioBalance, GetInputAudioSyncOffset, SetInputAudioSyncOffset, GetInputAudioMonitorType, SetInputAudioMonitorType, GetInputAudioTracks, SetInputAudioTracks, GetInputDeinterlaceMode, SetInputDeinterlaceMode, GetInputDeinterlaceFieldOrder, SetInputDeinterlaceFieldOrder, GetInputPropertiesListPropertyItems, and PressInputPropertiesButton.
*   **Transitions Requests**: GetTransitionKindList, GetSceneTransitionList, GetCurrentSceneTransition, SetCurrentSceneTransition, SetCurrentSceneTransitionDuration, SetCurrentSceneTransitionSettings, GetCurrentSceneTransitionCursor, TriggerStudioModeTransition, and SetTBarPosition.
*   **Filters Requests**: GetSourceFilterKindList, GetSourceFilterList, GetSourceFilterDefaultSettings, CreateSourceFilter, RemoveSourceFilter, SetSourceFilterName, GetSourceFilter, SetSourceFilterIndex, SetSourceFilterSettings, and SetSourceFilterEnabled.
*   **Scene Items Requests**: GetSceneItemList, GetGroupSceneItemList, GetSceneItemId, GetSceneItemSource, CreateSceneItem, RemoveSceneItem, DuplicateSceneItem, GetSceneItemTransform, SetSceneItemTransform, GetSceneItemEnabled, SetSceneItemEnabled, GetSceneItemLocked, SetSceneItemLocked, GetSceneItemIndex, SetSceneItemIndex, GetSceneItemBlendMode, and SetSceneItemBlendMode.
*   **Outputs Requests**: GetVirtualCamStatus, ToggleVirtualCam, StartVirtualCam, StopVirtualCam, GetReplayBufferStatus, ToggleReplayBuffer, StartReplayBuffer, StopReplayBuffer, SaveReplayBuffer, GetLastReplayBufferReplay, GetOutputList, GetOutputStatus, ToggleOutput, StartOutput, StopOutput, GetOutputSettings, and SetOutputSettings.
*   **Stream Requests**: GetStreamStatus, ToggleStream, StartStream, StopStream, and SendStreamCaption.
*   **Record Requests**: GetRecordStatus, ToggleRecord, StartRecord, StopRecord, ToggleRecordPause, PauseRecord, ResumeRecord, SplitRecordFile, and CreateRecordChapter.
*   **Media Inputs Requests**: GetMediaInputStatus, SetMediaInputCursor, OffsetMediaInputCursor, and TriggerMediaInputAction.
*   **Ui Requests**: GetStudioModeEnabled, SetStudioModeEnabled, OpenInputPropertiesDialog, OpenInputFiltersDialog, OpenInputInteractDialog, GetMonitorList, OpenVideoMixProjector, and OpenSourceProjector.


## OBS WebScoket API SCheme
**Note regarding JSON examples:** The provided documentation outlines the specific schema fields (Data, Request, and Response fields) for the OBS API events and requests. However, the actual JSON payload examples are omitted in the source texts (e.g., the "Example Message" sections are blank). Because providing a synthesized JSON example for all requests and events would require extensive outside information and guessing, I have mapped the exact schemas directly from the text below. 

*Note: If you wish to construct a JSON message (based on information outside these sources), the general OBS WebSocket v5 structure typically wraps the request or event in a message payload containing an `op` code and a `d` (data) object that holds the schema fields listed below.*

Here is the outline of the `obs-websocket` events and requests grouped by category:

### 1. General
**Events:**
*   **ExitStarted**: No data fields.
*   **VendorEvent**: `vendorName` (String), `eventType` (String), `eventData` (Object).
*   **CustomEvent**: `eventData` (Object).

**Requests:**
*   **GetVersion**: Response Fields: `obsVersion` (String), `obsWebSocketVersion` (String), `rpcVersion` (Number), `availableRequests` (Array<String>), `supportedImageFormats` (Array<String>), `platform` (String), `platformDescription` (String).
*   **GetStats**: Response Fields: `cpuUsage` (Number), `memoryUsage` (Number), `availableDiskSpace` (Number), `activeFps` (Number), `averageFrameRenderTime` (Number), `renderSkippedFrames` (Number), `renderTotalFrames` (Number), `outputSkippedFrames` (Number), `outputTotalFrames` (Number), `webSocketSessionIncomingMessages` (Number), `webSocketSessionOutgoingMessages` (Number).
*   **BroadcastCustomEvent**: Request Fields: `eventData` (Object).
*   **CallVendorRequest**: Request Fields: `vendorName` (String), `requestType` (String), `requestData` (Object). Response Fields: `vendorName` (String), `requestType` (String), `responseData` (Object).
*   **GetHotkeyList**: Response Fields: `hotkeys` (Array<String>).
*   **TriggerHotkeyByName**: Request Fields: `hotkeyName` (String), `contextName` (String).
*   **TriggerHotkeyByKeySequence**: Request Fields: `keyId` (String), `keyModifiers` (Object with booleans for `shift`, `control`, `alt`, `command`).
*   **Sleep**: Request Fields: `sleepMillis` (Number), `sleepFrames` (Number).

### 2. Config
**Events:**
*   **CurrentSceneCollectionChanging**, **CurrentSceneCollectionChanged**: `sceneCollectionName` (String).
*   **SceneCollectionListChanged**: `sceneCollections` (Array<String>).
*   **CurrentProfileChanging**, **CurrentProfileChanged**: `profileName` (String).
*   **ProfileListChanged**: `profiles` (Array<String>).

**Requests:**
*   **GetPersistentData**: Request Fields: `realm` (String), `slotName` (String). Response Fields: `slotValue` (Any).
*   **SetPersistentData**: Request Fields: `realm` (String), `slotName` (String), `slotValue` (Any).
*   **GetSceneCollectionList**: Response Fields: `currentSceneCollectionName` (String), `sceneCollections` (Array<String>).
*   **SetCurrentSceneCollection**, **CreateSceneCollection**: Request Fields: `sceneCollectionName` (String).
*   **GetProfileList**: Response Fields: `currentProfileName` (String), `profiles` (Array<String>).
*   **SetCurrentProfile**, **CreateProfile**, **RemoveProfile**: Request Fields: `profileName` (String).
*   **GetProfileParameter**: Request Fields: `parameterCategory` (String), `parameterName` (String). Response Fields: `parameterValue` (String), `defaultParameterValue` (String).
*   **SetProfileParameter**: Request Fields: `parameterCategory` (String), `parameterName` (String), `parameterValue` (String).
*   **GetVideoSettings**, **SetVideoSettings**: Request/Response Fields: `fpsNumerator` (Number), `fpsDenominator` (Number), `baseWidth` (Number), `baseHeight` (Number), `outputWidth` (Number), `outputHeight` (Number).
*   **GetStreamServiceSettings**: Response Fields: `streamServiceType` (String), `streamServiceSettings` (Object).
*   **SetStreamServiceSettings**: Request Fields: `streamServiceType` (String), `streamServiceSettings` (Object).
*   **GetRecordDirectory**: Response Fields: `recordDirectory` (String).
*   **SetRecordDirectory**: Request Fields: `recordDirectory` (String).

### 3. Sources
**Requests:**
*   **GetSourceActive**: Request Fields: `canvasUuid` (String), `sourceName` (String), `sourceUuid` (String). Response Fields: `videoActive` (Boolean), `videoShowing` (Boolean).
*   **GetSourceScreenshot**: Request Fields: `canvasUuid` (String), `sourceName` (String), `sourceUuid` (String), `imageFormat` (String), `imageWidth` (Number), `imageHeight` (Number), `imageCompressionQuality` (Number). Response Fields: `imageData` (String).
*   **SaveSourceScreenshot**: Request Fields: `canvasUuid` (String), `sourceName` (String), `sourceUuid` (String), `imageFormat` (String), `imageFilePath` (String), `imageWidth` (Number), `imageHeight` (Number), `imageCompressionQuality` (Number).

### 4. Canvases
**Events:**
*   **CanvasCreated**, **CanvasRemoved**: `canvasName` (String), `canvasUuid` (String).
*   **CanvasNameChanged**: `canvasUuid` (String), `oldCanvasName` (String), `canvasName` (String).

**Requests:**
*   **GetCanvasList**: Response Fields: `canvases` (Array<Object>).

### 5. Scenes
**Events:**
*   **SceneCreated**, **SceneRemoved**: `sceneName` (String), `sceneUuid` (String), `isGroup` (Boolean).
*   **SceneNameChanged**: `sceneUuid` (String), `oldSceneName` (String), `sceneName` (String).
*   **CurrentProgramSceneChanged**, **CurrentPreviewSceneChanged**: `sceneName` (String), `sceneUuid` (String).
*   **SceneListChanged**: `scenes` (Array<Object>).

**Requests:**
*   **GetSceneList**: Request Fields: `canvasUuid` (String). Response Fields: `currentProgramSceneName` (String), `currentProgramSceneUuid` (String), `currentPreviewSceneName` (String), `currentPreviewSceneUuid` (String), `scenes` (Array<Object>).
*   **GetGroupList**: Response Fields: `groups` (Array<String>).
*   **GetCurrentProgramScene**, **GetCurrentPreviewScene**: Response Fields: `sceneName` (String), `sceneUuid` (String), `currentProgramSceneName` (String), `currentProgramSceneUuid` (String), `currentPreviewSceneName` (String), `currentPreviewSceneUuid` (String).
*   **SetCurrentProgramScene**, **SetCurrentPreviewScene**: Request Fields: `sceneName` (String), `sceneUuid` (String).
*   **CreateScene**: Request Fields: `canvasUuid` (String), `sceneName` (String). Response Fields: `sceneUuid` (String).
*   **RemoveScene**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String).
*   **SetSceneName**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `newSceneName` (String).
*   **GetSceneSceneTransitionOverride**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String). Response Fields: `transitionName` (String), `transitionDuration` (Number).
*   **SetSceneSceneTransitionOverride**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `transitionName` (String), `transitionDuration` (Number).

### 6. Inputs
**Events:**
*   **InputCreated**: `inputName` (String), `inputUuid` (String), `inputKind` (String), `unversionedInputKind` (String), `inputKindCaps` (Number), `inputSettings` (Object), `defaultInputSettings` (Object).
*   **InputRemoved**: `inputName` (String), `inputUuid` (String).
*   **InputNameChanged**: `inputUuid` (String), `oldInputName` (String), `inputName` (String).
*   **InputSettingsChanged**: `inputName` (String), `inputUuid` (String), `inputSettings` (Object).
*   **InputActiveStateChanged**: `inputName` (String), `inputUuid` (String), `videoActive` (Boolean).
*   **InputShowStateChanged**: `inputName` (String), `inputUuid` (String), `videoShowing` (Boolean).
*   **InputMuteStateChanged**: `inputName` (String), `inputUuid` (String), `inputMuted` (Boolean).
*   **InputVolumeChanged**: `inputName` (String), `inputUuid` (String), `inputVolumeMul` (Number), `inputVolumeDb` (Number).
*   **InputAudioBalanceChanged**: `inputName` (String), `inputUuid` (String), `inputAudioBalance` (Number).
*   **InputAudioSyncOffsetChanged**: `inputName` (String), `inputUuid` (String), `inputAudioSyncOffset` (Number).
*   **InputAudioTracksChanged**: `inputName` (String), `inputUuid` (String), `inputAudioTracks` (Object).
*   **InputAudioMonitorTypeChanged**: `inputName` (String), `inputUuid` (String), `monitorType` (String).
*   **InputVolumeMeters**: `inputs` (Array<Object>).

**Requests:**
*   **GetInputList**: Request Fields: `inputKind` (String). Response Fields: `inputs` (Array<Object>).
*   **GetInputKindList**: Request Fields: `unversioned` (Boolean). Response Fields: `inputKinds` (Array<String>).
*   **GetSpecialInputs**: Response Fields: `desktop1`, `desktop2`, `mic1`, `mic2`, `mic3`, `mic4` (All Strings).
*   **CreateInput**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `inputName` (String), `inputKind` (String), `inputSettings` (Object), `sceneItemEnabled` (Boolean). Response Fields: `inputUuid` (String), `sceneItemId` (Number).
*   **RemoveInput**: Request Fields: `inputName` (String), `inputUuid` (String).
*   **SetInputName**: Request Fields: `inputName` (String), `inputUuid` (String), `newInputName` (String).
*   **GetInputDefaultSettings**: Request Fields: `inputKind` (String). Response Fields: `defaultInputSettings` (Object).
*   **GetInputSettings**: Request Fields: `inputName` (String), `inputUuid` (String). Response Fields: `inputSettings` (Object), `inputKind` (String).
*   **SetInputSettings**: Request Fields: `inputName` (String), `inputUuid` (String), `inputSettings` (Object), `overlay` (Boolean).
*   **GetInputMute**, **ToggleInputMute**: Request Fields: `inputName` (String), `inputUuid` (String). Response Fields: `inputMuted` (Boolean).
*   **SetInputMute**: Request Fields: `inputName` (String), `inputUuid` (String), `inputMuted` (Boolean).
*   **GetInputVolume**: Request Fields: `inputName` (String), `inputUuid` (String). Response Fields: `inputVolumeMul` (Number), `inputVolumeDb` (Number).
*   **SetInputVolume**: Request Fields: `inputName` (String), `inputUuid` (String), `inputVolumeMul` (Number), `inputVolumeDb` (Number).
*   **GetInputAudioBalance**: Request Fields: `inputName` (String), `inputUuid` (String). Response Fields: `inputAudioBalance` (Number).
*   **SetInputAudioBalance**: Request Fields: `inputName` (String), `inputUuid` (String), `inputAudioBalance` (Number).
*   **GetInputAudioSyncOffset**: Request Fields: `inputName` (String), `inputUuid` (String). Response Fields: `inputAudioSyncOffset` (Number).
*   **SetInputAudioSyncOffset**: Request Fields: `inputName` (String), `inputUuid` (String), `inputAudioSyncOffset` (Number).
*   **GetInputAudioMonitorType**: Request Fields: `inputName` (String), `inputUuid` (String). Response Fields: `monitorType` (String).
*   **SetInputAudioMonitorType**: Request Fields: `inputName` (String), `inputUuid` (String), `monitorType` (String).
*   **GetInputAudioTracks**: Request Fields: `inputName` (String), `inputUuid` (String). Response Fields: `inputAudioTracks` (Object).
*   **SetInputAudioTracks**: Request Fields: `inputName` (String), `inputUuid` (String), `inputAudioTracks` (Object).
*   **GetInputDeinterlaceMode**: Request Fields: `inputName` (String), `inputUuid` (String). Response Fields: `inputDeinterlaceMode` (String).
*   **SetInputDeinterlaceMode**: Request Fields: `inputName` (String), `inputUuid` (String), `inputDeinterlaceMode` (String).
*   **GetInputDeinterlaceFieldOrder**: Request Fields: `inputName` (String), `inputUuid` (String). Response Fields: `inputDeinterlaceFieldOrder` (String).
*   **SetInputDeinterlaceFieldOrder**: Request Fields: `inputName` (String), `inputUuid` (String), `inputDeinterlaceFieldOrder` (String).
*   **GetInputPropertiesListPropertyItems**: Request Fields: `inputName` (String), `inputUuid` (String), `propertyName` (String). Response Fields: `propertyItems` (Array<Object>).
*   **PressInputPropertiesButton**: Request Fields: `inputName` (String), `inputUuid` (String), `propertyName` (String).

### 7. Transitions
**Events:**
*   **CurrentSceneTransitionChanged**, **SceneTransitionStarted**, **SceneTransitionEnded**, **SceneTransitionVideoEnded**: `transitionName` (String), `transitionUuid` (String).
*   **CurrentSceneTransitionDurationChanged**: `transitionDuration` (Number).

**Requests:**
*   **GetTransitionKindList**: Response Fields: `transitionKinds` (Array<String>).
*   **GetSceneTransitionList**: Response Fields: `currentSceneTransitionName` (String), `currentSceneTransitionUuid` (String), `currentSceneTransitionKind` (String), `transitions` (Array<Object>).
*   **GetCurrentSceneTransition**: Response Fields: `transitionName` (String), `transitionUuid` (String), `transitionKind` (String), `transitionFixed` (Boolean), `transitionDuration` (Number), `transitionConfigurable` (Boolean), `transitionSettings` (Object).
*   **SetCurrentSceneTransition**: Request Fields: `transitionName` (String).
*   **SetCurrentSceneTransitionDuration**: Request Fields: `transitionDuration` (Number).
*   **SetCurrentSceneTransitionSettings**: Request Fields: `transitionSettings` (Object), `overlay` (Boolean).
*   **GetCurrentSceneTransitionCursor**: Response Fields: `transitionCursor` (Number).
*   **TriggerStudioModeTransition**: No fields.
*   **SetTBarPosition**: Request Fields: `position` (Number), `release` (Boolean).

### 8. Filters
**Events:**
*   **SourceFilterListReindexed**: `sourceName` (String), `filters` (Array<Object>).
*   **SourceFilterCreated**: `sourceName` (String), `filterName` (String), `filterKind` (String), `filterIndex` (Number), `filterSettings` (Object), `defaultFilterSettings` (Object).
*   **SourceFilterRemoved**: `sourceName` (String), `filterName` (String).
*   **SourceFilterNameChanged**: `sourceName` (String), `oldFilterName` (String), `filterName` (String).
*   **SourceFilterSettingsChanged**: `sourceName` (String), `filterName` (String), `filterSettings` (Object).
*   **SourceFilterEnableStateChanged**: `sourceName` (String), `filterName` (String), `filterEnabled` (Boolean).

**Requests:**
*   **GetSourceFilterKindList**: Response Fields: `sourceFilterKinds` (Array<String>).
*   **GetSourceFilterList**: Request Fields: `canvasUuid` (String), `sourceName` (String), `sourceUuid` (String). Response Fields: `filters` (Array<Object>).
*   **GetSourceFilterDefaultSettings**: Request Fields: `filterKind` (String). Response Fields: `defaultFilterSettings` (Object).
*   **CreateSourceFilter**: Request Fields: `canvasUuid` (String), `sourceName` (String), `sourceUuid` (String), `filterName` (String), `filterKind` (String), `filterSettings` (Object).
*   **RemoveSourceFilter**: Request Fields: `canvasUuid` (String), `sourceName` (String), `sourceUuid` (String), `filterName` (String).
*   **SetSourceFilterName**: Request Fields: `canvasUuid` (String), `sourceName` (String), `sourceUuid` (String), `filterName` (String), `newFilterName` (String).
*   **GetSourceFilter**: Request Fields: `canvasUuid` (String), `sourceName` (String), `sourceUuid` (String), `filterName` (String). Response Fields: `filterEnabled` (Boolean), `filterIndex` (Number), `filterKind` (String), `filterSettings` (Object).
*   **SetSourceFilterIndex**: Request Fields: `canvasUuid` (String), `sourceName` (String), `sourceUuid` (String), `filterName` (String), `filterIndex` (Number).
*   **SetSourceFilterSettings**: Request Fields: `canvasUuid` (String), `sourceName` (String), `sourceUuid` (String), `filterName` (String), `filterSettings` (Object), `overlay` (Boolean).
*   **SetSourceFilterEnabled**: Request Fields: `canvasUuid` (String), `sourceName` (String), `sourceUuid` (String), `filterName` (String), `filterEnabled` (Boolean).

### 9. Scene Items
**Events:**
*   **SceneItemCreated**: `sceneName` (String), `sceneUuid` (String), `sourceName` (String), `sourceUuid` (String), `sceneItemId` (Number), `sceneItemIndex` (Number).
*   **SceneItemRemoved**: `sceneName` (String), `sceneUuid` (String), `sourceName` (String), `sourceUuid` (String), `sceneItemId` (Number).
*   **SceneItemListReindexed**: `sceneName` (String), `sceneUuid` (String), `sceneItems` (Array<Object>).
*   **SceneItemEnableStateChanged**: `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number), `sceneItemEnabled` (Boolean).
*   **SceneItemLockStateChanged**: `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number), `sceneItemLocked` (Boolean).
*   **SceneItemSelected**: `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number).
*   **SceneItemTransformChanged**: `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number), `sceneItemTransform` (Object).

**Requests:**
*   **GetSceneItemList**, **GetGroupSceneItemList**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String). Response Fields: `sceneItems` (Array<Object>).
*   **GetSceneItemId**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sourceName` (String), `searchOffset` (Number). Response Fields: `sceneItemId` (Number).
*   **GetSceneItemSource**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number). Response Fields: `sourceName` (String), `sourceUuid` (String).
*   **CreateSceneItem**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sourceName` (String), `sourceUuid` (String), `sceneItemEnabled` (Boolean). Response Fields: `sceneItemId` (Number).
*   **RemoveSceneItem**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number).
*   **DuplicateSceneItem**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number), `destinationSceneName` (String), `destinationSceneUuid` (String). Response Fields: `sceneItemId` (Number).
*   **GetSceneItemTransform**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number). Response Fields: `sceneItemTransform` (Object).
*   **SetSceneItemTransform**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number), `sceneItemTransform` (Object).
*   **GetSceneItemEnabled**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number). Response Fields: `sceneItemEnabled` (Boolean).
*   **SetSceneItemEnabled**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number), `sceneItemEnabled` (Boolean).
*   **GetSceneItemLocked**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number). Response Fields: `sceneItemLocked` (Boolean).
*   **SetSceneItemLocked**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number), `sceneItemLocked` (Boolean).
*   **GetSceneItemIndex**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number). Response Fields: `sceneItemIndex` (Number).
*   **SetSceneItemIndex**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number), `sceneItemIndex` (Number).
*   **GetSceneItemBlendMode**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number). Response Fields: `sceneItemBlendMode` (String).
*   **SetSceneItemBlendMode**: Request Fields: `canvasUuid` (String), `sceneName` (String), `sceneUuid` (String), `sceneItemId` (Number), `sceneItemBlendMode` (String).

### 10. Outputs
**Events:**
*   **StreamStateChanged**, **ReplayBufferStateChanged**, **VirtualcamStateChanged**: `outputActive` (Boolean), `outputState` (String).
*   **RecordStateChanged**: `outputActive` (Boolean), `outputState` (String), `outputPath` (String).
*   **RecordFileChanged**: `newOutputPath` (String).
*   **ReplayBufferSaved**: `savedReplayPath` (String).

**Requests:**
*   **GetVirtualCamStatus**, **GetReplayBufferStatus**: Response Fields: `outputActive` (Boolean).
*   **ToggleVirtualCam**, **ToggleReplayBuffer**: Response Fields: `outputActive` (Boolean).
*   **StartVirtualCam**, **StopVirtualCam**, **StartReplayBuffer**, **StopReplayBuffer**, **SaveReplayBuffer**: No fields.
*   **GetLastReplayBufferReplay**: Response Fields: `savedReplayPath` (String).
*   **GetOutputList**: Response Fields: `outputs` (Array<Object>).
*   **GetOutputStatus**: Request Fields: `outputName` (String). Response Fields: `outputActive` (Boolean), `outputReconnecting` (Boolean), `outputTimecode` (String), `outputDuration` (Number), `outputCongestion` (Number), `outputBytes` (Number), `outputSkippedFrames` (Number), `outputTotalFrames` (Number).
*   **ToggleOutput**: Request Fields: `outputName` (String). Response Fields: `outputActive` (Boolean).
*   **StartOutput**, **StopOutput**: Request Fields: `outputName` (String).
*   **GetOutputSettings**: Request Fields: `outputName` (String). Response Fields: `outputSettings` (Object).
*   **SetOutputSettings**: Request Fields: `outputName` (String), `outputSettings` (Object).

### 11. Stream
**Requests:**
*   **GetStreamStatus**: Response Fields: `outputActive` (Boolean), `outputReconnecting` (Boolean), `outputTimecode` (String), `outputDuration` (Number), `outputCongestion` (Number), `outputBytes` (Number), `outputSkippedFrames` (Number), `outputTotalFrames` (Number).
*   **ToggleStream**: Response Fields: `outputActive` (Boolean).
*   **StartStream**, **StopStream**: No fields.
*   **SendStreamCaption**: Request Fields: `captionText` (String).

### 12. Record
**Requests:**
*   **GetRecordStatus**: Response Fields: `outputActive` (Boolean), `outputPaused` (Boolean), `outputTimecode` (String), `outputDuration` (Number), `outputBytes` (Number).
*   **ToggleRecord**: Response Fields: `outputActive` (Boolean).
*   **StartRecord**, **ToggleRecordPause**, **PauseRecord**, **ResumeRecord**, **SplitRecordFile**: No fields.
*   **StopRecord**: Response Fields: `outputPath` (String).
*   **CreateRecordChapter**: Request Fields: `chapterName` (String).

### 13. Media Inputs
**Events:**
*   **MediaInputPlaybackStarted**, **MediaInputPlaybackEnded**: `inputName` (String), `inputUuid` (String).
*   **MediaInputActionTriggered**: `inputName` (String), `inputUuid` (String), `mediaAction` (String).

**Requests:**
*   **GetMediaInputStatus**: Request Fields: `inputName` (String), `inputUuid` (String). Response Fields: `mediaState` (String), `mediaDuration` (Number), `mediaCursor` (Number).
*   **SetMediaInputCursor**: Request Fields: `inputName` (String), `inputUuid` (String), `mediaCursor` (Number).
*   **OffsetMediaInputCursor**: Request Fields: `inputName` (String), `inputUuid` (String), `mediaCursorOffset` (Number).
*   **TriggerMediaInputAction**: Request Fields: `inputName` (String), `inputUuid` (String), `mediaAction` (String).

### 14. Ui
**Events:**
*   **StudioModeStateChanged**: `studioModeEnabled` (Boolean).
*   **ScreenshotSaved**: `savedScreenshotPath` (String).

**Requests:**
*   **GetStudioModeEnabled**: Response Fields: `studioModeEnabled` (Boolean).
*   **SetStudioModeEnabled**: Request Fields: `studioModeEnabled` (Boolean).
*   **OpenInputPropertiesDialog**, **OpenInputFiltersDialog**, **OpenInputInteractDialog**: Request Fields: `inputName` (String), `inputUuid` (String).
*   **GetMonitorList**: Response Fields: `monitors` (Array<Object>).
*   **OpenVideoMixProjector**: Request Fields: `videoMixType` (String), `monitorIndex` (Number), `projectorGeometry` (String).
*   **OpenSourceProjector**: Request Fields: `canvasUuid` (String), `sourceName` (String), `sourceUuid` (String), `monitorIndex` (Number), `projectorGeometry` (String).