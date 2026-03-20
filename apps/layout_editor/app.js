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

    // State
    let isDragging = false;
    let isResizing = false;
    let startX, startY, startLeft, startTop, startWidth, startHeight;

    // Initialization
    function init() {
        updateParentPreview();
        updateIframePreview();
        setupEventListeners();
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
        if (!val) return '0';
        if (val.endsWith('%') || val.endsWith('px') || val.endsWith('em') || val.endsWith('rem') || val === 'auto') {
            return val;
        }
        return isNaN(val) ? val : `${val}px`;
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

    async function saveLayout() {
        const layoutName = controls.layoutName.value.trim();
        if (!layoutName) {
            alert('Please enter a layout name');
            return;
        }

        const layoutData = {
            name: layoutName,
            parent: {
                width: controls.parentWidth.value,
                height: controls.parentHeight.value
            },
            styles: getStylesFromControls()
        };

        console.log('Saving layout:', layoutData);
        
        // Persistence logic will be implemented in Phase 3
        alert(`Layout "${layoutName}" prepared for saving! (Persistence to be added in Phase 3)`);
    }

    init();
});
