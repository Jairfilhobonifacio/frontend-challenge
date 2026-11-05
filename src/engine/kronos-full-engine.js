(function installKronosFullEngine(global) {
  'use strict';

  const SCALE = 1000000000000000000n; // 10^18 Wei = 1 ETH
  const STORAGE_KEY = 'kronos.full-marketplace.v2';
  const NETWORK_FEE_ETH = '0.003000000000000000';
  const ZERO_ETH = '0.000000000000000000';
  const EXCHANGE_RATE_BRL_PER_ETH = 15200; // R$ 15.200,00 / ETH
  const KRN_PER_ETH = 2500n; // 1 ETH = 2.500 KRN
  const QUOTE_TTL_MS = 120000;

  let seq = 100;
  const listeners = new Set();

  function makeError(code, message, reason) {
    const err = new Error(message);
    err.code = code;
    if (reason) err.reason = reason;
    return err;
  }

  function parseEthToWei(value) {
    if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(value.trim())) {
      throw makeError('VALIDATION_ERROR', 'Informe o valor em ETH como string decimal válida (até 18 casas).');
    }
    const clean = value.trim();
    const parts = clean.split('.');
    return BigInt(parts[0]) * SCALE + BigInt((parts[1] || '').padEnd(18, '0'));
  }

  function formatWeiToEth(wei) {
    if (typeof wei !== 'bigint' || wei < 0n) {
      throw makeError('VALIDATION_ERROR', 'Valor em Wei inválido.');
    }
    return (wei / SCALE).toString() + '.' + (wei % SCALE).toString().padStart(18, '0');
  }

  function formatShortEth(ethStr) {
    const wei = parseEthToWei(ethStr);
    const full = formatWeiToEth(wei);
    const parts = full.split('.');
    const dec = parts[1].slice(0, 4).replace(/0+$/, '');
    return parts[0] + '.' + (dec.length >= 3 ? dec : parts[1].slice(0, 3)) + ' ETH';
  }

  function weiToBrlCents(wei) {
    // 1 ETH (10^18 Wei) = EXCHANGE_RATE_BRL_PER_ETH * 100 centavos
    const rateCents = BigInt(EXCHANGE_RATE_BRL_PER_ETH * 100);
    return Number((wei * rateCents) / SCALE);
  }

  function formatBrlCents(cents) {
    const reais = (cents / 100).toFixed(2).replace('.', ',');
    const parts = reais.split(',');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + parts.join(',');
  }

  function weiToKrn(wei) {
    const krnUnits = (wei * KRN_PER_ETH) / (SCALE / 100n);
    const whole = krnUnits / 100n;
    const frac = (krnUnits % 100n).toString().padStart(2, '0');
    return whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + frac + ' KRN';
  }

  function deterministicHex(inputStr, len) {
    let h1 = 0xdeadbeef ^ inputStr.length;
    let h2 = 0x41c6ce57 ^ inputStr.length;
    for (let i = 0; i < inputStr.length; i++) {
      const ch = inputStr.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    let out = '';
    let seed = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
    while (out.length < len) {
      h1 = Math.imul(h1 ^ (out.length + 17), 2246822507);
      h2 = Math.imul(h2 ^ (out.length + 31), 3266489909);
      out += (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0') + seed;
    }
    return out.slice(0, len);
  }

  function generateCid(seedStr) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
    const hex = deterministicHex(seedStr, 96);
    let cid = 'bafybeig';
    for (let i = 0; i < 44; i++) {
      const idx = parseInt(hex.slice(i * 2, i * 2 + 2), 16) % alphabet.length;
      cid += alphabet[idx];
    }
    return 'ipfs://' + cid;
  }

  function uuid(prefix) {
    seq += 1;
    return (prefix || 'krn') + '_' + Date.now().toString(36) + '_' + seq.toString(36);
  }

  function floorPrice(editions) {
    const avail = editions.filter(function has(e) { return e.availableSupply > 0; });
    const list = avail.length ? avail : editions;
    let minWei = null;
    list.forEach(function check(e) {
      const w = parseEthToWei(e.priceEth);
      if (minWei === null || w < minWei) minWei = w;
    });
    return formatWeiToEth(minWei || 0n);
  }

  function makeSeedArtifact(id, code, title, creatorHandle, collectionName, category, description, favoritesCount, genesisPrice, studyPrice, studySupply, genesisSupply, royaltyBps, algorithm) {
    const sha = deterministicHex(id + ':' + title + ':' + creatorHandle, 64);
    const cid = generateCid(sha);
    const sig = '0x' + deterministicHex('eip712:' + sha, 130);
    const editions = [
      {
        editionId: 'genesis',
        label: 'Original 1/1',
        standard: 'ERC-721',
        priceEth: genesisPrice,
        totalSupply: 1,
        availableSupply: genesisSupply,
        maxPerCollector: 1
      },
      {
        editionId: 'study',
        label: 'Estudo de Artista',
        standard: 'ERC-1155',
        priceEth: studyPrice,
        totalSupply: 24,
        availableSupply: studySupply,
        maxPerCollector: 3
      }
    ];
    return {
      id,
      code,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title,
      collectionName,
      creatorHandle,
      creatorAddress: '0x' + deterministicHex(creatorHandle, 40),
      category,
      description,
      mediaUrl: '',
      ipfsCid: cid,
      sha256Hash: sha,
      eip712Signature: sig,
      royaltyBps: royaltyBps || 500,
      recipe: {
        algorithm: algorithm || 'lissajous-ribbon',
        seedHex: '0x' + sha.slice(0, 12),
        complexity: 36,
        accentHue: 230
      },
      editions,
      floorPriceEth: floorPrice(editions),
      favoritesCount,
      version: 1,
      updatedAt: '2026-10-20T12:00:00.000Z'
    };
  }

  const COUPONS = {
    KRONOS10: { code: 'KRONOS10', discountBps: 1000, expired: false, label: '10% OFF Curadoria KRONOS' },
    ARCHIVE20: { code: 'ARCHIVE20', discountBps: 2000, expired: false, label: '20% OFF Membro Fundador' },
    EXPIRED50: { code: 'EXPIRED50', discountBps: 5000, expired: true, label: 'Cupom Expirado (Teste E2E)' }
  };

  function createInitialDb() {
    return {
      schemaVersion: 2,
      activeUserId: 'user-maya',
      nfts: [
        makeSeedArtifact('k-001', 'K—001', 'Phase shift 001', '@maya.lin', 'Chromatic fields', 'generative', 'Um campo de cor em transformação. Cada intervalo revela uma nova relação entre luz, ruído e forma.', 128, '1.250000000000000000', '0.180000000000000001', 12, 1, 500, 'lissajous-ribbon'),
        makeSeedArtifact('k-002', 'K—002', 'Silent monument', '@theo.void', 'Concrete futures', 'monolith', 'Uma arquitetura impossível suspensa entre presença e silêncio. Massa, sombra e espaço em equilíbrio.', 96, '2.400000000000000000', '0.240000000000000000', 8, 1, 750, 'brutalist-slabs'),
        makeSeedArtifact('k-003', 'K—003', 'Proof of absence', '@nora.zk', 'Invisible systems', 'zero-knowledge', 'A presença de algo que permanece oculto. Um estudo visual sobre informação, privacidade e percepção.', 214, '3.100000000000000000', '0.320000000000000000', 6, 0, 500, 'zk-interference'),
        makeSeedArtifact('k-004', 'K—004', 'Field notes 004', '@maya.lin', 'Chromatic fields', 'generative', 'Vestígios de um sistema em crescimento. Linhas e cores encontram sua própria ordem no acaso.', 73, '0.850000000000000000', '0.100000000000000000', 18, 1, 500, 'orbital-copper'),
        makeSeedArtifact('k-005', 'K—005', 'Concrete memory', '@theo.void', 'Concrete futures', 'monolith', 'Uma memória construída em camadas. A geometria preserva o que o tempo insiste em apagar.', 151, '1.800000000000000000', '0.210000000000000000', 3, 1, 600, 'strata-memory'),
        makeSeedArtifact('k-006', 'K—006', 'Afterimage protocol', '@nora.zk', 'Invisible systems', 'zero-knowledge', 'O que permanece depois da imagem. Um protocolo de luz transforma sinais em paisagens digitais.', 89, '1.450000000000000000', '0.160000000000000000', 10, 1, 500, 'cobalt-afterimage')
      ],
      users: {
        'user-maya': {
          id: 'user-maya',
          name: 'Maya Lin',
          handle: '@maya.collector',
          email: 'maya@kronos.archive',
          krnBalanceUnits: 1450000, // 14.500,00 KRN
          ethBalance: '8.450000000000000000',
          favorites: ['k-001', 'k-003'],
          wallets: [
            { id: 'w-maya-1', label: 'Cofre Principal (Ledger)', address: '0x71C9...9A21', network: 'ethereum-mainnet', isPrimary: true, status: 'CONNECTED' },
            { id: 'w-maya-2', label: 'Carteira Estúdio (Base L2)', address: '0x44B2...11E0', network: 'base-mainnet', isPrimary: false, status: 'CONNECTED' }
          ]
        },
        'user-theo': {
          id: 'user-theo',
          name: 'Theo Void',
          handle: '@theo.archive',
          email: 'theo@kronos.archive',
          krnBalanceUnits: 320000, // 3.200,00 KRN
          ethBalance: '4.100000000000000000',
          favorites: ['k-002'],
          wallets: [
            { id: 'w-theo-1', label: 'Carteira Curadoria', address: '0x99A0...4F12', network: 'ethereum-mainnet', isPrimary: true, status: 'CONNECTED' }
          ]
        }
      },
      cartsByOwner: {
        'user-maya': [
          { nftId: 'k-001', editionId: 'study', quantity: 1, addedVersion: 1 }
        ],
        'user-theo': [],
        'guest': []
      },
      couponsByOwner: {
        'user-maya': 'KRONOS10',
        'user-theo': null,
        'guest': null
      },
      orders: [],
      paymentIntents: {},
      idempotencyRecords: {},
      processedEventIds: [],
      eventFeed: []
    };
  }

  function loadDb() {
    try {
      const raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createInitialDb();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schemaVersion !== 2) return createInitialDb();
      return parsed;
    } catch (_) {
      return createInitialDb();
    }
  }

  let db = loadDb();

  function saveDb() {
    try {
      if (global.localStorage) {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      }
    } catch (_) {}
  }

  function emitSocketEvent(event) {
    db.eventFeed.unshift(event);
    if (db.eventFeed.length > 30) db.eventFeed.length = 30;
    saveDb();
    listeners.forEach(function notify(fn) {
      try { fn(event); } catch (_) {}
    });
  }

  function currentOwnerKey() {
    return db.activeUserId || 'guest';
  }

  function getActiveUser() {
    if (!db.activeUserId) return null;
    const u = db.users[db.activeUserId];
    if (!u) return null;
    const whole = Math.floor(u.krnBalanceUnits / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const frac = String(u.krnBalanceUnits % 100).padStart(2, '0');
    return Object.assign({}, u, {
      krnBalanceFormatted: whole + ',' + frac + ' KRN'
    });
  }

  function switchSession(targetUserId) {
    // Se estava em guest e tinha itens no carrinho, faz merge para a conta autenticada
    const guestItems = (db.cartsByOwner['guest'] || []).slice();
    if (targetUserId && db.users[targetUserId] && guestItems.length > 0) {
      const userCart = db.cartsByOwner[targetUserId] || [];
      guestItems.forEach(function mergeItem(gItem) {
        const nft = getNft(gItem.nftId);
        const ed = nft && nft.editions.find(function m(e) { return e.editionId === gItem.editionId; });
        if (!ed || ed.availableSupply <= 0) return;
        const maxAllowed = Math.min(ed.availableSupply, ed.maxPerCollector);
        const existing = userCart.find(function m(c) { return c.nftId === gItem.nftId && c.editionId === gItem.editionId; });
        if (existing) {
          existing.quantity = Math.min(maxAllowed, existing.quantity + gItem.quantity);
        } else {
          userCart.push({
            nftId: gItem.nftId,
            editionId: gItem.editionId,
            quantity: Math.min(maxAllowed, gItem.quantity),
            addedVersion: nft.version
          });
        }
      });
      db.cartsByOwner[targetUserId] = userCart;
      db.cartsByOwner['guest'] = [];
    }
    db.activeUserId = targetUserId || null;
    saveDb();
    emitSocketEvent({
      eventId: uuid('evt_session'),
      type: 'session.changed',
      userId: db.activeUserId,
      emittedAt: new Date().toISOString()
    });
    return getActiveUser();
  }

  function getNft(nftId) {
    return db.nfts.find(function m(n) { return n.id === nftId; }) || null;
  }

  function toggleFavorite(nftId) {
    if (!db.activeUserId) {
      throw makeError('UNAUTHORIZED', 'Autentique-se como colecionador para salvar favoritos.');
    }
    const user = db.users[db.activeUserId];
    const nft = getNft(nftId);
    if (!nft) throw makeError('NOT_FOUND', 'Obra não encontrada.');
    const idx = user.favorites.indexOf(nftId);
    let isFav = false;
    if (idx === -1) {
      user.favorites.push(nftId);
      nft.favoritesCount += 1;
      isFav = true;
    } else {
      user.favorites.splice(idx, 1);
      nft.favoritesCount = Math.max(0, nft.favoritesCount - 1);
      isFav = false;
    }
    saveDb();
    return { nftId, isFavorited: isFav, favoritesCount: nft.favoritesCount };
  }

  // ============================================================================
  // MINTING ENGINE — CRIAÇÃO DE NFT ÚNICO ON-CHAIN (EIP-712 + IPFS CID + SHA-256)
  // ============================================================================
  function mintArtifact(input) {
    if (!input || !input.title || input.title.trim().length < 3) {
      throw makeError('VALIDATION_ERROR', 'Informe um título para a obra (mínimo 3 caracteres).');
    }
    const priceWei = parseEthToWei(input.priceEth || '0.250000000000000000');
    if (priceWei <= 0n) {
      throw makeError('VALIDATION_ERROR', 'O preço da edição deve ser maior que zero ETH.');
    }
    const totalSupply = Number(input.totalSupply || 1);
    const standard = input.standard === 'ERC-1155' ? 'ERC-1155' : 'ERC-721';
    const finalSupply = standard === 'ERC-721' ? 1 : Math.max(1, Math.min(100, Math.floor(totalSupply)));
    const maxPerCollector = standard === 'ERC-721' ? 1 : Math.max(1, Math.min(finalSupply, Number(input.maxPerCollector || 3)));
    const royaltyBps = Math.max(0, Math.min(1500, Number(input.royaltyBps || 500)));

    const nextNumber = db.nfts.length + 1;
    const id = 'k-' + String(nextNumber).padStart(3, '0');
    const code = 'K—' + String(nextNumber).padStart(3, '0');
    const user = getActiveUser();
    const creatorHandle = (input.creatorHandle || (user ? user.handle : '@atelier.kronos')).trim();
    const sha256Hash = deterministicHex(id + ':' + input.title + ':' + (input.seedHex || Date.now()), 64);
    const ipfsCid = generateCid(sha256Hash);
    const eip712Signature = '0x' + deterministicHex('eip712-voucher:' + sha256Hash + ':' + priceWei.toString(), 130);

    const formattedPrice = formatWeiToEth(priceWei);
    const editions = [
      {
        editionId: standard === 'ERC-721' ? 'genesis' : 'study',
        label: standard === 'ERC-721' ? 'Original 1/1' : 'Edição de Artista',
        standard,
        priceEth: formattedPrice,
        totalSupply: finalSupply,
        availableSupply: finalSupply,
        maxPerCollector
      }
    ];

    const newNft = {
      id,
      code,
      slug: input.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: input.title.trim(),
      collectionName: (input.collectionName || 'Arquivo Autoral 2026').trim(),
      creatorHandle,
      creatorAddress: user && user.wallets[0] ? user.wallets[0].address : '0x71C9...9A21',
      category: input.category || 'generative',
      description: (input.description || 'Obra generativa registrada com manifesto IPFS e voucher EIP-712.').trim(),
      mediaUrl: input.mediaDataUrl || '',
      ipfsCid,
      sha256Hash,
      eip712Signature,
      royaltyBps,
      recipe: input.recipe || {
        algorithm: 'lissajous-ribbon',
        seedHex: '0x' + sha256Hash.slice(0, 12),
        complexity: 42,
        accentHue: 230
      },
      editions,
      floorPriceEth: formattedPrice,
      favoritesCount: 1,
      version: 1,
      updatedAt: new Date().toISOString()
    };

    db.nfts.unshift(newNft);
    if (user) {
      user.favorites.push(newNft.id);
    }
    saveDb();

    emitSocketEvent({
      eventId: uuid('evt_mint'),
      type: 'nft.updated',
      nftId: newNft.id,
      editionId: editions[0].editionId,
      newPriceEth: formattedPrice,
      newAvailableSupply: finalSupply,
      version: 1,
      emittedAt: newNft.updatedAt
    });

    return newNft;
  }

  // ============================================================================
  // CARRINHO MULTI-ITEM & COTAÇÃO TRIPLA (ETH WEI + STRIPE BRL + $KRN)
  // ============================================================================
  function getOwnerCart() {
    const key = currentOwnerKey();
    if (!db.cartsByOwner[key]) db.cartsByOwner[key] = [];
    return db.cartsByOwner[key];
  }

  function addToCart(nftId, editionId, quantityToAdd) {
    const nft = getNft(nftId);
    const ed = nft && nft.editions.find(function m(e) { return e.editionId === editionId; });
    if (!nft || !ed) throw makeError('NOT_FOUND', 'Obra ou edição inexistente.');
    if (ed.availableSupply <= 0) throw makeError('AVAILABILITY_CONFLICT', 'Esta edição está esgotada.');

    const qty = Math.max(1, Math.floor(Number(quantityToAdd || 1)));
    const maxAllowed = Math.min(ed.availableSupply, ed.maxPerCollector);
    const cart = getOwnerCart();
    const existing = cart.find(function m(item) { return item.nftId === nftId && item.editionId === editionId; });

    if (existing) {
      if (existing.quantity + qty > maxAllowed) {
        throw makeError('VALIDATION_ERROR', 'Limite máximo de ' + maxAllowed + ' unidade(s) atingido para esta edição.');
      }
      existing.quantity += qty;
      existing.addedVersion = nft.version;
    } else {
      if (qty > maxAllowed) {
        throw makeError('VALIDATION_ERROR', 'Limite máximo de ' + maxAllowed + ' unidade(s) para esta edição.');
      }
      cart.push({
        nftId,
        editionId,
        quantity: qty,
        addedVersion: nft.version
      });
    }
    saveDb();
    return buildCartQuote();
  }

  function updateCartQuantity(nftId, editionId, nextQuantity) {
    const cart = getOwnerCart();
    const idx = cart.findIndex(function m(item) { return item.nftId === nftId && item.editionId === editionId; });
    if (idx === -1) return buildCartQuote();
    if (nextQuantity <= 0) {
      cart.splice(idx, 1);
      saveDb();
      return buildCartQuote();
    }
    const nft = getNft(nftId);
    const ed = nft && nft.editions.find(function m(e) { return e.editionId === editionId; });
    if (!ed || ed.availableSupply === 0) {
      throw makeError('AVAILABILITY_CONFLICT', 'Edição sem estoque disponível.');
    }
    const maxAllowed = Math.min(ed.availableSupply, ed.maxPerCollector);
    if (nextQuantity > maxAllowed) {
      throw makeError('VALIDATION_ERROR', 'Máximo permitido: ' + maxAllowed + ' unidade(s).');
    }
    cart[idx].quantity = Math.floor(nextQuantity);
    cart[idx].addedVersion = nft.version;
    saveDb();
    return buildCartQuote();
  }

  function applyCoupon(codeInput) {
    const key = currentOwnerKey();
    if (!codeInput || !codeInput.trim()) {
      db.couponsByOwner[key] = null;
      saveDb();
      return buildCartQuote();
    }
    const normalized = codeInput.trim().toUpperCase();
    const coupon = COUPONS[normalized];
    if (!coupon) {
      throw makeError('COUPON_INVALID', 'Código de cupom "' + normalized + '" inexistente no arquivo.');
    }
    if (coupon.expired) {
      throw makeError('COUPON_EXPIRED', 'O cupom "' + normalized + '" está expirado.');
    }
    db.couponsByOwner[key] = normalized;
    saveDb();
    return buildCartQuote();
  }

  function buildCartQuote() {
    const key = currentOwnerKey();
    const rawCart = getOwnerCart();
    const couponCode = db.couponsByOwner[key] || null;
    const coupon = couponCode ? COUPONS[couponCode] : null;

    let subtotalWei = 0n;
    let royaltyWei = 0n;
    const versionSnapshot = {};
    let staleReason = null;

    const items = rawCart.map(function mapItem(entry) {
      const nft = getNft(entry.nftId);
      const ed = nft && nft.editions.find(function m(e) { return e.editionId === entry.editionId; });
      if (!nft || !ed) return null;
      const unitWei = parseEthToWei(ed.priceEth);
      const lineWei = unitWei * BigInt(entry.quantity);
      subtotalWei += lineWei;
      royaltyWei += (lineWei * BigInt(nft.royaltyBps || 500)) / 10000n;
      versionSnapshot[nft.id + ':' + ed.editionId] = nft.version;

      if (ed.availableSupply === 0) staleReason = 'EDITION_SOLD_OUT';
      else if (entry.quantity > ed.availableSupply) staleReason = 'INSUFFICIENT_STOCK';
      else if (entry.addedVersion && entry.addedVersion < nft.version) staleReason = 'PRICE_CHANGED';

      return {
        nftId: nft.id,
        code: nft.code,
        editionId: ed.editionId,
        editionLabel: ed.label,
        standard: ed.standard,
        title: nft.title,
        creatorHandle: nft.creatorHandle,
        quantity: entry.quantity,
        unitPriceEth: ed.priceEth,
        lineSubtotalEth: formatWeiToEth(lineWei),
        availableSupply: ed.availableSupply,
        maxPerCollector: ed.maxPerCollector,
        nftVersion: nft.version,
        hasChangedSinceAdded: Boolean(entry.addedVersion && entry.addedVersion < nft.version)
      };
    }).filter(Boolean);

    const discountWei = coupon && !coupon.expired
      ? (subtotalWei * BigInt(coupon.discountBps)) / 10000n
      : 0n;
    const netSubtotalWei = subtotalWei > discountWei ? subtotalWei - discountWei : 0n;
    const feeWei = items.length > 0 ? parseEthToWei(NETWORK_FEE_ETH) : 0n;
    const totalWei = netSubtotalWei + feeWei;
    const totalBrlCents = weiToBrlCents(totalWei);
    const rewardWei = totalWei / 20n; // 5% curation cashback in $KRN

    return {
      quoteId: uuid('qt'),
      items,
      couponCode,
      couponLabel: coupon ? coupon.label : null,
      subtotalEth: formatWeiToEth(subtotalWei),
      discountEth: formatWeiToEth(discountWei),
      creatorRoyaltyEth: formatWeiToEth(royaltyWei),
      networkFeeEth: formatWeiToEth(feeWei),
      totalEth: formatWeiToEth(totalWei),
      exchangeRateBrlPerEth: EXCHANGE_RATE_BRL_PER_ETH,
      totalBrlCents,
      totalBrlFormatted: formatBrlCents(totalBrlCents),
      totalKrnFormatted: weiToKrn(netSubtotalWei + feeWei / 2n),
      krnRewardEarned: weiToKrn(rewardWei),
      isStale: Boolean(staleReason),
      staleReason,
      versionSnapshot,
      expiresAt: Date.now() + QUOTE_TTL_MS
    };
  }

  function acceptUpdatedCartQuote() {
    const cart = getOwnerCart();
    cart.forEach(function syncVer(item) {
      const nft = getNft(item.nftId);
      if (nft) item.addedVersion = nft.version;
    });
    saveDb();
    return buildCartQuote();
  }

  function validateQuoteSnapshot(quote) {
    if (!quote || !Array.isArray(quote.items) || quote.items.length === 0) {
      return { valid: false, reason: 'EMPTY_CART' };
    }
    if (Date.now() > quote.expiresAt) {
      return { valid: false, reason: 'QUOTE_EXPIRED' };
    }
    for (let i = 0; i < quote.items.length; i++) {
      const qItem = quote.items[i];
      const nft = getNft(qItem.nftId);
      const ed = nft && nft.editions.find(function m(e) { return e.editionId === qItem.editionId; });
      if (!nft || !ed) return { valid: false, reason: 'NOT_FOUND' };
      if (ed.availableSupply === 0) return { valid: false, reason: 'EDITION_SOLD_OUT' };
      if (qItem.quantity > ed.availableSupply) return { valid: false, reason: 'INSUFFICIENT_STOCK' };
      if (parseEthToWei(qItem.unitPriceEth) !== parseEthToWei(ed.priceEth)) {
        return { valid: false, reason: 'PRICE_CHANGED' };
      }
      if (qItem.nftVersion !== nft.version) {
        return { valid: false, reason: 'PRICE_CHANGED' };
      }
    }
    return { valid: true, reason: null };
  }

  // ============================================================================
  // SOCKET.IO EVENT ENGINE (nft.updated & order.updated com Versão Monotônica)
  // ============================================================================
  function applyNftUpdatedEvent(event) {
    if (!event || !event.eventId || event.type !== 'nft.updated') return false;
    if (db.processedEventIds.indexOf(event.eventId) !== -1) return false;
    const nft = getNft(event.nftId);
    const ed = nft && nft.editions.find(function m(e) { return e.editionId === event.editionId; });
    if (!nft || !ed) return false;
    // Monotonic version check: discard outdated or duplicate versions
    if (typeof event.version !== 'number' || event.version <= nft.version) {
      return false;
    }
    ed.priceEth = formatWeiToEth(parseEthToWei(event.newPriceEth));
    if (typeof event.newAvailableSupply === 'number') {
      ed.availableSupply = Math.max(0, Math.min(ed.totalSupply, event.newAvailableSupply));
    }
    nft.version = event.version;
    nft.updatedAt = event.emittedAt || new Date().toISOString();
    nft.floorPriceEth = floorPrice(nft.editions);
    db.processedEventIds.push(event.eventId);
    saveDb();
    emitSocketEvent(event);
    return true;
  }

  // ============================================================================
  // GATEWAY DE PAGAMENTO STRIPE + WEB3 DUAL-RAIL COM IDEMPOTÊNCIA E SNAPSHOT
  // ============================================================================
  function quoteFingerprint(quote, paymentRail) {
    const itemsKey = (quote.items || []).map(function k(i) {
      return i.nftId + ':' + i.editionId + ':' + i.quantity + ':' + i.unitPriceEth + ':v' + i.nftVersion;
    }).join('|');
    return paymentRail + '//' + itemsKey + '//' + quote.totalEth + '//' + (quote.couponCode || 'NONE');
  }

  function createStripePaymentIntent(quote, rail, idempotencyKey) {
    if (!db.activeUserId) {
      throw makeError('UNAUTHORIZED', 'Faça login para iniciar o pagamento.');
    }
    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw makeError('VALIDATION_ERROR', 'Header Idempotency-Key obrigatório.');
    }
    const validation = validateQuoteSnapshot(quote);
    if (!validation.valid) {
      throw makeError('STALE_QUOTE', 'A cotação mudou ou expirou (' + validation.reason + '). Revalide os valores antes de pagar.', validation.reason);
    }
    const fp = quoteFingerprint(quote, rail);
    const existingRec = db.idempotencyRecords[idempotencyKey];
    if (existingRec) {
      if (existingRec.fingerprint !== fp) {
        throw makeError('IDEMPOTENCY_CONFLICT', 'Conflito 409: Esta Idempotency-Key já foi usada para um pedido com itens ou valores diferentes.');
      }
      return {
        intent: db.paymentIntents[existingRec.paymentIntentId],
        order: db.orders.find(function m(o) { return o.orderId === existingRec.orderId; }),
        replayed: true
      };
    }

    const piId = 'pi_3Kronos_' + deterministicHex(idempotencyKey, 14);
    const pixPayload = '00020126580014BR.GOV.BCB.PIX0136kronos-archive-' + piId.slice(-8) + '5204000053039865406' + (quote.totalBrlCents / 100).toFixed(2) + '5802BR5914KRONOS ARCHIVE6009SAO PAULO62070503***6304ABCD';

    const intent = {
      paymentIntentId: piId,
      clientSecret: piId + '_secret_' + deterministicHex(piId, 16),
      amountCents: quote.totalBrlCents,
      currency: 'brl',
      rail: rail === 'stripe-pix' ? 'stripe-pix' : 'stripe-card',
      status: 'requires_confirmation',
      pixQrCodePayload: pixPayload,
      idempotencyKey,
      createdAt: new Date().toISOString()
    };

    const user = getActiveUser();
    const primaryWallet = (user.wallets && user.wallets[0]) || { address: '0x71C9...9A21', network: 'ethereum-mainnet' };

    const pendingOrder = {
      orderId: 'ord_' + deterministicHex('order:' + idempotencyKey, 10),
      status: 'PENDING',
      idempotencyKey,
      userId: user.id,
      collectorName: user.name,
      collectorEmail: user.email,
      walletAddress: primaryWallet.address,
      network: primaryWallet.network,
      paymentRail: intent.rail,
      stripePaymentIntentId: piId,
      txHash: null,
      items: quote.items.map(function snap(item) {
        return {
          nftId: item.nftId,
          code: item.code,
          editionId: item.editionId,
          editionLabel: item.editionLabel,
          standard: item.standard,
          title: item.title,
          quantity: item.quantity,
          lockedUnitPriceEth: item.unitPriceEth,
          lockedLineTotalEth: item.lineSubtotalEth
        };
      }),
      subtotalEth: quote.subtotalEth,
      discountEth: quote.discountEth,
      creatorRoyaltyEth: quote.creatorRoyaltyEth,
      networkFeeEth: quote.networkFeeEth,
      totalEth: quote.totalEth,
      totalBrlFormatted: quote.totalBrlFormatted,
      totalKrnFormatted: quote.totalKrnFormatted,
      krnRewardEarned: quote.krnRewardEarned,
      version: 1,
      createdAt: intent.createdAt,
      updatedAt: intent.createdAt
    };

    db.paymentIntents[piId] = intent;
    db.orders.unshift(pendingOrder);
    db.idempotencyRecords[idempotencyKey] = {
      key: idempotencyKey,
      fingerprint: fp,
      orderId: pendingOrder.orderId,
      paymentIntentId: piId
    };
    saveDb();

    return { intent, order: pendingOrder, replayed: false };
  }

  function settleOrderExecution(quote, paymentRail, idempotencyKey, simulateOutcome) {
    // Handles both Stripe Webhook settlement and Web3 Direct Settlement idempotently
    if (!db.activeUserId) {
      throw makeError('UNAUTHORIZED', 'Sessão expirada ou não autenticada.');
    }
    const fp = quoteFingerprint(quote, paymentRail);
    const existingRec = db.idempotencyRecords[idempotencyKey];

    let order = null;
    if (existingRec) {
      if (existingRec.fingerprint !== fp) {
        throw makeError('IDEMPOTENCY_CONFLICT', 'Conflito 409: Chave de idempotência reutilizada com payload divergente.');
      }
      order = db.orders.find(function m(o) { return o.orderId === existingRec.orderId; });
      if (order && (order.status === 'CONFIRMED' || order.status === 'REFUSED')) {
        return { order, replayed: true };
      }
    } else {
      const created = createStripePaymentIntent(quote, paymentRail, idempotencyKey);
      order = created.order;
    }

    const validation = validateQuoteSnapshot(quote);
    if (!validation.valid) {
      throw makeError('STALE_QUOTE', 'A cotação mudou antes da liquidação (' + validation.reason + '). Atualize a cotação.', validation.reason);
    }

    const nowIso = new Date().toISOString();
    if (simulateOutcome === 'REFUSED') {
      order.status = 'REFUSED';
      order.failureReason = paymentRail.startsWith('stripe')
        ? 'Stripe Webhook (payment_intent.payment_failed): Cartão recusado pelo emissor / saldo insuficiente.'
        : 'Assinatura rejeitada na carteira Web3.';
      order.version += 1;
      order.updatedAt = nowIso;
      if (order.stripePaymentIntentId && db.paymentIntents[order.stripePaymentIntentId]) {
        db.paymentIntents[order.stripePaymentIntentId].status = 'canceled';
      }
      saveDb();
      emitSocketEvent({
        eventId: uuid('evt_ord'),
        type: 'order.updated',
        orderId: order.orderId,
        userId: order.userId,
        status: 'REFUSED',
        txHash: null,
        failureReason: order.failureReason,
        version: order.version,
        emittedAt: nowIso
      });
      return { order, replayed: false };
    }

    // CONFIRMED SETTLEMENT:
    // 1. Deduct stock from catalog & bump NFT versions
    order.items.forEach(function deduct(item) {
      const nft = getNft(item.nftId);
      const ed = nft && nft.editions.find(function m(e) { return e.editionId === item.editionId; });
      if (nft && ed) {
        ed.availableSupply = Math.max(0, ed.availableSupply - item.quantity);
        nft.version += 1;
        nft.updatedAt = nowIso;
        nft.floorPriceEth = floorPrice(nft.editions);
      }
    });

    // 2. Remove ONLY purchased items & quantities from user's cart
    const cart = getOwnerCart();
    order.items.forEach(function cleanCart(purchased) {
      const idx = cart.findIndex(function m(c) { return c.nftId === purchased.nftId && c.editionId === purchased.editionId; });
      if (idx !== -1) {
        if (cart[idx].quantity <= purchased.quantity) {
          cart.splice(idx, 1);
        } else {
          cart[idx].quantity -= purchased.quantity;
        }
      }
    });

    // 3. Credit $KRN Curation Reward to buyer
    const user = db.users[order.userId];
    if (user) {
      user.krnBalanceUnits += 12500; // +125,00 KRN reward
    }

    order.status = 'CONFIRMED';
    order.txHash = '0x' + deterministicHex('tx:' + order.orderId + ':' + nowIso, 64);
    order.version += 1;
    order.updatedAt = nowIso;
    if (order.stripePaymentIntentId && db.paymentIntents[order.stripePaymentIntentId]) {
      db.paymentIntents[order.stripePaymentIntentId].status = 'succeeded';
    }
    saveDb();

    emitSocketEvent({
      eventId: uuid('evt_ord'),
      type: 'order.updated',
      orderId: order.orderId,
      userId: order.userId,
      status: 'CONFIRMED',
      txHash: order.txHash,
      version: order.version,
      emittedAt: nowIso
    });

    return { order, replayed: false };
  }

  function listUserOrders() {
    if (!db.activeUserId) return [];
    return db.orders.filter(function m(o) { return o.userId === db.activeUserId; });
  }

  function resetToDeterministicSeed() {
    db = createInitialDb();
    saveDb();
    return db;
  }

  global.KronosEngine = Object.freeze({
    parseEthToWei,
    formatWeiToEth,
    formatShortEth,
    weiToBrlCents,
    formatBrlCents,
    weiToKrn,
    get catalog() { return db.nfts; },
    get eventFeed() { return db.eventFeed; },
    getActiveUser,
    switchSession,
    getNft,
    toggleFavorite,
    mintArtifact,
    getOwnerCart,
    addToCart,
    updateCartQuantity,
    applyCoupon,
    buildCartQuote,
    acceptUpdatedCartQuote,
    validateQuoteSnapshot,
    applyNftUpdatedEvent,
    createStripePaymentIntent,
    settleOrderExecution,
    listUserOrders,
    resetToDeterministicSeed,
    subscribe: function subscribe(fn) {
      listeners.add(fn);
      return function unsubscribe() { listeners.delete(fn); };
    }
  });
})(globalThis);
