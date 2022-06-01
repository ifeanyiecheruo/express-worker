import { Serializable } from "child_process";
import { dirname, resolve as pathResolve, join as pathJoin } from "path";
import { rm, mkdir, readdir, writeFile, readFile, unlink } from "fs/promises";
import { ITask, ITaskQueueReader } from "./ITask";
import { AsyncCollection } from "./AsyncCollection";

class TaskQueueReader<T extends Serializable> implements ITaskQueueReader<T> {
  private readonly _folder: string;
  private readonly _items: AsyncCollection<ITask<T>> = new AsyncCollection<
    ITask<T>
  >();

  public constructor(folder: string) {
    this._folder = folder;

    process.on("message", (message: unknown): void => {
      this._acceptMessage(message).catch(function (error) {
        console.error(error);
      });
    });
  }

  public async read(): Promise<ITask<T>> {
    return await this._items.pop();
  }

  public async done(task: ITask<T>): Promise<boolean> {
    try {
      await unlink(this._getTaskPath(task));
    } catch (error) {
      console.error(error);

      return false;
    }

    return true;
  }

  public async beginRestore(): Promise<void> {
    for await (const filePath of getFilesRecursive(this._folder)) {
      const task = await loadNoThrow(filePath);

      if (typeof task !== "undefined") {
        this._items.push(task as ITask<T>);
      } else {
        await rmNoThrow(filePath);
      }
    }
  }

  private async _acceptMessage(message: unknown): Promise<void> {
    const task: ITask<T> = message as ITask<T>;
    const filePath: string = this._getTaskPath(task);

    await mkdir(dirname(filePath), { recursive: true });

    await writeFile(this._getTaskPath(task), JSON.stringify(task), "utf-8");

    this._items.unshift(task);
  }

  private _getTaskPath(task: ITask<T>): string {
    return pathResolve(this._folder, task.id[0], `${task.id}.task.json`);
  }
}

export async function loadNoThrow(
  filePath: string
): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return;
  }
}

export async function rmNoThrow(filePath: string): Promise<boolean> {
  try {
    await rm(filePath);
  } catch (error) {
    return false;
  }

  return true;
}

export async function* getFilesRecursive(
  folder: string
): AsyncIterable<string> {
  const next: string[] = [folder];

  for (
    let current = next.pop();
    typeof current === "string";
    current = next.pop()
  ) {
    try {
      for (const item of await readdir(current, { withFileTypes: true })) {
        try {
          if (item.isDirectory()) {
            next.push(pathJoin(current, item.name));
          } else if (item.isFile() && item.name.endsWith(".task.json")) {
            yield pathJoin(current, item.name);
          }
        } catch (error) {
          console.warn(error);
        }
      }
    } catch (error) {
      console.warn(error);
    }
  }
}

export function createTaskQueueReader<T extends Serializable>(
  taskFolder: string
): ITaskQueueReader<T> {
  const result = new TaskQueueReader<T>(taskFolder);

  result.beginRestore().catch(function (error) {
    console.error(error);
  });

  return result;
}
