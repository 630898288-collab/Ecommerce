import { ProductInfo } from '../shared/types';
import { BaseParser } from './base';

export class JDParser extends BaseParser {
  parse(): ProductInfo {
    return {
      platform: 'jd',
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
    const selector = '.sku-name, h1.sku-name, h1';
    return this.getText(selector);
  }

  private extractPrice(): string {
    const selector = '.price J_price, .p-price, #price';
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
    const selector = '.J_commentCount, .comment-count';
    return this.getText(selector);
  }

  private extractBrand(): string {
    const selector = '.J_brandName, .brand-name';
    return this.getText(selector);
  }

  private extractCategory(): string {
    const selector = '.breadcrumb a:last-child, .category a:last-child';
    return this.getText(selector);
  }

  private extractShopName(): string {
    const selector = '.J_imName, .shop-name';
    return this.getText(selector);
  }

  private extractModel(): string {
    const params = this.extractParams();
    return params['型号'] || params['货号'] || params['产品型号'] || '';
  }

  private extractMainImages(): string[] {
    return this.getAllImages('.J_ItemImg, .spec-items img, .item-img');
  }

  private extractDetailImages(): string[] {
    return this.getAllImages('.desc-lazyload-container img, .desc-content img');
  }
}
