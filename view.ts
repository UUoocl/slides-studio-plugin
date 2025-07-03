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
    
    async onOpen() {
        const container = this.containerEl.children[1]

        container.empty();
        container.createDiv('Header')
        
        new Setting(container).setName('Open in Browser')
        .setHeading()
        .setDesc('Open the Slides in a browser window')
        .addButton((button) =>{
            button.setButtonText("Slides")
            .onClick(() => {this.app.commands.executeCommandById('slides-studio:open-slides-in-browser')})
            .setCta()
        })
        .addButton((button) =>{
            button.setButtonText("Speaker View")
            .onClick(() => {this.app.commands.executeCommandById('slides-studio:open-slide-studio-speaker-view')})
        })

        
        new Setting(container).setName('URL for OBS')
        .setHeading()
        .setDesc('Copy the Slides URL, then Create a Browser Source in OBS')
        .addButton((button) =>{
            button.setButtonText("Copy URL for OBS Browser")
            .onClick(() => {this.app.commands.executeCommandById('slides-studio:copy-obs-browser-source-link')})
        })
        
        new Setting(container).setName('Add Tags')
        .setHeading()
        .setDesc('Refresh the view after connecting to OBS')
        .addButton((button) =>{
            button.setButtonText("refresh view")
            .onClick(() => {this.addTagButtons(tagsContainer)})
        })
        
        const tagsContainer = container.createDiv('tags')
        this.addTagButtons(tagsContainer)
    }
    
    async addTagButtons(container){
        
        this.app.commands.executeCommandById('slides-studio:get-obs-scene-tags')
        //new Setting(container).setName('refreshing slide tags')
        
        container.empty()
        
        //load Slide options
        
        const userTags = this.app.plugins.plugins['slides-studio'].settings.user_tags;
        const userTagsSet = new Set(userTags);
        new Setting(container).setName("User Tags").setHeading()
        new Setting(container)
        .setName("Enter a new tag value")
        .setDesc("data-user-tag={tag value}")
        .addText((item) => {
            item.onChange(
                    (value) => {
                        this.app.plugins.plugins['slides-studio'].settings.newTag = value;
                    })
            })
            .addButton( item => {                
                item.setButtonText("Add")
                .onClick(() => {
                    userTagsSet.add(this.app.plugins.plugins['slides-studio'].settings.newTag)
                    this.app.plugins.plugins['slides-studio'].settings.user_tags = Array.from(userTagsSet);
                    this.app.plugins.plugins['slides-studio'].saveSettings() 
                    this.onOpen()          
                })
            })
        userTags.forEach(scene => {
            new Setting(container).setName(scene)
            .addButton((item) =>{
            item.setButtonText("Entrance")
                .setCta()
                .onClick(() => {
                    const lastLeaf = this.app.workspace.getMostRecentLeaf()
                    const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                    
                    this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                    lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                    this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-slide-entrance="${scene}" -->
`)
                    //new Notice(`Inserted tag ${tag[1]}`)
                    })
                })
                .addButton( item => {                
                    item.setButtonText("Exit")
                    .onClick(() => {
                        const lastLeaf = this.app.workspace.getMostRecentLeaf()
                        const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                        this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                        lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                        this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-slide-exit="${scene}" -->
`)              
                        //new Notice(`Inserted tag ${tag[1]}`)
                    })
                })
    //remove user tag
                .addButton( item => {                
                    item.setButtonText("🚫")
                    .onClick(() => {
                        userTagsSet.delete(scene)
                        this.app.plugins.plugins['slides-studio'].settings.user_tags = Array.from(userTagsSet);
                        this.app.plugins.plugins['slides-studio'].saveSettings() 
                        new Notice(`deleted user tag ${scene}`)
                        this.onOpen()          
                    })
                })
           });

        //load Slide options
        const slides = Array.from(new Set(this.app.plugins.plugins['slides-studio'].settings.slide_tags));
        //const slidesSet = new Set(slides);
        
        new Setting(container).setName("Slides").setHeading()
        slides.forEach(scene => {
            new Setting(container).setName(scene)
            .addButton((item) =>{
            item.setButtonText("Entrance")
                .setCta()
                .onClick(() => {
                    const lastLeaf = this.app.workspace.getMostRecentLeaf()
                    const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                    
                    this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                    lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                    this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-slide-entrance="${scene}" -->
`)
                    //new Notice(`Inserted tag ${tag[1]}`)
                    })
                })
                .addButton( item => {                
                    item.setButtonText("Exit")
                    .onClick(() => {
                        const lastLeaf = this.app.workspace.getMostRecentLeaf()
                        const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                        this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                        lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                        this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-slide-exit="${scene}" -->
`)              
                        //new Notice(`Inserted tag ${tag[1]}`)
                    })
                })
           });
        
        //load Camera options
        const cameras =  Array.from(new Set(this.app.plugins.plugins['slides-studio'].settings.camera_tags));
        new Setting(container).setName("Cameras").setHeading()
        cameras.forEach(scene => {
            new Setting(container).setName(scene)
            .addButton((item) =>{
            item.setButtonText("Entrance")
                .setCta()
                .onClick(() => {
                    const lastLeaf = this.app.workspace.getMostRecentLeaf()
                    const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                    
                    this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                    lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                    this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-camera-entrance="${scene}" -->
`)
                    //new Notice(`Inserted tag ${tag[1]}`)
                    })
                })
                .addButton( item => {                
                    item.setButtonText("Exit")
                    .onClick(() => {
                        const lastLeaf = this.app.workspace.getMostRecentLeaf()
                        const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                        this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                        lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                        this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-camera-exit="${scene}" -->
`)              
                        //new Notice(`Inserted tag ${tag[1]}`)
                    })
                })
           });

        //load Camera Overlay options
        const cameras_overlay =  Array.from(new Set(this.app.plugins.plugins['slides-studio'].settings.camera_overlay_tags));
        new Setting(container).setName("Camera Overlay").setHeading()
        cameras_overlay.forEach(scene => {
            new Setting(container).setName(scene)
            .addButton((item) =>{
            item.setButtonText("Entrance")
                .setCta()
                .onClick(() => {
                    const lastLeaf = this.app.workspace.getMostRecentLeaf()
                    const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                    
                    this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                    lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                    this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-camera-overlay-entrance="${scene}" -->
`)
                    //new Notice(`Inserted tag ${tag[1]}`)
                    })
                })
                .addButton( item => {                
                    item.setButtonText("Exit")
                    .onClick(() => {
                        const lastLeaf = this.app.workspace.getMostRecentLeaf()
                        const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                        this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                        lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                        this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-camera-overlay-exit="${scene}" -->
`)              
                        //new Notice(`Inserted tag ${tag[1]}`)
                    })
                })
           });
        
        //load scenes
        const scenes =  Array.from(new Set(this.app.plugins.plugins['slides-studio'].settings.scene_tags));
        new Setting(container).setName("Scenes").setHeading()
        scenes.forEach(scene => {
            new Setting(container).setName(scene)
            .addButton((item) =>{
            item.setButtonText("Entrance")
                .setCta()
                .onClick(() => {
                    const lastLeaf = this.app.workspace.getMostRecentLeaf()
                    const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                    
                    this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                    lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                    this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-scene-entrance="${scene}}" -->
`)
                    //new Notice(`Inserted tag ${tag[1]}`)
                    })
                })
                .addButton( item => {                
                    item.setButtonText("Exit")
                    .onClick(() => {
                        const lastLeaf = this.app.workspace.getMostRecentLeaf()
                        const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                        this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                        lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                        this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-scene-exit="${scene}" -->
`)              
                        //new Notice(`Inserted tag ${tag[1]}`)
                    })
                })
           });

      }   

      async onClose() {
        // Nothing to clean up.
      }
}