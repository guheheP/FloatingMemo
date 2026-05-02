declare module "markdown-it-task-lists" {
  import type { PluginWithOptions } from "markdown-it";
  interface Options {
    enabled?: boolean;
    label?: boolean;
    labelAfter?: boolean;
  }
  const plugin: PluginWithOptions<Options>;
  export default plugin;
}
