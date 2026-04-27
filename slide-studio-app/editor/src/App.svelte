<script>
    import { onMount } from 'svelte';
    import { create } from '../../lib/slides-studio-client.js';
    // import { gsap } from 'gsap'; // Loaded as global from index.html

    let socket;
    let selectedSource = null;
    let selectedSourceName = '';
    let currentSceneName = '';
    let sceneConfig = {};
    let obsStatus = 'Disconnected';
    
    $: sceneConfigInputName = currentSceneName ? `SceneConfig-${currentSceneName}` : '';
    
    // Transform State
    let transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, width: 1920, height: 1080 };
    
    // SVG Path State (normalized 0-100)
    let points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
    ];
    let draggingPoint = null;

    onMount(() => {
        socket = create({
            hostname: window.location.hostname,
            port: window.location.port,
            path: '/websocket/',
            authToken: { name: 'Slides-Studio-Editor' }
        });

        socket.on('connect', async () => {
            const status = await socket.invoke('isObsConnected');
            obsStatus = status.connected ? 'Connected' : 'Disconnected';
            if (status.connected) syncWithObs();
        });

        socket.on('disconnect', () => {
            obsStatus = 'Disconnected';
        });

        socket.on('obsEvent', (data) => {
            console.log('[Editor] OBS Event:', data);
            if (data.eventName === 'Identified' || data.eventName === 'ConnectionOpened') {
                obsStatus = 'Connected';
                syncWithObs();
            } else if (data.eventName === 'ConnectionClosed') {
                obsStatus = 'Disconnected';
            }
        });

        socket.on('obsEvents', (data) => {
            if (data.eventName === 'CurrentProgramSceneChanged') {
                syncWithObs();
            }
        });
    });

    async function syncWithObs() {
        try {
            const scene = await socket.invoke('obsRequest', { requestType: 'GetCurrentProgramScene' });
            currentSceneName = scene.currentProgramSceneName;
            
            // For now, let's just assume we want the first camera or slide in the scene
            // In a real version, we'd listen for source selection in OBS
            const items = await socket.invoke('obsRequest', { 
                requestType: 'GetSceneItemList', 
                requestData: { sceneName: scene.currentProgramSceneName } 
            });
            
            // Try to find a Camera or Slide source
            const item = items.sceneItems.find(i => i.sourceName.includes('Camera') || i.sourceName.includes('Slide'));
            if (item) {
                selectedSource = item;
                selectedSourceName = item.sourceName;
                transform = { ...item.sceneItemTransform };
                
                // Fetch existing config if any
                await loadSceneConfig();
            }
        } catch (e) {
            console.error('Sync failed', e);
        }
    }

    async function loadSceneConfig() {
        try {
            const settings = await socket.invoke('obsRequest', { 
                requestType: 'GetInputSettings', 
                requestData: { inputName: sceneConfigInputName } 
            });
            sceneConfig = JSON.parse(settings.inputSettings?.text || '{}');
            
            if (sceneConfig[selectedSourceName]) {
                const cfg = sceneConfig[selectedSourceName];
                if (cfg.points) points = cfg.points;
            }
        } catch (e) {
            console.warn('Could not load SceneConfig', e);
        }
    }

    function handleMouseDown(i, e) {
        draggingPoint = i;
    }

    function handleMouseMove(e) {
        if (draggingPoint === null) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        points[draggingPoint] = { 
            x: Math.max(0, Math.min(100, x)), 
            y: Math.max(0, Math.min(100, y)) 
        };
        points = [...points];
        
        updateLivePreview();
    }

    function handleMouseUp() {
        draggingPoint = null;
    }

    function updateLivePreview() {
        // Send CHOREOGRAPHY_UPDATE to Fastify hub
        const path = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
        socket.publish('CHOREOGRAPHY_UPDATE', {
            id: selectedSourceName,
            mask: path,
            transform: transform
        });
    }

    async function save() {
        sceneConfig[selectedSourceName] = {
            points,
            transform
        };
        
        await socket.invoke('obsRequest', {
            requestType: 'SetInputSettings',
            requestData: {
                inputName: sceneConfigInputName,
                inputSettings: { text: JSON.stringify(sceneConfig, null, 2) }
            }
        });
        
        // Also update obs-map.json via the server API
        try {
            const deckId = new URLSearchParams(window.location.search).get('deckId');
            if (deckId) {
                await fetch('/api/save-sidecar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        deckId,
                        data: sceneConfig // Or whatever data needs to go to the sidecar
                    })
                });
            }
        } catch (e) {
            console.error('Failed to save sidecar from editor', e);
        }
        
        console.log('Saved to SceneConfig and Sidecar');
    }

    async function makeNewScene() {
        const name = prompt('Enter new scene name:', `Scene ${Date.now()}`);
        if (!name) return;
        
        await socket.invoke('obsRequest', {
            requestType: 'CreateScene',
            requestData: { sceneName: name }
        });
        
        // Create the scene-specific SceneConfig text source
        try {
            await socket.invoke('obsRequest', {
                requestType: 'CreateInput',
                requestData: {
                    sceneName: name,
                    inputName: `SceneConfig-${name}`,
                    inputKind: 'text_ft2_source_v2', // Standard for Mac/Linux
                    inputSettings: { text: '{}' }
                }
            });
        } catch (e) {
            console.warn('Failed to create SceneConfig input (might already exist)', e);
        }
        
        await syncWithObs();
    }
