export interface FsEntry {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FsEntry[];
}
