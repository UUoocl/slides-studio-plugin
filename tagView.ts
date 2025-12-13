import { ItemView, Plugin, WorkspaceLeaf, Setting, Notice, Editor, MarkdownView, MarkdownEditView, IconName } from "obsidian";
import { OBSWebSocket } from 'obs-websocket-js';

export const SLIDES_STUDIO_VIEW_TYPE = "slides-tag-view"

export class slidesStudioView extends ItemView{
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
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
        const lastLeaf = this.app.workspace.getMostRecentLeaf()
        const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
        
        if (lastLeafWorkspace) {
            this.app.workspace.setActiveLeaf(lastLeafWorkspace, true, true);
            lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
            this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide ${tagContent} -->\n`)
        } else {
            new Notice("No active markdown editor found.");
        }
    }

    async onOpen() {
        // ✅ CHANGE: Use this.contentEl instead of children[1]
        const container = this.contentEl;

        // ✅ CHANGE: Explicitly force vertical scrolling. 
        // This ensures the scrollbar renders on Windows when content overflows.
        container.style.overflowY = "auto";
        container.style.height = "100%"; 

        container.empty();
        container.createDiv('Header')
        
        new Setting(container).setName('Open Slides Studio')
        .setHeading()
        .setDesc('Open the Slides Studio Page in a new view')
        .addButton((button) =>{
            button.setButtonText("Open")
            .onClick(() => {this.app.commands.executeCommandById('slides-studio:open-slide-studio-webview')})
            .setCta()
        })
            
        new Setting(container).setName('Add Tags')
        .setHeading()
        .setDesc('Use the buttons below to insert tags into notes.  Tags will be inserted at the current cursor position')
        .addButton((button) =>{
            button.setButtonText("refresh view")
            .onClick(async () => {
                await this.addTagButtons(tagsContainer)
            })
        })

        const tagsContainer = container.createDiv('tags')
        
        // Initial load (no await needed strictly for initial render, or you can await it)
        this.addTagButtons(tagsContainer)        

        //add a data-id number for the selected slide
        new Setting(container).setName('Slide Id')
        .setHeading()
        .setDesc('Add an Id tag')
        .addButton((button) =>{
            button.setButtonText("Add")
            .onClick(() => {
                const lastLeaf = this.app.workspace.getMostRecentLeaf()
                const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-id="${Date.now()}" -->\n`)
                this.app.commands.executeCommandById('slides-studio:add-slide-id')})
            .setCta()
        })

    }
    
    async addTagButtons(container: any){
        // ✅ 1. Show Loading State
        container.empty();
        container.createEl('div', { 
            text: 'Fetching OBS Data...', 
            attr: { style: 'padding: 10px; color: var(--text-muted); text-align: center;' } 
        });

        // ✅ 2. Call the plugin method directly and AWAIT it
        const plugin = this.app.plugins.plugins['slides-studio'];
        if(plugin && typeof plugin.getObsTags === 'function') {
            await plugin.getObsTags();
        } else {
            // Fallback if method doesn't exist (e.g. plugin not ready)
            console.warn("Slides Studio: getObsTags method not found on plugin instance.");
        }

        // ✅ 3. Clear loading text
        container.empty()
            
        //load scenes
        const scenes =  Array.from(new Set(this.app.plugins.plugins['slides-studio'].settings.scene_tags));
        new Setting(container).setName("Scenes").setHeading()
        scenes.forEach(scene => {
            new Setting(container).setName(scene as string)
            .addButton((item) =>{
                item.setButtonText("Add")
                .setCta()
                .onClick(() => {
                    this.insertTag(`data-scene="${scene}"`);
                })
            })
        });

        //load Slide options
        const slides = Array.from(new Set(this.app.plugins.plugins['slides-studio'].settings.slide_tags));
        
        new Setting(container).setName("Slides Position").setHeading()
        slides.forEach(scene => {
            new Setting(container).setName(scene as string)
            .addButton((item) =>{
                item.setButtonText("Add")
                .setCta()
                .onClick(() => {
                    this.insertTag(`data-slide-position="${scene}"`);
                })
            })
        });
                
        //load Camera options
        const cameras =  Array.from(new Set(this.app.plugins.plugins['slides-studio'].settings.camera_tags));
        new Setting(container).setName("Camera Position").setHeading()
        cameras.forEach(scene => {
            new Setting(container).setName(scene as string)
            .addButton((item) =>{
                item.setButtonText("Add")
                .setCta()
                .onClick(() => {
                    this.insertTag(`data-camera-position="${scene}"`);
                })
            })
        });
        
        //load Camera Shapes options
        const cameras_shapes =  Array.from(new Set(this.app.plugins.plugins['slides-studio'].settings.camera_shape_tags));
        new Setting(container).setName("Camera Shapes").setHeading()
        cameras_shapes.forEach(scene => {
            new Setting(container).setName(scene as string)
            .addButton((item) =>{
                item.setButtonText("Add")
                .setCta()
                .onClick(() => {
                    this.insertTag(`data-camera-shape="${scene}"`);
                })
            })
        });
                
        // #region User Created Tags
        const userTags = this.app.plugins.plugins['slides-studio'].settings.user_tags;
        const userTagsSet = new Set(userTags);
        new Setting(container).setName("User Tags").setHeading()
        .setClass("slide-studio-new-user-tag")
        .setDesc("data-user-tag={tag value}")
        new Setting(container)
        .setName("Create a new tag")
        .addText((item) => {    
            item.setPlaceholder("key")
            item.onChange(
                (value) => {
                    this.app.plugins.plugins['slides-studio'].settings.newTagKey = value;
                    //set description using DOM element values
                    const settingEl: HTMLElement | null = document.querySelector(".slide-studio-new-user-tag");
                    const tagValue = this.app.plugins.plugins['slides-studio'].settings.newTagValue
                    console.log(tagValue)
                    if(settingEl) settingEl.querySelector(".setting-item-description")!.innerHTML =`data-${value.replace(" ","-")} : ${tagValue.replace(" ","-")}`
                })
            })
        .addText((item) => {    
            item.setPlaceholder("value")
            item.onChange(
                (value) => {
                    this.app.plugins.plugins['slides-studio'].settings.newTagValue = value;
                    //set description using DOM element values
                    const settingEl: HTMLElement | null = document.querySelector(".slide-studio-new-user-tag");
                    const tagKey = this.app.plugins.plugins['slides-studio'].settings.newTagKey
                    console.log(tagKey)
                    if(settingEl) settingEl.querySelector(".setting-item-description")!.innerHTML =`data-${tagKey.replace(" ","-")} : ${value}`
            })
        })
        .addButton( item => {                
            item.setButtonText("Create Tag")
            .onClick(() => {
                const newTag = `${this.app.plugins.plugins['slides-studio'].settings.newTagKey.replace(" ","-")}:${this.app.plugins.plugins['slides-studio'].settings.newTagValue}`
                userTagsSet.add(newTag)
                this.app.plugins.plugins['slides-studio'].settings.user_tags = Array.from(userTagsSet);
                this.app.plugins.plugins['slides-studio'].saveSettings() 
                this.onOpen()          
            })
        })
        userTags.forEach((userTag: string) => {
            new Setting(container).setName(userTag)
            .addButton((item) =>{
            item.setButtonText("Add")
                .setCta()
                .onClick(() => {
                    const dataTag = userTag.split(":")
                    this.insertTag(`data-${dataTag[0]}="${dataTag[1]}"`);
                    })
                })
    //remove user tag
                .addButton( item => {                
                    item.setButtonText("🚫")
                    .onClick(() => {
                        userTagsSet.delete(userTag)
                        this.app.plugins.plugins['slides-studio'].settings.user_tags = Array.from(userTagsSet);
                        this.app.plugins.plugins['slides-studio'].saveSettings() 
                        new Notice(`deleted user tag ${userTag}`)
                        this.onOpen()          
                    })
                })
            });
    // #endregion
      }   

      async onClose() {
        // Nothing to clean up.
      }
}