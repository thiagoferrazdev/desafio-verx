declare module 'express' {
  export interface Request {
    headers: Record<string, string | string[] | undefined>;
    url: string;
    header(name: string): string | undefined;
  }

  export interface Response {
    setHeader(name: string, value: string): void;
    status(code: number): Response;
    json(body: unknown): Response;
  }

  export type NextFunction = () => void;
}
