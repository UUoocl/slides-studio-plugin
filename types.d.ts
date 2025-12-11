import "obsidian";

declare module "obsidian" {
  interface App {
    plugins: {
      plugins: Record<string, any>;
      enabledPlugins: Set<string>;
      manifests: Record<string, any>;
      getPlugin(id: string): any;
    };
  }
}