import '../../slide-studio-app/lib/sc-connection.js';

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const controls = {
        layoutName: document.getElementById('layout-name'),
        parentWidth: document.getElementById('parent-width'),
        parentHeight: document.getElementById('parent-height'),
        top: document.getElementById('top'),
        left: document.getElementById('left'),
        width: document.getElementById('width'),
        height: document.getElementById('height'),
        zIndex: document.getElementById('z-index'),
        aspectRatio: document.getElementById('aspect-ratio'),
        objectFit: document.getElementById('object-fit'),
        opacity: document.getElementById('opacity'),
        borderRadius: document.getElementById('border-radius'),
        boxShadow: document.getElementById('box-shadow'),
        mixBlendMode: document.getElementById('mix-blend-mode'),
        scale: document.getElementById('scale'),
        rotate: document.getElementById('rotate'),
        skewX: document.getElementById('skewX'),
        skewY: document.getElementById('skewY')
    };

    const valueDisplays = {
        opacity: document.getElementById('opacity-val'),
        scale: document.getElementById('scale-val'),
        rotate: document.getElementById('rotate-val'),
        skewX: document.getElementById('skewX-val'),
        skewY: document.getElementById('skewY-val')
    };

    const preview = {
        parent: document.getElementById('parent-preview'),
        iframe: document.getElementById('iframe-preview')
    };

    const saveBtn = document.getElementById('save-layout');
    const statusMsg = document.getElementById('status-message');
    const layoutList = document.getElementById('layout-list');

    // Constants
    const LAYOUT_FILE = 'apps/slide-studio-app/layouts.json';

    // State
    let isDragging = false;
    let isResizing = false;
    let startX, startY, startLeft, startTop, startWidth, startHeight;
    let allLayouts = {};

    // Initialization
    async function init() {
        updateParentPreview();
        updateIframePreview();
        setupEventListeners();
        
        // Wait for socket to connect before loading
        if (window.scSocket.state === 'open') {
            loadLayouts();
        } else {
            for await (let event of window.scSocket.listener('connect')) {
                loadLayouts();
                break;
            }
        }
    }

    function setupEventListeners() {
        // Input changes
        Object.keys(controls).forEach(key => {
            controls[key].addEventListener('input', () => {
                if (valueDisplays[key]) {
                    valueDisplays[key].textContent = controls[key].value;
                }
                
                if (key === 'parentWidth' || key === 'parentHeight') {
                    updateParentPreview();
                } else {
                    updateIframePreview();
                }
            });
        });

        // Dragging
        preview.iframe.addEventListener('mousedown', startDrag);
        
        // Resizing
        const resizer = document.getElementById('resizer-se');
        resizer.addEventListener('mousedown', startResize);

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', stopActions);

        // Save
        saveBtn.addEventListener('click', saveLayout);
    }

    function updateParentPreview() {
        const w = parseInt(controls.parentWidth.value) || 1920;
        const h = parseInt(controls.parentHeight.value) || 1080;
        
        // Scale to fit screen
        const maxW = window.innerWidth - 450; // controls + padding
        const maxH = window.innerHeight - 100;
        const scale = Math.min(maxW / w, maxH / h);
        
        preview.parent.style.width = `${w}px`;
        preview.parent.style.height = `${h}px`;
        preview.parent.style.transform = `scale(${scale})`;
    }

    function updateIframePreview() {
        const styles = getStylesFromControls();
        Object.assign(preview.iframe.style, styles);
    }

    function getStylesFromControls() {
        const transform = `scale(${controls.scale.value}) rotate(${controls.rotate.value}deg) skew(${controls.skewX.value}deg, ${controls.skewY.value}deg)`;
        
        return {
            top: formatValue(controls.top.value),
            left: formatValue(controls.left.value),
            width: formatValue(controls.width.value),
            height: formatValue(controls.height.value),
            zIndex: controls.zIndex.value,
            aspectRatio: controls.aspectRatio.value,
            objectFit: controls.objectFit.value,
            opacity: controls.opacity.value,
            borderRadius: formatValue(controls.borderRadius.value),
            boxShadow: controls.boxShadow.value,
            mixBlendMode: controls.mixBlendMode.value,
            transform: transform
        };
    }

    function formatValue(val) {
        if (!val && val !== 0) return '0';
        const sVal = String(val);
        if (sVal.endsWith('%') || sVal.endsWith('px') || sVal.endsWith('em') || sVal.endsWith('rem') || sVal === 'auto') {
            return sVal;
        }
        return isNaN(Number(sVal)) ? sVal : `${sVal}px`;
    }

    function parseValue(val) {
        if (!val) return '0';
        const sVal = String(val);
        return sVal.replace('px', '');
    }

    // Interaction Handlers
    function startDrag(e) {
        if (e.target.classList.contains('resizer')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(preview.iframe.offsetLeft);
        startTop = parseInt(preview.iframe.offsetTop);
        e.preventDefault();
    }

    function startResize(e) {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(preview.iframe.offsetWidth);
        startHeight = parseInt(preview.iframe.offsetHeight);
        e.stopPropagation();
        e.preventDefault();
    }

    function handleMove(e) {
        if (isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            // Adjust for preview scaling
            const rect = preview.parent.getBoundingClientRect();
            const scale = rect.width / parseInt(preview.parent.style.width);
            
            const newLeft = startLeft + (dx / scale);
            const newTop = startTop + (dy / scale);
            
            controls.left.value = Math.round(newLeft);
            controls.top.value = Math.round(newTop);
            updateIframePreview();
        } else if (isResizing) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            const rect = preview.parent.getBoundingClientRect();
            const scale = rect.width / parseInt(preview.parent.style.width);
            
            const newWidth = startWidth + (dx / scale);
            const newHeight = startHeight + (dy / scale);
            
            controls.width.value = Math.round(newWidth);
            controls.height.value = Math.round(newHeight);
            updateIframePreview();
        }
    }

    function stopActions() {
        isDragging = false;
        isResizing = false;
    }

    // Persistence logic
    async function loadLayouts() {
        try {
            // Using SocketCluster invoke to read file via plugin
            const result = await window.scSocket.invoke('readFile', { path: LAYOUT_FILE });
            if (result && result.content) {
                allLayouts = JSON.parse(result.content);
                updateLayoutList();
            }
        } catch (e) {
            console.log('No existing layouts found or error loading:', e);
            allLayouts = {};
        }
    }

    function updateLayoutList() {
        layoutList.innerHTML = '';
        Object.keys(allLayouts).forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            li.addEventListener('click', () => applyLayout(name));
            layoutList.appendChild(li);
        });
    }

    function applyLayout(name) {
        const layout = allLayouts[name];
        if (!layout) return;

        controls.layoutName.value = name;
        controls.parentWidth.value = layout.parent.width;
        controls.parentHeight.value = layout.parent.height;
        
        const s = layout.styles;
        controls.top.value = parseValue(s.top);
        controls.left.value = parseValue(s.left);
        controls.width.value = parseValue(s.width);
        controls.height.value = parseValue(s.height);
        controls.zIndex.value = s.zIndex;
        controls.aspectRatio.value = s.aspectRatio;
        controls.objectFit.value = s.objectFit;
        controls.opacity.value = s.opacity;
        controls.borderRadius.value = parseValue(s.borderRadius);
        controls.boxShadow.value = s.boxShadow;
        controls.mixBlendMode.value = s.mixBlendMode;

        // Parse transform: scale(1) rotate(0deg) skew(0deg, 0deg)
        const transform = s.transform || '';
        const scaleMatch = transform.match(/scale\((.*?)\)/);
        const rotateMatch = transform.match(/rotate\((.*?)deg\)/);
        const skewMatch = transform.match(/skew\((.*?)deg,\s*(.*?)deg\)/);

        if (scaleMatch) controls.scale.value = scaleMatch[1];
        if (rotateMatch) controls.rotate.value = rotateMatch[1];
        if (skewMatch) {
            controls.skewX.value = skewMatch[1];
            controls.skewY.value = skewMatch[2];
        }

        // Update value displays
        Object.keys(valueDisplays).forEach(key => {
            valueDisplays[key].textContent = controls[key].value;
        });

        updateParentPreview();
        updateIframePreview();
        showStatus(`Layout "${name}" loaded`, 'success');
    }

    async function saveLayout() {
        const layoutName = controls.layoutName.value.trim();
        if (!layoutName) {
            showStatus('Please enter a layout name', 'error');
            return;
        }

        const layoutData = {
            parent: {
                width: controls.parentWidth.value,
                height: controls.parentHeight.value
            },
            styles: getStylesFromControls()
        };

        allLayouts[layoutName] = layoutData;

        try {
            await window.scSocket.invoke('writeFile', {
                path: LAYOUT_FILE,
                content: JSON.stringify(allLayouts, null, 2)
            });
            showStatus(`Layout "${layoutName}" saved successfully!`, 'success');
            updateLayoutList();
        } catch (e) {
            console.error('Save failed:', e);
            showStatus(`Save failed: ${e.message}`, 'error');
        }
    }

    function showStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.className = type;
        setTimeout(() => {
            statusMsg.className = '';
        }, 3000);
    }

    init();
});
