import * as assert from "assert";
import { Worker } from "cluster";
import * as events from "events";
import { Serializable } from "child_process";
import { randomUUID } from "crypto";
import { ITask, ITaskQueueWriter } from "./ITask";

class TaskQueueWriter<T extends Serializable> implements ITaskQueueWriter<T> {
  private readonly _events: events = new events();
  private readonly _onDisconnect: () => void =
    this._onDisconnectImpl.bind(this);
  private _worker?: Worker;

  public constructor(worker: Worker) {
    this._setWorker(worker);
  }

  public setWorker(worker: Worker): void {
    this._setWorker(worker);
  }

  public on(event: "disconnect", listener: (worker: Worker) => void): void {
    this._events.on(event, listener);
  }

  public once(event: "disconnect", listener: (worker: Worker) => void): void {
    this._events.once(event, listener);
  }

  public off(event: "disconnect", listener: (worker: Worker) => void): void {
    this._events.off(event, listener);
  }

  async write(payload: T): Promise<void> {
    const id: string = randomUUID();
    const task: ITask<T> = {
      id: id,
      payload: payload,
    };

    return new Promise((resolve, reject) => {
      if (!this._worker) {
        throw new Error("The writer has no worker");
      }

      this._worker.send(task, undefined, function (error) {
        if (error instanceof Error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private _setWorker(worker: Worker | undefined): void {
    this._worker?.off("exit", this._onDisconnect);
    this._worker?.off("disconnect", this._onDisconnect);

    this._worker = worker;

    worker?.once("disconnect", this._onDisconnect);
    worker?.once("exit", this._onDisconnect);
  }

  private _onDisconnectImpl(): void {
    assert(this._worker);

    const oldWorker: Worker = this._worker;

    this._setWorker(undefined);
    this._events.emit("disconnect", oldWorker);
  }
}

export function createTaskQueueWriter<T extends Serializable>(
  worker: Worker
): ITaskQueueWriter<T> {
  return new TaskQueueWriter<T>(worker);
}
