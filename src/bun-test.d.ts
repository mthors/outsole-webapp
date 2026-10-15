declare module "bun:test" {
  export const describe: (name: string, fn: () => void | Promise<void>) => void;
  export const it: (name: string, fn: () => void | Promise<void>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const expect: (actual: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const mock: (fn?: (...args: any[]) => any) => any;
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export const afterEach: (fn: () => void | Promise<void>) => void;
}
