(function() {
  if (window.__productExtractorLoaded) return;
  window.__productExtractorLoaded = true;

  function textOf(el) {
    return el ? (el.textContent || '').trim() : '';
  }

  function findFirst(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && textOf(el)) return textOf(el);
    }
    return '';
  }

  function findMeta(name) {
    var meta = document.querySelector('meta[property="' + name + '"]') ||
               document.querySelector('meta[name="' + name + '"]') ||
               document.querySelector('meta[itemprop="' + name + '"]');
    return meta ? (meta.getAttribute('content') || '') : '';
  }

  function resolveUrl(url) {
    if (!url) return '';
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return new URL(url, location.href).href;
    if (!url.startsWith('http')) return new URL(url, location.href).href;
    return url;
  }

  function translateImageUrl(url, platform) {
    if (!url) return url;
    if (platform === 'jd') {
      url = url.replace(/\.avif(\?|$)/i, '$1');
      url = url.replace(/\.avif$/i, '');
    }
    return url;
  }

  function translateImageList(urls, platform) {
    return urls.map(function(u) { return translateImageUrl(u, platform); });
  }

  function getPlatform() {
    if (/\.jd\.com/.test(location.href) || /\.jd\.hk/.test(location.href)) return 'jd';
    if (/\.tmall\.com/.test(location.href) || /\.taobao\.com/.test(location.href)) return 'tmall';
    return '';
  }

  function scanPageStructure() {
    var result = {};
    
    var allULs = document.querySelectorAll('ul');
    var paramULs = [];
    allULs.forEach(function(ul) {
      var lis = ul.querySelectorAll('li');
      if (lis.length >= 3 && lis.length <= 30) {
        var colonCount = 0;
        lis.forEach(function(li) {
          var t = textOf(li);
          if (t.indexOf('：') > 0 || t.indexOf(':') > 0) colonCount++;
        });
        if (colonCount >= 3) {
          paramULs.push({
            selector: getSelector(ul),
            className: ul.className,
            id: ul.id,
            liCount: lis.length,
            sample: Array.from(lis).slice(0, 3).map(function(li) { return textOf(li).substring(0, 50); })
          });
        }
      }
    });
    result.paramULs = paramULs;

    var allDLs = document.querySelectorAll('dl');
    var paramDLs = [];
    allDLs.forEach(function(dl) {
      var dts = dl.querySelectorAll('dt');
      var dds = dl.querySelectorAll('dd');
      if (dts.length >= 2 && dds.length >= 2) {
        paramDLs.push({
          selector: getSelector(dl),
          className: dl.className,
          id: dl.id,
          dtCount: dts.length,
          ddCount: dds.length
        });
      }
    });
    result.paramDLs = paramDLs;

    var shopLinks = [];
    var allLinks = document.querySelectorAll('a');
    allLinks.forEach(function(a) {
      var href = a.getAttribute('href') || '';
      var t = textOf(a);
      if ((href.indexOf('shop.jd.com') >= 0 || href.indexOf('mall.jd.com') >= 0 || t.indexOf('旗舰店') >= 0 || t.indexOf('专营店') >= 0 || t.indexOf('自营') >= 0) && t.length > 0 && t.length < 50) {
        shopLinks.push({
          text: t,
          href: href.substring(0, 80),
          className: a.className,
          parentClass: a.parentElement ? a.parentElement.className : ''
        });
      }
    });
    result.shopLinks = shopLinks.slice(0, 10);

    var brandLinks = [];
    allLinks.forEach(function(a) {
      var t = textOf(a);
      if (t.length > 0 && t.length < 20 && (a.closest('[id*="brand"]') || a.closest('[class*="brand"]') || a.closest('#parameter-brand') || a.closest('.p-parameter-brand'))) {
        brandLinks.push({
          text: t,
          className: a.className,
          parentClass: a.parentElement ? a.parentElement.className : '',
          grandParentClass: a.parentElement && a.parentElement.parentElement ? a.parentElement.parentElement.className : ''
        });
      }
    });
    result.brandLinks = brandLinks;

    var priceElements = [];
    var allElements = document.querySelectorAll('[class*="price"], [class*="Price"], [id*="price"], [id*="Price"]');
    allElements.forEach(function(el) {
      var t = textOf(el);
      if (t.length > 0 && t.length < 30 && (t.indexOf('¥') >= 0 || t.indexOf('￥') >= 0 || /^\d+(\.\d+)?$/.test(t))) {
        priceElements.push({
          text: t.substring(0, 30),
          className: el.className,
          id: el.id,
          tagName: el.tagName
        });
      }
    });
    result.priceElements = priceElements.slice(0, 10);

    var commentElements = [];
    var allCommentEls = document.querySelectorAll('[class*="comment"], [class*="Comment"], [id*="comment"], [id*="Comment"]');
    allCommentEls.forEach(function(el) {
      var t = textOf(el);
      if (t.length > 0 && t.length < 30 && (/\d/.test(t))) {
        commentElements.push({
          text: t.substring(0, 30),
          className: el.className,
          id: el.id,
          tagName: el.tagName
        });
      }
    });
    result.commentElements = commentElements.slice(0, 10);

    var mainImgElements = [];
    var allImgContainers = document.querySelectorAll('[id*="spec"], [class*="spec"], [id*="thumb"], [class*="thumb"], [id*="preview"], [class*="preview"]');
    allImgContainers.forEach(function(el) {
      var imgs = el.querySelectorAll('img');
      if (imgs.length > 0 && imgs.length <= 20) {
        mainImgElements.push({
          className: el.className,
          id: el.id,
          tagName: el.tagName,
          imgCount: imgs.length,
          sampleSrc: imgs[0].src ? imgs[0].src.substring(0, 80) : ''
        });
      }
    });
    result.mainImgElements = mainImgElements.slice(0, 10);

    return result;
  }

  function getSelector(el) {
    var parts = [];
    while (el && el.nodeType === 1 && parts.length < 5) {
      var part = el.tagName.toLowerCase();
      if (el.id) {
        part += '#' + el.id;
        parts.unshift(part);
        break;
      }
      if (el.className && typeof el.className === 'string') {
        var classes = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
        if (classes) part += '.' + classes;
      }
      parts.unshift(part);
      el = el.parentElement;
    }
    return parts.join(' > ');
  }

  function extractParams() {
    var params = {};

    var paramSelectors = [
      '.parameter2 .p-parameter-list li',
      '.p-parameter-list li',
      '.attributes-list li',
      '#J_AttrList li',
      '.attr-list .attr',
      'table.attributes tr',
      '.Ptable .Ptable-row',
      '.detail-attr .attr-item',
      '.product-params li',
      '.params-list .param-item',
      '#detail .parameter2 li',
      '.detail-page ul li',
      '[class*="param"] li',
      '[class*="Param"] li',
      '.parameter2 li',
      '.p-parameter li',
      'ul.parameter-list li',
      '.goods-parameter li',
      '.product-info li'
    ];

    paramSelectors.forEach(function(sel) {
      var elements = document.querySelectorAll(sel);
      elements.forEach(function(el) {
        var labelEl = el.querySelector('.label, th, dt, .name, .param-name, .title, dt span, [class*="name"]');
        var valueEl = el.querySelector('.value, td, dd, .val, .param-value, dd span, [class*="value"]');

        if (labelEl && valueEl) {
          var k = textOf(labelEl).replace(/[:：]/g, '');
          var v = textOf(valueEl);
          if (k && v && !params[k]) params[k] = v;
          return;
        }

        var text = textOf(el);
        if (text && (text.indexOf('：') > 0 || text.indexOf(':') > 0)) {
          var sep = text.indexOf('：') > 0 ? '：' : ':';
          var parts = text.split(sep);
          if (parts.length >= 2) {
            var k2 = parts[0].trim();
            var v2 = parts.slice(1).join(sep).trim();
            if (k2 && v2 && !params[k2] && k2.length < 30 && v2.length < 500) {
              params[k2] = v2;
            }
          }
        }
      });
    });

    var highlightItems = document.querySelectorAll('.highlight-attrs .item, [class*="highlight"] .item, [class*="attrs"] .item');
    highlightItems.forEach(function(item) {
      var desc = item.querySelector('.desc') || item;
      var children = desc.children;
      if (children && children.length >= 2) {
        for (var i = 0; i < children.length - 1; i += 2) {
          var k = textOf(children[i]).replace(/[:：]/g, '');
          var v = textOf(children[i + 1]);
          if (k && v && !params[k] && k.length < 30 && v.length < 500) {
            params[k] = v;
          }
        }
      }
      var itemText = textOf(item);
      if (itemText) {
        var lines = itemText.split('\n').filter(function(l) { return l.trim(); });
        for (var j = 0; j < lines.length - 1; j += 2) {
          var k3 = lines[j].trim().replace(/[:：]/g, '');
          var v3 = lines[j + 1] ? lines[j + 1].trim() : '';
          if (k3 && v3 && !params[k3] && k3.length < 30 && v3.length < 500) {
            params[k3] = v3;
          }
        }
      }
    });

    var allItems = document.querySelectorAll('[class*="item"]');
    allItems.forEach(function(item) {
      var t = textOf(item);
      if (t && t.length > 0 && t.length < 100) {
        var lines = t.split('\n').filter(function(l) { return l.trim() && l.trim().length > 0 && l.trim().length < 50; });
        if (lines.length >= 2 && lines.length <= 6) {
          for (var i = 0; i < lines.length - 1; i += 2) {
            var k = lines[i].trim().replace(/[:：\s]/g, '');
            var v = lines[i + 1].trim();
            if (k && v && !params[k] && k.length >= 2 && k.length < 20 && v.length < 200) {
              if (k.length > 0 && v.length > 0 && !/^[\d.]+$/.test(k)) {
                params[k] = v;
              }
            }
          }
        }
      }
    });

    var tmallParamAreas = document.querySelectorAll('.tabDetailItem, .paramsInfoArea, [class*="tabDetail"], [class*="paramsInfo"]');
    tmallParamAreas.forEach(function(area) {
      var areaText = textOf(area);
      if (areaText) {
        var lines = areaText.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
        var knownKeys = ['品牌', '系列', '型号', '上市时间', '能效备案号', '固态硬盘', '适用场景', '能效等级', '颜色分类',
                         '屏幕刷新率', '笔记本类型', 'CPU品牌', '售后服务', '保修期', '内存容量', '套餐类型', '硬盘容量',
                         '产品品牌', '产品型号', '货号', '产地', '毛重', '包装清单', '材质', '尺寸', '重量',
                         '续航时间', '蓝牙功能', '摄像头像素', '屏幕尺寸', '操作系统', 'CPU型号', '核心数',
                         '显卡类型', '显存容量', '散热方式', '指纹识别', '产品尺寸', '产品重量', '适用人群',
                         '充电功率', '电池容量', '网络制式', '机身颜色', '运行内存', '机身存储'];
        
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          for (var k = 0; k < knownKeys.length; k++) {
            var key = knownKeys[k];
            if (line === key && i + 1 < lines.length) {
              var val = lines[i + 1];
              if (val && val.length > 0 && val.length < 500 && !params[key]) {
                if (knownKeys.indexOf(val) === -1) {
                  params[key] = val;
                }
              }
              break;
            }
          }
        }
      }

      var emphasisItems = area.querySelectorAll('.emphasisParamsInfoItem, [class*="emphasis"] [class*="Params"]');
      emphasisItems.forEach(function(item) {
        var labelEl = item.querySelector('[class*="SubTitle"], [class*="subTitle"], [class*="subtitle"], [class*="label"]');
        var valueEl = item.querySelector('[class*="Title"]:not([class*="SubTitle"]):not([class*="subTitle"]), [class*="title"]:not([class*="subTitle"]):not([class*="SubTitle"])');
        if (labelEl && valueEl) {
          var k = textOf(labelEl).replace(/[:：]/g, '');
          var v = textOf(valueEl);
          if (k && v && !params[k] && k.length < 30 && v.length < 500) {
            params[k] = v;
            return;
          }
        }
        var t = textOf(item);
        if (t) {
          var lines = t.split('\n').filter(function(l) { return l.trim(); });
          for (var i = 0; i < lines.length - 1; i += 2) {
            var k = lines[i].trim().replace(/[:：]/g, '');
            var v = lines[i + 1] ? lines[i + 1].trim() : '';
            if (k && v && !params[k] && k.length < 30 && v.length < 500) {
              params[k] = v;
            }
          }
        }
      });

      var generalWraps = area.querySelectorAll('.generalParamsInfoWrap, [class*="general"] [class*="Params"]');
      generalWraps.forEach(function(wrap) {
        var wrapText = textOf(wrap);
        if (wrapText) {
          var allLines = wrapText.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0 && l.length < 200; });
          for (var i = 0; i < allLines.length - 1; i++) {
            var current = allLines[i];
            var next = allLines[i + 1];
            if (current && next && !params[current]) {
              if (/^[\d]+$/.test(next) || /^[\d.,]+$/.test(next)) {
                params[current] = next;
                i++;
              } else if (current.length >= 2 && current.length <= 20 && next.length >= 1 && next.length <= 200) {
                if (/^[\u4e00-\u9fa5]+$/.test(current) || /^[\u4e00-\u9fa5]+[\u4e00-\u9fa5a-zA-Z0-9]+$/.test(current)) {
                  params[current] = next;
                  i++;
                }
              }
            }
          }
        }

        var allDivs = wrap.querySelectorAll('div');
        var textBuffer = [];
        allDivs.forEach(function(div) {
          var t = textOf(div);
          if (t && t.length > 0 && t.length < 200) {
            textBuffer.push(t.trim());
          }
        });
        for (var bi = 0; bi < textBuffer.length - 1; bi++) {
          var k = textBuffer[bi];
          var v = textBuffer[bi + 1];
          if (k && v && !params[k] && k.length >= 2 && k.length <= 20 && v.length >= 1 && v.length <= 200) {
            if (/^[\u4e00-\u9fa5]+$/.test(k) || /^[\u4e00-\u9fa5]+[\u4e00-\u9fa5a-zA-Z0-9]+$/.test(k)) {
              params[k] = v;
              bi++;
            }
          }
        }

        var items = wrap.querySelectorAll('[class*="item"], li');
        items.forEach(function(item) {
          var t = textOf(item);
          if (t && (t.indexOf('：') > 0 || t.indexOf(':') > 0)) {
            var sep = t.indexOf('：') > 0 ? '：' : ':';
            var parts = t.split(sep);
            if (parts.length >= 2) {
              var k = parts[0].trim().replace(/[:：]/g, '');
              var v = parts.slice(1).join(sep).trim();
              if (k && v && !params[k] && k.length < 30 && v.length < 500) {
                params[k] = v;
              }
            }
          }
        });

        var allChildren = wrap.children;
        if (allChildren && allChildren.length > 0) {
          for (var ci = 0; ci < allChildren.length; ci++) {
            var child = allChildren[ci];
            var childText = textOf(child);
            if (childText && childText.length > 0 && childText.length < 200) {
              var childLines = childText.split('\n').filter(function(l) { return l.trim() && l.trim().length > 0; });
              if (childLines.length >= 2 && childLines.length <= 10) {
                for (var li = 0; li < childLines.length - 1; li += 2) {
                  var k2 = childLines[li].trim().replace(/[:：]/g, '');
                  var v2 = childLines[li + 1] ? childLines[li + 1].trim() : '';
                  if (k2 && v2 && !params[k2] && k2.length >= 2 && k2.length < 20 && v2.length < 200) {
                    if (!/^[\d.]+$/.test(k2)) {
                      params[k2] = v2;
                    }
                  }
                }
              }
            }
          }
        }
      });
    });

    var tmallItemInfo = document.querySelectorAll('.itemInfo, [class*="itemInfo"]');
    tmallItemInfo.forEach(function(info) {
      var t = textOf(info);
      if (t) {
        var lines = t.split('\n').filter(function(l) { return l.trim() && l.trim().length > 0; });
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.indexOf('：') > 0 || line.indexOf(':') > 0) {
            var sep = line.indexOf('：') > 0 ? '：' : ':';
            var parts = line.split(sep);
            if (parts.length >= 2) {
              var k = parts[0].trim().replace(/[:：]/g, '');
              var v = parts.slice(1).join(sep).trim();
              if (k && v && !params[k] && k.length < 30 && v.length < 500) {
                params[k] = v;
              }
            }
          }
        }
      }
    });

    return params;
  }

  function extractPrice() {
    var priceSelectors = [
      '.p-price .price',
      '.p-price span.price',
      '#jd-price',
      '.summary-price .p-price .price',
      '.price.J_price',
      '.itemInfo-wrap .p-price span',
      '.summary-price-wrap .price',
      '[class*="price"] [class*="price"]',
      '[class*="Price"]',
      '.p-price',
      '.price'
    ];
    var price = findFirst(priceSelectors);
    if (price) {
      var m = price.match(/[¥￥]?\s*([\d,.]+)/);
      if (m) return m[1];
    }

    var priceMeta = findMeta('og:price:amount') || findMeta('product:price:amount');
    if (priceMeta) return priceMeta;

    var priceRegex = /["']?price["']?\s*[:=]\s*["']?([^"'\s,}]+)/gi;
    var bodyText = document.body.innerHTML || '';
    var match;
    while ((match = priceRegex.exec(bodyText)) !== null) {
      var val = match[1];
      if (/^\d+(\.\d+)?$/.test(val) && parseFloat(val) > 0 && parseFloat(val) < 100000) {
        return val;
      }
    }

    var priceElement = document.evaluate(
      "//*[contains(text(),'¥') or contains(text(),'￥')]",
      document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
    ).singleNodeValue;
    if (priceElement) {
      var t = textOf(priceElement);
      var m2 = t.match(/[¥￥]\s*([\d,.]+)/);
      if (m2) return m2[1];
    }

    return '';
  }

  function extractBrand() {
    var brandSelectors = [
      '#parameter-brand li a',
      '.p-parameter-list li:first-child a',
      '.p-parameter-list .p-parameter-brand a',
      '.J_brandName',
      '.brand-name',
      '.parameter2 .p-parameter-list .p-parameter-brand',
      '[id*="brand"] a',
      '[class*="brand"] a'
    ];
    var brand = findFirst(brandSelectors);
    if (brand) return brand;

    var brandMeta = findMeta('og:brand') || findMeta('product:brand');
    if (brandMeta) return brandMeta;

    var params = extractParams();
    return params['品牌'] || params['产品品牌'] || '';
  }

  function extractSaleCount() {
    var countSelectors = [
      '.product-price-panel--options-comment-count',
      '[class*="options-comment-count"]',
      '[class*="comment-count"]',
      '.J_commentCount',
      '.comment-count',
      '.p-comment a',
      '#comment-count',
      '.summary-comment .count',
      '[id*="comment"] [class*="count"]',
      '[class*="comment"] [class*="count"]',
      '.score .count'
    ];
    var count = findFirst(countSelectors);
    if (count) {
      var numMatch = count.match(/([\d,.]+[万+]*)/);
      if (numMatch) return numMatch[1];
    }

    var commentMeta = findMeta('og:review_count') || findMeta('product:review_count');
    if (commentMeta) return commentMeta;

    var allEls = document.querySelectorAll('[class*="comment"], [class*="Comment"], [id*="comment"], [id*="Comment"]');
    for (var i = 0; i < allEls.length; i++) {
      var t = textOf(allEls[i]);
      if (t && t.length < 30 && /\d/.test(t)) {
        var m = t.match(/([\d,.]+[万+]*)/);
        if (m) return m[1];
      }
    }

    return '';
  }

  function extractShopName() {
    var shopSelectors = [
      '.top-name',
      '[class*="top-name"]',
      '[class*="topName"]',
      '.J_imName a',
      '.shop-name a',
      '.seller a',
      '#popshop .name',
      '.shopInfo .name',
      '.shop-name-text',
      '[class*="shop"] a[name]',
      '[class*="Shop"] [class*="Name"]'
    ];
    var shop = findFirst(shopSelectors);
    if (shop) return shop;

    var shopMeta = findMeta('og:site_name');
    if (shopMeta && shopMeta.indexOf('京东') === -1) return shopMeta;

    var allLinks = document.querySelectorAll('a');
    for (var i = 0; i < allLinks.length; i++) {
      var href = allLinks[i].getAttribute('href') || '';
      var t = textOf(allLinks[i]);
      if ((href.indexOf('mall.jd.com') >= 0 || href.indexOf('shop.jd.com') >= 0) && t.length > 0 && t.length < 50) {
        if (t.indexOf('旗舰店') >= 0 || t.indexOf('专营店') >= 0 || t.indexOf('自营') >= 0 || t.indexOf('官方') >= 0) {
          return t;
        }
      }
    }

    var selfEls = document.querySelectorAll('[class*="self"], [class*="Self"], [id*="self"], [id*="Self"]');
    for (var j = 0; j < selfEls.length; j++) {
      var t2 = textOf(selfEls[j]);
      if (t2 && t2.indexOf('自营') >= 0) {
        return '京东自营';
      }
    }

    if (document.body.innerHTML && document.body.innerHTML.indexOf('京东自营') >= 0) {
      return '京东自营';
    }

    return '';
  }

  function extractCategory() {
    var breadcrumbSelectors = [
      '.breadcrumb a:last-child',
      '.crumb a:last-child',
      '#category-path a:last-child',
      '.nav a:last-child',
      '.crumbs a:last-child'
    ];
    var cat = findFirst(breadcrumbSelectors);
    if (cat) return cat;

    var categoryMeta = findMeta('og:type') || findMeta('product:category');
    if (categoryMeta) return categoryMeta;

    return '';
  }

  function extractBackgroundImageUrl(el) {
    if (!el || el.nodeType !== 1) return '';
    var style = el.getAttribute('style') || '';
    var match = style.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    if (window.getComputedStyle) {
      try {
        var computed = window.getComputedStyle(el);
        var bg = computed.backgroundImage || '';
        if (bg && bg !== 'none') {
          var m = bg.match(/url\(['"]?(.*?)['"]?\)/i);
          if (m && m[1]) return m[1].trim();
        }
      } catch (e) {}
    }
    return '';
  }

  function isInCommentArea(img) {
    var el = img;
    while (el && el.nodeType === 1) {
      if (el.id && (el.id.indexOf('comment') >= 0 || el.id.indexOf('Comment') >= 0)) return true;
      if (el.className && typeof el.className === 'string') {
        var cls = el.className.toLowerCase();
        if (cls.indexOf('comment') >= 0 || cls.indexOf('review') >= 0 || cls.indexOf('评价') >= 0 || cls.indexOf('晒单') >= 0 || cls.indexOf('feedback') >= 0) {
          return true;
        }
      }
      el = el.parentElement;
    }
    return false;
  }

  function isValidProductImage(imgEl, src) {
    if (!src || src.startsWith('data:')) return false;

    var keywordFilters = [
      'blank.gif', 'loading.gif', 'sprite', 'icon', 'logo',
      'avatar', 'default', 'placeholder', 'empty', 'none',
      'btn_', 'button', 'bg_', 'bg-', 'background',
      'topbar', 'navbar', 'header', 'footer', 'arrow',
      'star', 'rating', 'close', 'menu', 'search',
      'cart', 'shop', 'user', 'mail', 'phone',
      'play.png', 'video.png', 'player',
      'gray', 'grey', 'transparent',
      'gif', 'svg'
    ];
    var lowerSrc = src.toLowerCase();
    for (var k = 0; k < keywordFilters.length; k++) {
      if (lowerSrc.indexOf(keywordFilters[k]) >= 0) return false;
    }

    if (lowerSrc.indexOf('.jpg') === -1 && lowerSrc.indexOf('.jpeg') === -1 && 
        lowerSrc.indexOf('.png') === -1 && lowerSrc.indexOf('.webp') === -1 &&
        lowerSrc.indexOf('.bmp') === -1 && lowerSrc.indexOf('img') === -1 &&
        lowerSrc.indexOf('pic') === -1 && lowerSrc.indexOf('image') === -1 &&
        lowerSrc.indexOf('photo') === -1 && lowerSrc.indexOf('picture') === -1) {
      if (lowerSrc.indexOf('http') >= 0 && lowerSrc.indexOf('.') >= 0) {
        var extMatch = lowerSrc.match(/\.(jpg|jpeg|png|webp|bmp|gif)(\?|$|_)/i);
        if (!extMatch) return false;
      }
    }

    if (imgEl && imgEl.naturalWidth && imgEl.naturalHeight) {
      var nw = imgEl.naturalWidth;
      var nh = imgEl.naturalHeight;
      if (nw < 50 || nh < 50) return false;
      if (nw * nh < 2500) return false;
    }

    if (imgEl && imgEl.width && imgEl.height) {
      var w = typeof imgEl.width === 'number' ? imgEl.width : parseInt(imgEl.width) || 0;
      var h = typeof imgEl.height === 'number' ? imgEl.height : parseInt(imgEl.height) || 0;
      if (w > 0 && h > 0) {
        if (w < 30 || h < 30) return false;
        if (w * h < 900) return false;
      }
    }

    if (imgEl && imgEl.getBoundingClientRect) {
      var rect = imgEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (rect.width < 30 || rect.height < 30) return false;
        if (rect.width * rect.height < 900) return false;
      }
    }

    return true;
  }

  function extractMainImages() {
    var urls = [];
    var imgSelectors = [
      '#spec-list img',
      '.spec-items img',
      '#spec-img',
      '.J_ItemImg',
      '.item-img img',
      '#preview img',
      '.preview img',
      '.spec-list img',
      '.preview-img img',
      '.swiper-slide img',
      '#main-image',
      '[id*="spec"] img',
      '[class*="spec"] img',
      '[class*="thumb"] img',
      '[class*="Thumb"] img'
    ];

    imgSelectors.forEach(function(sel) {
      var imgs = document.querySelectorAll(sel);
      imgs.forEach(function(img) {
        if (!(img instanceof HTMLImageElement)) {
          var inner = img.querySelector('img');
          if (inner) img = inner; else return;
        }
        if (isInCommentArea(img)) return;
        var src = img.getAttribute('src') ||
                  img.getAttribute('data-src') ||
                  img.getAttribute('data-lazy-src') ||
                  img.getAttribute('data-origin') ||
                  img.getAttribute('data-img') ||
                  img.getAttribute('data-url') || '';
        if (!src) return;
        if (!isValidProductImage(img, src)) return;
        var fullUrl = resolveUrl(src);
        if (urls.indexOf(fullUrl) === -1) {
          urls.push(fullUrl);
        }
      });
    });

    return urls.slice(0, 20);
  }

  function extractDetailImages() {
    var urls = [];
    var detailSelectors = [
      '.desc-lazyload-container img',
      '.desc-content img',
      '#detail img',
      '.detail-content img',
      '.content-detail img',
      '.product-detail img',
      '#detail-tag-id-0 img',
      '.m-content img',
      '[id*="detail"] img',
      '[class*="detail"] img',
      '[class*="Detail"] img',
      '[class*="desc"] img'
    ];

    detailSelectors.forEach(function(sel) {
      var imgs = document.querySelectorAll(sel);
      imgs.forEach(function(img) {
        if (isInCommentArea(img)) return;
        var src = img.getAttribute('src') ||
                  img.getAttribute('data-src') ||
                  img.getAttribute('data-lazy-src') ||
                  img.getAttribute('data-origin') ||
                  img.getAttribute('data-lazyload') || '';
        if (!src) return;
        if (!isValidProductImage(img, src)) return;
        var fullUrl = resolveUrl(src);
        if (urls.indexOf(fullUrl) === -1) {
          urls.push(fullUrl);
        }
      });
    });

    return urls.slice(0, 50);
  }

  function extractJD() {
    var title = findFirst([
      '.sku-name',
      '.itemInfo-wrap .sku-name',
      '#name h1',
      '#comboBreakDiv h1',
      'h1.sku-name'
    ]) || findMeta('og:title') || document.title || '';

    var price = extractPrice();
    var brand = extractBrand();
    var saleCount = extractSaleCount();
    var shopName = extractShopName();
    var category = extractCategory();
    var params = extractParams();
    var model = params['型号'] || params['货号'] || params['产品型号'] || params['商品编号'] || '';
    
    var mainImages = [];

    var detailImages = [];
    var jdDetailMain = document.querySelector('#detail-main, .detail-content, [id*="detail-main"]');
    if (jdDetailMain) {
      var ssdModules = jdDetailMain.querySelectorAll('.ssd-module, [class*="ssd-module"]');
      ssdModules.forEach(function(mod) {
        var bgUrl = extractBackgroundImageUrl(mod);
        if (bgUrl) {
          var lowerSrc = bgUrl.toLowerCase();
          if (lowerSrc.indexOf('blank.gif') >= 0 || lowerSrc.indexOf('loading.gif') >= 0) return;
          if (lowerSrc.indexOf('icon') >= 0 || lowerSrc.indexOf('logo') >= 0 || lowerSrc.indexOf('sprite') >= 0) return;
          var fullUrl = resolveUrl(bgUrl);
          if (detailImages.indexOf(fullUrl) === -1) {
            detailImages.push(fullUrl);
          }
        }
      });

      var allEls = jdDetailMain.querySelectorAll('*');
      allEls.forEach(function(el) {
        if (el.tagName === 'IMG') return;
        var bgUrl = extractBackgroundImageUrl(el);
        if (bgUrl) {
          var lowerSrc = bgUrl.toLowerCase();
          if (lowerSrc.indexOf('blank.gif') >= 0 || lowerSrc.indexOf('loading.gif') >= 0) return;
          if (lowerSrc.indexOf('icon') >= 0 || lowerSrc.indexOf('logo') >= 0 || lowerSrc.indexOf('sprite') >= 0) return;
          if (lowerSrc.indexOf('btn_') >= 0 || lowerSrc.indexOf('button') >= 0) return;
          var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
          if (rect.width > 0 && rect.height > 0 && rect.width * rect.height < 900) return;
          var fullUrl = resolveUrl(bgUrl);
          if (detailImages.indexOf(fullUrl) === -1) {
            detailImages.push(fullUrl);
          }
        }
      });

      var dImgs = jdDetailMain.querySelectorAll('img');
      dImgs.forEach(function(img) {
        var src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-img') || img.getAttribute('data-lazyload') || '';
        if (!src) return;
        var lowerSrc = src.toLowerCase();
        if (lowerSrc.indexOf('blank.gif') >= 0 || lowerSrc.indexOf('loading.gif') >= 0) return;
        if (lowerSrc.indexOf('icon') >= 0 || lowerSrc.indexOf('logo') >= 0 || lowerSrc.indexOf('sprite') >= 0) return;
        if (lowerSrc.indexOf('btn_') >= 0 || lowerSrc.indexOf('button') >= 0) return;
        var fullUrl = resolveUrl(src);
        if (detailImages.indexOf(fullUrl) === -1) {
          detailImages.push(fullUrl);
        }
      });
    }
    if (detailImages.length === 0) {
      detailImages = extractDetailImages();
    }

    return {
      platform: 'jd',
      url: location.href,
      title: title,
      brand: brand,
      model: model,
      category: category,
      shopName: shopName,
      price: price,
      saleCount: saleCount,
      params: params,
      mainImages: translateImageList(mainImages, 'jd'),
      detailImages: translateImageList(detailImages, 'jd'),
      extractedAt: new Date().toISOString()
    };
  }

  function extractTmall() {
    var title = findFirst([
      '.mainTitle',
      '[class*="mainTitle"]',
      'h1[data-title]',
      '.tb-detail-hd h1',
      '#J_DetailMeta h1',
      '.tb-title h1',
      'h1.tb-main-title',
      '.itemInfo--TSMo4sAj',
      '[class*="itemInfo"]',
      '.itemTitle--t4JRbhVa',
      '[class*="itemTitle"]',
      '.itemTitle',
      'h1'
    ]) || findMeta('og:title') || document.title || '';

    if (title && title.indexOf('已售') >= 0) {
      var mainTitleEl = document.querySelector('.mainTitle, [class*="mainTitle"]');
      if (mainTitleEl) title = textOf(mainTitleEl);
    }

    if (title && title.length > 100) {
      title = title.substring(0, 100).replace(/[\s\n]+/g, ' ') + '...';
    }

    var price = '';
    var highlightPrice = document.querySelector('.highlightPrice, [class*="highlightPrice"]');
    if (highlightPrice) {
      var priceText = textOf(highlightPrice);
      if (priceText) {
        var pm = priceText.match(/[¥￥]?\s*([\d,.]+)/);
        if (pm) price = pm[1];
      }
    }
    if (!price) {
      price = findFirst([
        '.tm-price',
        '.tm-promo-price .tm-price',
        '.price-content .tm-price',
        '.tb-rmb-num',
        '.price',
        '[class*="price"]',
        '[class*="Price"]'
      ]);
    }
    if (!price) {
      var priceMeta = findMeta('og:price:amount') || findMeta('product:price:amount');
      if (priceMeta) price = priceMeta;
    }
    if (price) {
      var m = price.match(/[¥￥]?\s*([\d,.]+)/);
      if (m) price = m[1];
    }

    var saleCount = '';
    var itemInfoEl = document.querySelector('.itemInfo, [class*="itemInfo"]');
    if (itemInfoEl) {
      var infoText = textOf(itemInfoEl);
      if (infoText) {
        var soldMatch = infoText.match(/已售\s*([\d,.]+[万+]*)/);
        if (soldMatch) saleCount = soldMatch[1];
      }
    }
    if (!saleCount) {
      var countEls = document.querySelectorAll('[class*="sale"], [class*="Sale"], [class*="sold"], [class*="Sold"]');
      for (var i = 0; i < countEls.length; i++) {
        var t = textOf(countEls[i]);
        if (t && t.indexOf('已售') >= 0) {
          var m2 = t.match(/已售\s*([\d,.]+[万+]*)/);
          if (m2) { saleCount = m2[1]; break; }
        }
      }
    }
    if (!saleCount) {
      saleCount = extractSaleCount();
    }

    var shopName = findFirst([
      '.shopName',
      '[class*="shopName"]',
      '[class*="shop-name"]',
      '.tb-shop-name a',
      '.shop-name a',
      '.slogo-shopname',
      '.shop-header .shop-name',
      '[class*="shop"] a',
      '[class*="Shop"] a'
    ]);
    if (!shopName) {
      var shopNameEl = document.querySelector('.shopName, [class*="shopName"], [class*="shop-name"]');
      if (shopNameEl) shopName = textOf(shopNameEl);
    }
    if (!shopName) {
      var allLinks = document.querySelectorAll('a');
      for (var j = 0; j < allLinks.length; j++) {
        var t = textOf(allLinks[j]);
        if (t && t.length > 0 && t.length < 50 && (t.indexOf('旗舰店') >= 0 || t.indexOf('专营店') >= 0 || t.indexOf('官方') >= 0)) {
          shopName = t;
          break;
        }
      }
    }

    var params = extractParams();
    
    var brand = params['品牌'] || params['产品品牌'] || '';
    if (!brand) {
      brand = extractBrand();
    }

    var model = params['型号'] || params['货号'] || params['产品型号'] || '';
    var category = extractCategory();

    var mainImages = [];

    var detailImages = [];
    var tmallDescContainer = document.querySelector('.descV8-container, .descV8-container *, [class*="descV8"], [class*="desc-v8"], .desc-content, [class*="desc"]');
    if (tmallDescContainer) {
      var tmallImgs = tmallDescContainer.querySelectorAll('img');
      tmallImgs.forEach(function(img) {
        if (isInCommentArea(img)) return;
        var src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-ks-lazyload') || '';
        if (!src) return;
        if (!isValidProductImage(img, src)) return;
        var fullUrl = resolveUrl(src);
        if (detailImages.indexOf(fullUrl) === -1) {
          detailImages.push(fullUrl);
        }
      });
    }
    if (detailImages.length === 0) {
      detailImages = extractDetailImages();
    }

    return {
      platform: 'tmall',
      url: location.href,
      title: title,
      brand: brand,
      model: model,
      category: category,
      shopName: shopName,
      price: price || '',
      saleCount: saleCount,
      params: params,
      mainImages: mainImages.slice(0, 20),
      detailImages: detailImages.slice(0, 50),
      extractedAt: new Date().toISOString()
    };
  }

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'EXTRACT_INFO') {
      try {
        var platform = getPlatform();
        var productInfo;

        if (platform === 'jd') {
          productInfo = extractJD();
        } else if (platform === 'tmall') {
          productInfo = extractTmall();
        } else {
          sendResponse({ success: false, error: '当前页面不支持信息提取' });
          return true;
        }

        sendResponse({ success: true, data: productInfo });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : '提取失败'
        });
      }
    } else if (message.type === 'SCAN_PAGE') {
      try {
        var scan = scanPageStructure();
        sendResponse({ success: true, data: scan });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    }
    return true;
  });
})();
