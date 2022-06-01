import * as express from "express";
import { HttpError } from "./HttpError";

export function toAsyncHandler(
  callback: (
    request: express.Request,
    response: express.Response
  ) => Promise<void>
): express.Handler {
  return function (
    request: express.Request,
    response: express.Response,
    next: express.NextFunction
  ): void {
    try {
      Promise.resolve(callback(request, response))
        .then(function () {
          next();
        })
        .catch(function (error) {
          if (error instanceof HttpError) {
            response.status(error.statusCode).send(error.statusText);
          } else {
            next(error);
          }
        });
    } catch (error) {
      if (error instanceof HttpError) {
        response.status(error.statusCode).send(error.statusText);
      } else {
        next(error);
      }
    }
  };
}
