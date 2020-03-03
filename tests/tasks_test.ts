import {
  assertEquals,
  assertThrows
} from "https://deno.land/std@v0.35.0/testing/asserts.ts";
import { Env } from "../lib/cli.ts";
import { TaskRegistry } from "../lib/tasks.ts";
import { DrakeError } from "../lib/utils.ts";

Deno.test(
  function taskRegistryTests() {
    const env: Env = { "--tasks": [] };
    const taskRegistry = new TaskRegistry(env);

    assertThrows(
      () => taskRegistry.get("quux"),
      DrakeError,
      "missing task: quux"
    );

    taskRegistry.desc("Task 1");
    taskRegistry.register("1", ["2", "3"], () => {});

    taskRegistry.desc("Task 2");
    taskRegistry.register("2", ["3"], () => {});

    taskRegistry.desc("Task 3");
    taskRegistry.register("3", [], () => {});

    assertEquals(taskRegistry.get("1").desc, "Task 1");
    assertEquals(
      taskRegistry.resolveDependencies(["1", "3", "2"]).map(task => task.name),
      ["3", "2", "1"]
    );
  }
);

await Deno.runTests();
