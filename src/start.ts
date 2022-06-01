#!/usr/bin/env node

import { join as pathJoin } from "path";
import { isMaster as isPrimaryProcess, fork } from "cluster";
import {
  createApplication,
  startApplication,
  processWorkQueue,
  IWorkRequest,
} from "./index";
import { createTaskQueueReader, createTaskQueueWriter } from "./TaskQueue";

/**
 * Startup relies on a pattern that is not too common so I'll attempt to summarize it here
 *
 * We have a primary process that quickly handles requests and returns to the caller.
 * It handles the requests by creating a worker process at startup and placing work in a queue for worker to process.
 * It does not wait for the worker to complete it just queues the work and returns a ticket that can be used to poll for the result
 *
 * We have a worker process that sits in an infinite loop reading item from a queue and doing work based on those items.
 * It does not communicate back to the primary. If the primary needs to consume the results of the work the primary must
 * tell the worker where to put its output so that the primary can find it later.
 *
 * This pattern is implemented by using fork()
 * fork launches a process with arguments that are a copy the running process's arguments.
 * The two processes also share some OS resources like open file handles and open network sockets.
 *
 * The new process executes identically to the original process until it gets to the `if statement` below
 * At that point the process finds out if it is the primary or a worker
 * If it is the primary it calls fork to create a worker and starts sending it messages
 * If it is a worker it starts reading messages from its queue.
 *
 * Note that both the primary and the worker execute the same code up to this point so it is important to
 * do this test as early as possible to minimize the amount of code each worker executes before it
 * starts to do its main job
 */
if (isPrimaryProcess) {
  const worker = fork();
  const port = parsePort(process.argv[2], 8080);
  const writer = createTaskQueueWriter<IWorkRequest>(worker);

  writer.on("disconnect", function () {
    // The primary should allocate a new worker if we lose the old one
    const worker = fork();
    writer.setWorker(worker);

    // Some handy diagnostics to see why we lost the worker
    // TODO worker.on('error')
    worker.once("exit", function (code: number, signal: string): void {
      console.info(
        `Worker ${worker.id} exited on '${signal}' with code '${code}'`
      );
    });
  });

  const app = createApplication(__dirname, writer);

  startApplication(app, port);
} else {
  const reader = createTaskQueueReader<IWorkRequest>(
    pathJoin(__dirname, "..", "temp", "tasks")
  );

  processWorkQueue(reader).catch(function (error) {
    console.error(error);
  });
}

function parsePort(value: string | undefined, defaultValue: number): number {
  try {
    if (typeof value === "string") {
      return parseInt(value, 10);
    }
  } catch {}

  return defaultValue;
}
