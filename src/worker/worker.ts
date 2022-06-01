import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import { ITaskQueueReader } from "../TaskQueue";
import { IWorkRequest } from "./IWorkRequest";

export async function processWorkQueue(
  reader: ITaskQueueReader<IWorkRequest>
): Promise<void> {
  for (;;) {
    const task = await reader.read();

    try {
      await mkdir(dirname(task.payload.reportPath), {
        recursive: true,
      });

      await writeFile(
        task.payload.reportPath,
        `
            <html>
              <head>
                <title>${task.id}</title>
              </head>
              <body>
                Working...
              </bpdy>
            </html>
          `,
        { encoding: "utf-8", flag: "w" }
      );

      await new Promise(function (resolve) {
        setTimeout(resolve, 5000);
      });

      await writeFile(
        task.payload.reportPath,
        `
            <html>
              <head>
                <title>${task.id}</title>
              </head>
              <body>
                <pre>${JSON.stringify(task.payload, undefined, 2)}</pre>
              </bpdy>
            </html>
          `,
        { encoding: "utf-8", flag: "w" }
      );
    } catch (error) {
      console.error(error);
    } finally {
      await reader.done(task);
    }
  }
}
