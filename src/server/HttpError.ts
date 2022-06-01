export class HttpError extends Error {
  public statusCode: number;
  public statusText: string;

  constructor(statusCode: number, statusText: string, message: string) {
    super(message);

    // The Error class breaks the convention for prototype chains so we must restore it for things like
    // instanceof to work again
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.statusText = statusText;
  }
}
