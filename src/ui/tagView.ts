import { ItemView, WorkspaceLeaf, Setting, Notice, IconName } from "obsidian";
import type slidesStudioPlugin from "../main"; // Ensure this path is correct

export const SLIDES_STUDIO_VIEW_TYPE = "slides-tag-view";

export class slidesStudioView extends ItemView {
    plugin: slidesStudioPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: slidesStudioPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return SLIDES_STUDIO_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Slide tags";
    }

    getIcon(): IconName {
        return "aperture";
    }
    
    // Helper to insert text into the active editor
    insertTag(tagContent: string) {
        const lastLeaf = this.app.workspace.getMostRecentLeaf();
        
        if (lastLeaf) {
            // FIX: setActiveLeaf is now an options object
            this.app.workspace.setActiveLeaf(lastLeaf, { focus: true });
            
            // Trigger a refresh of the ephemeral state
            void lastLeaf.setEphemeralState(lastLeaf.getEphemeralState());
            
            const editor = this.app.workspace.activeEditor?.editor;
            if (editor) {
                editor.replaceSelection(`<!-- slide ${tagContent} -->\n`);
            }
        } else {
            new Notice('No active mark down editor found');
        }
    }

    onOpen(): Promise<void> {
        const container = this.contentEl;

        // FIX: Use setCssProps instead of direct style assignment
        container.setCssProps({
            'overflow-y': 'auto',
            'height': '100%'
        });

        container.empty();
        container.createDiv({ cls: 'Header', text: 'Slides studio' });
        
        new Setting(container)
            .setName('Open slides studio')
            .setHeading()
            .setDesc('Open the slides studio web page in a new tab')
            .addButton((button) => {
                button.setButtonText("Open")
                    .onClick(() => {
                        void this.app.commands.executeCommandById('slides-studio:open-slide-studio-webview');
                    })
                    .setCta();
            });
            
        new Setting(container)
            .setName('Add tags')
            .setHeading()
            .setDesc('Insert tags at the current cursor position')
            .addButton((button) => {
                button.setButtonText("Refresh view")
                    .onClick(async () => {
                        await this.addTagButtons(tagsContainer);
                    });
            });

        const tagsContainer = container.createDiv('tags');
        void this.addTagButtons(tagsContainer);        

        new Setting(container)
            .setName('Slide number')
            .setHeading()
            .setDesc('Add a tag with a unique identifying number')
            .addButton((button) => {
                button.setButtonText("Add")
                    .onClick(() => {
                        const lastLeaf = this.app.workspace.getMostRecentLeaf();
                        if (lastLeaf) {
                            this.app.workspace.setActiveLeaf(lastLeaf, { focus: true });
                            const editor = this.app.workspace.activeEditor?.editor;
                            editor?.replaceSelection(`<!-- slide data-id="${Date.now()}" -->\n`);
                            void this.app.commands.executeCommandById('slides-studio:add-slide-id');
                        }
                    })
                    .setCta();
            });
        return Promise.resolve();
    }
    
    async addTagButtons(container: HTMLElement) {
        container.empty();
        container.createEl('div', { 
            text: 'Fetching obs data...', 
            attr: { style: 'padding: 10px; color: var(--text-muted); text-align: center;' } 
        });

        // Use the direct plugin reference
        await this.plugin.getObsTags();

        container.empty();
        const settings = this.plugin.settings;
            
        // --- Scenes ---
        this.createTagSection(container, "Scenes", settings.scene_tags, (val) => `data-scene="${val}"`);

        // --- Slide positions ---
        this.createTagSection(container, "Slide position", settings.slide_tags, (val) => `data-slide-position="${val}"`);
                
        // --- Camera positions ---
        this.createTagSection(container, "Camera position", settings.camera_tags, (val) => `data-camera-position="${val}"`);
        
        // --- Camera shapes ---
        this.createTagSection(container, "Camera shapes", settings.camera_shape_tags, (val) => `data-camera-shape="${val}"`);
                
        // --- User Tags ---
        this.renderUserTags(container);
    }

    private createTagSection(container: HTMLElement, title: string, tags: string[], tagFormatter: (val: string) => string) {
        const uniqueTags = Array.from(new Set(tags));
        if (uniqueTags.length === 0) return;

        new Setting(container).setName(title).setHeading();
        uniqueTags.forEach(tag => {
            new Setting(container).setName(tag)
                .addButton((item) => {
                    item.setButtonText("Add")
                        .setCta()
                        .onClick(() => this.insertTag(tagFormatter(tag)));
                });
        });
    }

    private renderUserTags(container: HTMLElement) {
        const userTags = this.plugin.settings.user_tags;
        const userTagsSet = new Set(userTags);

        new Setting(container).setName("User tags").setHeading()
            .setDesc("Custom data tags");

        new Setting(container)
            .setName("Create a new tag")
            .addText((text) => {    
                text.setPlaceholder("Key")
                    .onChange((value) => { this.plugin.settings.newTagKey = value });
            })
            .addText((text) => {    
                text.setPlaceholder("Value")
                    .onChange((value) => { this.plugin.settings.newTagValue = value });
            })
            .addButton(item => {                
                item.setButtonText("Create")
                    .onClick(async () => {
                        this.plugin.settings.newTag = `${this.plugin.settings.newTagKey}:${this.plugin.settings.newTagValue}`;
                        userTagsSet.add(this.plugin.settings.newTag);
                        this.plugin.settings.user_tags = Array.from(userTagsSet);
                        await this.plugin.saveSettings(); 
                        void this.onOpen();          
                    });
            });

        userTags.forEach((userTag) => {
            const dataTag = userTag.split(":");
            new Setting(container).setName(userTag)
                .addButton((item) => {
                    item.setButtonText("Add")
                        .setCta()
                        .onClick(() => this.insertTag(`data-${dataTag[0]}="${dataTag[1]}"`));
                })
                .addButton(item => {                
                    item.setButtonText("🚫")
                        .onClick(async () => {
                            userTagsSet.delete(userTag);
                            this.plugin.settings.user_tags = Array.from(userTagsSet);
                            await this.plugin.saveSettings(); 
                            new Notice(`Deleted user tag ${userTag}`);
                            void this.onOpen();          
                        });
                });
        });
    }

    async onClose() { /* cleanup */ }
}