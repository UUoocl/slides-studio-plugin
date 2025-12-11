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
        let { containerEl } = this;
        
        containerEl.empty();
        containerEl.createDiv('Header')
        
        new Setting(containerEl).setName('Open Slides Studio')
        .setHeading()
        .setDesc('Open the Slides Studio Page in a new view')
        .addButton((button) =>{
            button.setButtonText("Open")
            .onClick(() => {this.app.commands.executeCommandById('slides-studio:open-slide-studio-webview')})
            .setCta()
        })
            
        new Setting(containerEl).setName('Add Tags')
        .setHeading()
        .setDesc('Use the buttons below to insert tags into notes.  Tags will be inserted at the current cursor position')
        .addButton((button) =>{
            button.setButtonText("refresh view")
            .onClick(() => {this.addTagButtons(tagsContainer)})
        })
        
        //add a data-id number for the selected slide
        new Setting(containerEl).setName('Slide Id')
        .setHeading()
        .setDesc('Add an Id tag')
        .addButton((button) =>{
            button.setButtonText("Add")
            .onClick(() => {
                const lastLeaf = this.app.workspace.getMostRecentLeaf()
                const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-id="${Date.now()}" -->
`)
                this.app.commands.executeCommandById('slides-studio:add-slide-id')})
            .setCta()
        })

        const tagsContainer = containerEl.createDiv('tags')
        this.addTagButtons(tagsContainer)
    }
    
    async addTagButtons(containerEl: HTMLElement ){
        
        this.app.commands.executeCommandById('slides-studio:get-obs-scene-tags')
      
        containerEl.empty()
            
        //load Slide options
        const slides = Array.from(new Set(this.app.plugins.plugins['slides-studio'].settings.slide_tags));
        
        new Setting(containerEl).setName("Slides Position").setHeading()
        slides.forEach(scene => {
            new Setting(containerEl).setName(scene as string)
            .addButton((item) =>{
                item.setButtonText("Add")
                .setCta()
                .onClick(() => {
                    const lastLeaf = this.app.workspace.getMostRecentLeaf()
                    const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                    
                    this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                    lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                    this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-slide-position="${scene}" -->
`)
                    })
                })
                });
                
                //load Camera options
                const cameras =  Array.from(new Set(this.app.plugins.plugins['slides-studio'].settings.camera_tags));
                new Setting(containerEl).setName("Camera Position").setHeading()
                cameras.forEach(scene => {
                    new Setting(containerEl).setName(scene as string)
                    .addButton((item) =>{
                        item.setButtonText("Add")
                        .setCta()
                        .onClick(() => {
                            const lastLeaf = this.app.workspace.getMostRecentLeaf()
                            const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                            
                            this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                            lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                            this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-camera-position="${scene}" -->
`)
                            })
                        })
                         });
                        
                        //load Camera Shapes options
                        const cameras_shapes =  Array.from(new Set(this.app.plugins.plugins['slides-studio'].settings.camera_shape_tags));
                        new Setting(containerEl).setName("Camera Shapes").setHeading()
                        cameras_shapes.forEach(scene => {
                            new Setting(containerEl).setName(scene as string)
                            .addButton((item) =>{
                                item.setButtonText("Add")
                                .setCta()
                                .onClick(() => {
                                    const lastLeaf = this.app.workspace.getMostRecentLeaf()
                                    const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                                    
                                    this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                                    lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                                    this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-camera-shape="${scene}" -->
`)
                                    })
                                })
                                });
                                
                                //load scenes
                                const scenes =  Array.from(new Set(this.app.plugins.plugins['slides-studio'].settings.scene_tags));
                                new Setting(containerEl).setName("Scenes").setHeading()
                                scenes.forEach(scene => {
                                    new Setting(containerEl).setName(scene as string)
                                    .addButton((item) =>{
                                        item.setButtonText("Add")
                                        .setCta()
                                        .onClick(() => {
                                            const lastLeaf = this.app.workspace.getMostRecentLeaf()
                                            const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                                            
                                            this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                                            lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                                            this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-scene="${scene}" -->
`)
                                            })
                                        })
                                        });
                                        
                                        
                                                // #region User Created Tags
                                                const userTags = this.app.plugins.plugins['slides-studio'].settings.user_tags;
                                                const userTagsSet = new Set(userTags);
                                                new Setting(containerEl).setName("User Tags").setHeading()
                                                .setClass("slide-studio-new-user-tag")
                                                .setDesc("data-user-tag={tag value}")
                                                new Setting(containerEl)
                                                .setName("Create a new tag")
                                                .addText((item) => {    
                                                    item.setPlaceholder("key")
                                                    item.onChange(
                                                        (value) => {
                                                            this.app.plugins.plugins['slides-studio'].settings.newTagKey = value;
                                                            //set description using DOM element values
                                                            let settingEl: HTMLElement | null = document.querySelector(".slide-studio-new-user-tag");
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
                                                            let settingEl: HTMLElement | null = document.querySelector(".slide-studio-new-user-tag");
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
                                                    new Setting(containerEl).setName(userTag)
                                                    .addButton((item) =>{
                                                    item.setButtonText("Add")
                                                        .setCta()
                                                        .onClick(() => {
                                                            const lastLeaf = this.app.workspace.getMostRecentLeaf()
                                                            const lastLeafWorkspace = this.app.workspace.getLeafById(lastLeaf?.id)
                                                            
                                                            this.app.workspace.setActiveLeaf(lastLeafWorkspace,true,true);
                                                            lastLeaf?.setEphemeralState(lastLeaf?.getEphemeralState())
                                                            const dataTag = userTag.split(":")
                                                            this.app.workspace.activeEditor?.editor?.replaceSelection(`<!-- slide data-${dataTag[0]} = "${dataTag[1]}" -->
`)
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