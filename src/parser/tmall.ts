import { ProductInfo } from '../shared/types';
import { BaseParser } from './base';

export class TmallParser extends BaseParser {
  parse(): ProductInfo {
    return {
      platform: 'tmall',
      url: this.document.location.href,
      title: this.extractTitle(),
      category: this.extractCategory(),
      brand: this.extractBrand(),
      price: this.extractPrice(),
      saleCount: this.extractSaleCount(),
      shopName: this.extractShopName(),
      model: this.extractModel(),
      params: this.extractParams(),
      mainImages: this.extractMainImages(),
      detailImages: this.extractDetailImages(),
      extractedAt: new Date().toISOString(),
    };
  }

  private extractTitle(): string {
    const selector = '#J_DetailMeta h1.title, .tb-detail-hd h1, h1';
    return this.getText(selector);
  }

  private extractPrice(): string {
    const selector = '.tm-price, .price-content .tm-price';
    let price = this.getText(selector);
    if (!price) {
      price = this.extractPriceFromScript();
    }
    return price;
  }

  private extractPriceFromScript(): string {
    const scripts = this.document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent || '';
      const match = content.match(/"price"\s*:\s*"([^"]+)"/);
      if (match) {
        return match[1];
      }
    }
    return '';
  }

  private extractSaleCount(): string {
    const selector = '.tm-count, .sale-num';
    return this.getText(selector);
  }

  private extractBrand(): string {
    const selector = '.tm-brand-name, .brand-name';
    return this.getText(selector);
  }

  private extractCategory(): string {
    const selector = '.crumb a:last-child, .category-nav a:last-child';
    return this.getText(selector);
  }

  private extractShopName(): string {
    const selector = '.tb-shop-name a, .shop-name a';
    return this.getText(selector);
  }

  private extractModel(): string {
    const params = this.extractParams();
    return params['型号'] || params['货号'] || params['产品型号'] || '';
  }

  private extractMainImages(): string[] {
    return this.getAllImages('.tb-thumb-item, .J_ItemImg, .item-img');
  }

  private extractDetailImages(): string[] {
    return this.getAllImages('.detail-content img, .desc-content img');
  }
}
