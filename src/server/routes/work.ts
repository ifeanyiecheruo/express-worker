import { randomUUID } from "crypto";
import * as express from "express";
import { resolve as pathResolve, relative as pathRelative } from "path";
import { toAsyncHandler } from "../expressAsync";
import { HttpError } from "../HttpError";
import { IWorkRequest } from "../../worker/IWorkRequest";
import { ITaskQueueWriter } from "../../TaskQueue";

export function createRouter(
  root: string,
  queue: ITaskQueueWriter<IWorkRequest>
): express.Router {
  const router: express.Router = express.Router();
  const reportRoot: string = pathResolve(root, "..", "temp", "reports");

  router.get(
    "/",
    toAsyncHandler(async function (
      request: express.Request,
      response: express.Response
    ): Promise<void> {
      const { id } = request.query;

      assertIsString(id);

      const reportPath = getReportPath(id, reportRoot);

      if (pathRelative(reportRoot, reportPath).startsWith("..")) {
        // Prevent exploring the filesystem
        throw new HttpError(403, "Bad Request", "Bad Request");
      }

      await new Promise<void>(function (resolve, reject) {
        response.sendFile(reportPath, function (error) {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    })
  );

  router.post(
    "/",
    toAsyncHandler(async function (
      request: express.Request,
      response: express.Response
    ): Promise<void> {
      const { foo, bar, baz } = request.body;

      assertIsString(foo);
      assertIsString(bar);
      assertIsString(baz);

      const reportId: string = randomUUID();
      const reportUrl: string = getReportUrl(reportId, request);

      await queue.write({
        foo: foo,
        bar: bar,
        baz: baz,
        reportPath: getReportPath(reportId, reportRoot),
      });

      response.location(reportUrl).status(303).send("Created");
    })
  );

  return router;
}

function getReportPath(reportId: string, reportRoot: string): string {
  return pathResolve(reportRoot, reportId) + ".html";
}

function getReportUrl(reportId: string, request: express.Request): string {
  const url = new URL(
    request.originalUrl,
    `${request.protocol}://${request.get("host") ?? "localhost"}`
  );
  url.search = "";
  url.searchParams.append("id", reportId);

  return url.toString();
}

function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new HttpError(403, "Bad Request", "Bad Request");
  }
}
