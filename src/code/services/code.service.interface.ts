export interface ICodeService {
  generate(sub: string, clientId: number): string;
  consume(code: string): { sub: string; clientId: number } | null;
}