</script>

<main>
    <header>
        <h1>Slides Studio v2.0 Editor</h1>
        <div class="header-right">
            <div class="status" class:connected={obsStatus === 'Connected'}>
                OBS: {obsStatus}
            </div>
            {#if obsStatus === 'Disconnected'}
                <button class="connect-btn" on:click={() => socket.invoke('connectObs')}>Connect</button>
            {/if}
        </div>
    </header>

    <div class="editor-layout">
        <aside class="layers">
            <h2>Layers</h2>
            <ul>
                <li class:selected={selectedSource}>
                    {selectedSourceName || 'No source selected'}
                </li>
            </ul>
        </aside>

        <section class="viewport">
            {#if selectedSource}
                <div 
                    class="canvas-container"
                    on:mousemove={handleMouseMove}
                    on:mouseup={handleMouseUp}
                    on:mouseleave={handleMouseUp}
                >
                    <svg viewBox="0 0 100 100" class="mask-overlay">
                        <path 
                            d={`M ${points.map(p => `${p.x} ${p.y}`).join(' L ')} Z`} 
                            fill="rgba(78, 201, 176, 0.3)" 
                            stroke="#4ec9b0" 
                            stroke-width="0.5"
                        />
                        {#each points as point, i}
                            <circle 
                                cx={point.x} 
                                cy={point.y} 
                                r="1.5" 
                                fill={draggingPoint === i ? '#ffffff' : '#4ec9b0'}
                                on:mousedown={(e) => handleMouseDown(i, e)}
                                class="handle"
                            />
                        {/each}
                    </svg>
                </div>
            {:else}
                <div class="placeholder">Select a source in OBS to start editing</div>
            {/if}
        </section>

        <aside class="properties">
            <h2>Properties</h2>
            {#if selectedSource}
                <div class="prop-group">
                    <label>Position X</label>
                    <input type="number" bind:value={transform.positionX} on:input={updateLivePreview} />
                </div>
                <div class="prop-group">
                    <label>Position Y</label>
                    <input type="number" bind:value={transform.positionY} on:input={updateLivePreview} />
                </div>
                <div class="prop-group">
                    <label>Scale X</label>
                    <input type="number" step="0.1" bind:value={transform.scaleX} on:input={updateLivePreview} />
                </div>
                <div class="prop-group">
                    <label>Scale Y</label>
                    <input type="number" step="0.1" bind:value={transform.scaleY} on:input={updateLivePreview} />
                </div>
            {/if}
            
            <div class="actions">
                <button on:click={save} disabled={!selectedSource}>Save</button>
                <button on:click={makeNewScene} disabled={!selectedSource}>New Scene</button>
            </div>
        </aside>
    </div>
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
        height: 100vh;
    }

    header {
        background: #1e1e1e;
        padding: 10px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #333;
    }

    h1 {
        font-size: 1.2rem;
        margin: 0;
        color: #4ec9b0;
    }

    .status {
        font-size: 0.8rem;
        color: #ff5f56;
    }

    .status.connected {
        color: #27c93f;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 15px;
    }

    .connect-btn {
        padding: 4px 10px;
        font-size: 0.7rem;
        background: #007acc;
        border-radius: 4px;
        color: white;
        border: none;
        cursor: pointer;
    }

    .connect-btn:hover {
        background: #005a9e;
    }

    .editor-layout {
        display: flex;
        flex: 1;
        overflow: hidden;
    }

    .layers, .properties {
        width: 250px;
        background: #1e1e1e;
        padding: 15px;
        border-right: 1px solid #333;
    }

    .properties {
        border-right: none;
        border-left: 1px solid #333;
    }

    .viewport {
        flex: 1;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .placeholder {
        color: #555;
    }

    .actions {
        margin-top: 20px;
        display: flex;
        gap: 10px;
    }

    button {
        flex: 1;
        padding: 8px;
        background: #007acc;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    button:hover {
        background: #005a9e;
    }

    button:disabled {
        background: #333;
        color: #666;
        cursor: not-allowed;
    }

    .canvas-container {
        width: 80%;
        aspect-ratio: 16/9;
        background: #111;
        border: 1px solid #333;
        position: relative;
    }

    .mask-overlay {
        width: 100%;
        height: 100%;
    }

    .handle {
        cursor: move;
    }

    .prop-group {
        margin-bottom: 10px;
    }

    .prop-group label {
        display: block;
        font-size: 0.8rem;
        color: #888;
        margin-bottom: 4px;
    }

    .prop-group input {
        width: 100%;
        background: #252526;
        border: 1px solid #333;
        color: white;
        padding: 4px;
        border-radius: 2px;
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    li {
        padding: 8px;
        border-radius: 4px;
        font-size: 0.9rem;
        cursor: pointer;
    }

    li.selected {
        background: #094771;
        color: white;
    }
</style>
