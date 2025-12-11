import { ItemView, WorkspaceLeaf, IconName } from "obsidian";
import slidesStudioPlugin from "main";

export const SLIDES_STUDIO_WEBVIEW_TYPE = "slides-studio-webview";

export class SlideStudioWebview extends ItemView {
    plugin: slidesStudioPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: slidesStudioPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return SLIDES_STUDIO_WEBVIEW_TYPE;
    }

    getDisplayText(): string {
        return "Slides Studio Live";
    }

    getIcon(): IconName {
        return "presentation";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("slides-studio-webview-container");

        // Create the Iframe
        const frame = container.createEl("iframe");
        frame.setAttribute("allow", "autoplay");
        
        // CSS to make it fill the view
        frame.style.width = "100%";
        frame.style.height = "100%";
        frame.style.border = "none";

        // ✅ Use the helper to get the correct URL regardless of server provider
        const url = this.plugin.getServerUrl();

        if (url) {
            frame.src = url;
        } else {
            frame.src = "about:blank";
            container.createEl("h3", { text: "Server not running. Enable it in settings." });
        }
    }

    async onClose() {
        // Cleanup
    }
}