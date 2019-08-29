declare module 'conventional-changelog' {
  import { Stream } from 'stream';

  export interface Commit {
    hash: string;
    scope: string;
    type: string;
  }
  export type DoneCallback = () => void;
  export type Transform = (commit: Commit, done: DoneCallback) => void;

  export interface Options {
    append?: boolean;
    config?: Promise<any> | (() => any) | any;
    debug?: Function;
    pkg?: {};
    path?: string;
    releaseCount?: number;
    transform?: Transform;
    preset: string;
  }

  function conventionalChangelog(
    options: Options,
    context?: any,
    gitRawCommitsOpts?: any,
    parserOpts?: any,
    writerOpts?: any,
  ): Stream;

  export default conventionalChangelog;
}
