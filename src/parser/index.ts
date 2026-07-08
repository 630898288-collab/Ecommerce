import { TmallParser } from './tmall';
import { JDParser } from './jd';
import { BaseParser } from './base';
import { isTmallUrl, isJDUrl } from '../shared/utils';

export function createParser(document: Document): BaseParser | null {
  const url = document.location.href;
  
  if (isTmallUrl(url)) {
    return new TmallParser(document);
  }
  
  if (isJDUrl(url)) {
    return new JDParser(document);
  }
  
  return null;
}
