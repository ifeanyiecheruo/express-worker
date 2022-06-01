import { Serializable } from "child_process";
import { Worker } from "cluster";

export interface ITask<T extends Serializable> {
  id: string;
  payload: T;
}

export interface ITaskQueueReader<T extends Serializable> {
  read(): Promise<ITask<T>>;
  done(task: ITask<T>): Promise<boolean>;
}

export interface ITaskQueueWriter<T extends Serializable> {
  setWorker(worker: Worker): void;

  on(event: "disconnect", listener: (worker: Worker) => void): void;
  once(event: "disconnect", listener: (worker: Worker) => void): void;
  off(event: "disconnect", listener: (worker: Worker) => void): void;

  write(payload: T): Promise<void>;
}
