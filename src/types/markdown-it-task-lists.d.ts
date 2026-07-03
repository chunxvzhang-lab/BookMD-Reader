declare module "markdown-it-task-lists" {
  import type MarkdownIt from "markdown-it";

  type TaskListOptions = {
    enabled?: boolean;
    label?: boolean;
  };

  const taskLists: MarkdownIt.PluginWithOptions<TaskListOptions>;
  export default taskLists;
}
