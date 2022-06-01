export class AsyncCollection<T> {
  private readonly _items: T[] = [];
  private _onHasItems: () => void = function () {};
  private _hasItems = new Promise<void>((resolve) => {
    this._onHasItems = resolve;
  });

  public get length(): number {
    return this._items.length;
  }

  public push(item: T): void {
    this._items.push(item);
    this._onHasItems();
  }

  public unshift(item: T): void {
    this._items.unshift(item);
    this._onHasItems();
  }

  public async pop(): Promise<T> {
    const result = await this._read(this._items, this._items.pop);

    return result!;
  }

  public async shift(): Promise<T> {
    const result = await this._read(this._items, this._items.shift);

    return result!;
  }

  private async _read<TContext, TArgs extends unknown, TResult>(
    context: TContext,
    cb: (...args: TArgs[]) => TResult,
    ...args: TArgs[]
  ): Promise<TResult> {
    for (;;) {
      await this._hasItems;

      if (this._items.length > 0) {
        const result = cb.apply(context, args);

        if (this._items.length < 1) {
          this._hasItems = new Promise((resolve, reject) => {
            this._onHasItems = resolve;
          });
        }

        return result;
      }
    }
  }
}
