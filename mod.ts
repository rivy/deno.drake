// Drake API.
export {
  abort,
  debug,
  DrakeError,
  env,
  glob,
  log,
  quote,
  readFile,
  sh,
  shCapture,
  ShCaptureOpts,
  ShOpts,
  ShOutput,
  updateFile,
  writeFile,
} from "./lib/utils.ts";
export { desc, execute, run, task, vers };

import { existsSync } from "https://deno.land/std@v1.0.0-rc1/fs/mod.ts";
import * as path from "https://deno.land/std@v1.0.0-rc1/path/mod.ts";
import { help } from "./lib/help.ts";
import { Action, Task, TaskRegistry } from "./lib/tasks.ts";
import { abort, env, parseEnv } from "./lib/utils.ts";

const DRAKE_VERS = "1.0.0-rc1";

env("--abort-exits", true);

/** Global task registry. */
const taskRegistry = new TaskRegistry();

// Parse command-line options into Drake environment.
parseEnv(Deno.args.slice(), env);

if (env("--help")) {
  help();
} else if (env("--version")) {
  console.log(vers());
} else {
  // Calculate drakefile path relative to cwd prior to processing --directory option.
  let drakefile = env("--drakefile") ?? "Drakefile.ts";
  if (!path.isAbsolute(drakefile)) {
    drakefile = path.join(Deno.cwd(), drakefile);
  }
  env("--drakefile", drakefile);

  if (env("--directory")) {
    const dir = env("--directory");
    if (!existsSync(dir) || !Deno.statSync(dir).isDirectory) {
      abort(`--directory missing or not a directory: "${dir}"`);
    }
    Deno.chdir(dir);
  }
}

/** Returns the Drake version number string. */
function vers(): string {
  return DRAKE_VERS;
}

/** Set description of next registered task. */
function desc(description: string): void {
  taskRegistry.desc(description);
}

/**
 * Create and register a task. Returns the task object.
 *
 * - `name` is a unique task name.
 * - `prereqs` is an array of prerequisite task names.  Prerequisites can
 *   be Normal task names, File task names, file paths or globs
 *   (wildcards).
 * - `action` is an optional function that is run if the task is selected
 *   for execution (`type Action = (this: Task) => any;`).
 * - To fetch an existing task omit both the `prereqs` and `action`
 *   parameters.
 *
 */
function task(name: string, prereqs?: string[], action?: Action): Task {
  if (prereqs !== undefined) {
    taskRegistry.register(name, prereqs, action);
  }
  return taskRegistry.get(name);
}

/**
 * Execute named tasks along with their prerequisite tasks (direct and indirect). If no `names` are
 * specified then the command-line tasks are run. If no command-line tasks were specified the
 * default task (set in `env("--default-task")`) is run.
 *
 * Task execution is ordered such that prerequisite tasks are executed prior to their parent task.
 * The same task is never run twice.
 */
async function run(...names: string[]) {
  if (env("--help") || env("--version")) {
    return;
  }
  if (env("--list-tasks") || env("--list-all")) {
    taskRegistry.list().forEach((t) => console.log(t));
  } else {
    if (names.length === 0) {
      names = env("--tasks");
      if (names.length === 0 && env("--default-task")) {
        names.push(env("--default-task"));
      }
    }
    if (names.length === 0) {
      abort("no task specified");
    }
    await taskRegistry.run(...names);
  }
}

/**
 * Unconditionally execute task action functions asynchronously.
 * Silently skip tasks that have no action function.
 */
async function execute(...names: string[]) {
  await taskRegistry.execute(...names);
}
