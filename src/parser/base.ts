import { ProductInfo } from '../shared/types';

export abstract class BaseParser {
  protected document: Document;

  constructor(document: Document) {
    this.document = document;
  }

  abstract parse(): ProductInfo;

  protected getText(selector: string, fallback: string = ''): string {
    const element = this.document.querySelector(selector);
    return element ? element.textContent?.trim() || fallback : fallback;
  }

  protected getAttribute(selector: string, attribute: string, fallback: string = ''): string {
    const element = this.document.querySelector(selector);
    return element ? element.getAttribute(attribute) || fallback : fallback;
  }

  protected getAllText(selector: string): string[] {
    const elements = this.document.querySelectorAll(selector);
    const result: string[] = [];
    elements.forEach((el) => {
      const text = el.textContent?.trim();
      if (text) result.push(text);
    });
    return result;
  }

  protected getAllImages(selector: string): string[] {
    const elements = this.document.querySelectorAll(selector);
    const result: string[] = [];
    elements.forEach((el) => {
      const img = el instanceof HTMLImageElement ? el : el.querySelector('img');
      if (img) {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
        if (src && !src.startsWith('data:')) {
          const fullUrl = this.resolveUrl(src);
          if (!result.includes(fullUrl)) {
            result.push(fullUrl);
          }
        }
      }
    });
    return result;
  }

  protected resolveUrl(url: string): string {
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    if (url.startsWith('/')) {
      return new URL(url, this.document.location.href).href;
    }
    if (!url.startsWith('http')) {
      return new URL(url, this.document.location.href).href;
    }
    return url;
  }

  protected extractPrice(): string {
    const selectors = ['.price', '.p-price', '.tm-price', '.price-content'];
    for (const selector of selectors) {
      const price = this.getText(selector);
      if (price && /[\d.]+/.test(price)) {
        const match = price.match(/[\d.]+/);
        return match ? match[0] : price;
      }
    }
    return '';
  }

  protected extractTitle(): string {
    const selectors = ['h1', '.sku-name', '.tb-detail-hd h1', '#J_DetailMeta h1.title'];
    for (const selector of selectors) {
      const title = this.getText(selector);
      if (title && title.length > 10) {
        return title;
      }
    }
    return '';
  }

  protected extractParams(): Record<string, string> {
    const params: Record<string, string> = {};
    const paramElements = this.document.querySelectorAll('.attributes-list li, .parameter2 .p-parameter-list li, table.attributes tr');
    
    paramElements.forEach((el) => {
      const label = el.querySelector('.label, th, dt');
      const value = el.querySelector('.value, td, dd');
      if (label && value) {
        const labelText = label.textContent?.trim().replace(/[:：]/g, '') || '';
        const valueText = value.textContent?.trim() || '';
        if (labelText && valueText) {
          params[labelText] = valueText;
        }
      }
    });
    
    return params;
  }
}
