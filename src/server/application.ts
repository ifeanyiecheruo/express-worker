import { resolve as pathResolve } from "path";
import * as express from "express";
import { createRouter } from "./routes/work";
import { IWorkRequest } from "../worker/IWorkRequest";
import { ITaskQueueWriter } from "../TaskQueue";

export function createApplication(
  root: string,
  queue: ITaskQueueWriter<IWorkRequest>
): express.Express {
  const app: express.Express = express();

  app.use(express.static(pathResolve(__dirname, "public")));
  app.use(express.urlencoded({ extended: true }));
  app.use("/work", createRouter(root, queue));

  return app;
}

export function startApplication(app: express.Express, port: number) {
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}
