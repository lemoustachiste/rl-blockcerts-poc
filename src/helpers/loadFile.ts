const fs = require('fs');
import {getDefaultFilePath} from "../constants/revocationListFilePath";

export default function loadFile<T> (fileName: string): T {
  const fileData = fs.readFileSync(getDefaultFilePath(fileName), 'utf8');
  return fileData;
}
