export class App {
  vault = {
    adapter: {
      getBasePath: () => '/mock/base/path'
    }
  };
}

export class FileSystemAdapter {
  getBasePath() { return '/mock/base/path'; }
}

export class Notice {
  constructor(message: string) {}
}

export class Plugin {
  manifest = { dir: 'plugins/slides-studio' };
}
