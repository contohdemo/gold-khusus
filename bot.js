// bot.js - Script Mandiri Node.js untuk XAU/USD (MA 3 & MA 20 + RR 1:2)
const fetch = require('node-fetch'); // Pastikan package node-fetch terpasang

// Konfigurasi Bot
const CONFIG = {
  SYMBOL: 'XAU/USD',
  INTERVAL: '1h', // Ubah timeframe jika perlu (misal: '5min', '15min', '1h')
  RISK_REWARD: 2, // RR 1:2
  SL_ATR_MULTIPLIER: 1.5, // Pengali ATR untuk Stop Loss
  API_KEY: process.env.TD_API_KEY, // Mengambil API Key dari Environment Variable
  TELEGRAM_TOKEN: process.env.TG_BOT_TOKEN, // Token Bot Telegram kamu
  TELEGRAM_CHAT_ID: process.env.TG_CHAT_ID  // Chat ID Telegram kamu
};

// Fungsi Kirim Notifikasi ke Telegram
async function sendTelegram(message) {
  if (!CONFIG.TELEGRAM_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
    console.log('Token/Chat ID Telegram belum diset, pesan dilewati.');
    return;
  }
  const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CONFIG.TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' })
    });
  } catch (err) {
    console.error('Gagal kirim Telegram:', err);
  }
}

// Fungsi Ambil Data Harga dari Twelve Data
async function fetchMarketData() {
  const url = `https://api.twelvedata.com/time_series?symbol=${CONFIG.SYMBOL}&interval=${CONFIG.INTERVAL}&outputsize=100&timezone=UTC&apikey=${CONFIG.API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status === 'error' || !data.values) {
    throw new Error(data.message || 'Gagal mengambil data market dari Twelve Data');
  }
  
  // Ubah format data dari API ke bentuk array candle (oldest to newest)
  return data.values.slice().reverse().map(v => ({
    time: v.datetime,
    o: +v.open,
    h: +v.high,
    l: +v.low,
    c: +v.close
  }));
}

// Perhitungan Simple Moving Average (SMA)
function calculateSMA(data, period) {
  return data.map((_, i, arr) => {
    if (i < period - 1) return NaN;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += arr[j].c;
    }
    return sum / period;
  });
}

// Perhitungan Average True Range (ATR) untuk Stop Loss
function calculateATR(candles, period = 14) {
  let atrArr = [];
  let prevClose = candles[0].c;
  
  candles.forEach((candle, i) => {
    const highLow = candle.h - candle.l;
    const highPrevClose = Math.abs(candle.h - prevClose);
    const lowPrevClose = Math.abs(candle.l - prevClose);
    const trueRange = Math.max(highLow, highPrevClose, lowPrevClose);
    
    if (i === 0) {
      atrArr.push(trueRange);
    } else {
      let currentATR = (atrArr[i - 1] * (period - 1) + trueRange) / period;
      atrArr.push(currentATR);
    }
    prevClose = candle.c;
  });
  return atrArr;
}

// Logika Strategi Crossover MA 3 & MA 20
function evaluateStrategy(candles) {
  const closes = candles.map(c => c.c);
  const ma3 = calculateSMA(candles, 3);
  const ma20 = calculateSMA(candles, 20);
  const atr = calculateATR(candles, 14);

  const i = candles.length - 2; // Cek candle terakhir yang sudah close (menghindari repaint)
  const currentPrice = candles[candles.length - 1].c;

  // Cek Crossover pada candle [i]
  const isGoldenCross = ma3[i - 1] <= ma20[i - 1] && ma3[i] > ma20[i];
  const isDeathCross = ma3[i - 1] >= ma20[i - 1] && ma3[i] < ma20[i];

  const currentATR = atr[i];

  if (isGoldenCross) {
    const entry = currentPrice;
    const sl = entry - (currentATR * CONFIG.SL_ATR_MULTIPLIER);
    const tp = entry + ((entry - sl) * CONFIG.RISK_REWARD);
    return {
      signal: 'BUY',
      reason: 'MA 3 memotong ke atas MA 20 (Golden Cross)',
      entry, sl, tp
    };
  } else if (isDeathCross) {
    const entry = currentPrice;
    const sl = entry + (currentATR * CONFIG.SL_ATR_MULTIPLIER);
    const tp = entry - ((sl - entry) * CONFIG.RISK_REWARD);
    return {
      signal: 'SELL',
      reason: 'MA 3 memotong ke bawah MA 20 (Death Cross)',
      entry, sl, tp
    };
  }

  return { signal: 'WAIT', reason: 'Tidak ada persilangan MA 3/20' };
}

// Fungsi Utama Bot yang Dijalankan Otomatis
async function runBot() {
  try {
    console.log('Memeriksa data market XAU/USD...');
    const candles = await fetchMarketData();
    const lastCandle = candles[candles.length - 1];
    
    console.log(`Harga Terakhir XAU/USD: ${lastCandle.c}`);

    const result = evaluateStrategy(candles);
    console.log(`Status Strategi: ${result.signal} — ${result.reason}`);

    // Jika terdeteksi sinyal BUY atau SELL, kirim ke Telegram
    if (result.signal !== 'WAIT') {
      const message = `🚨 *SINYAL ${result.signal} XAU/USD* (${CONFIG.INTERVAL})\n` +
                      `📌 *Alasan:* ${result.reason}\n` +
                      `💵 *Entry:* ${result.entry.toFixed(2)}\n` +
                      `🛡️ *Stop Loss (SL):* ${result.sl.toFixed(2)}\n` +
                      `🎯 *Take Profit (TP 1:2):* ${result.tp.toFixed(2)}`;
      
      await sendTelegram(message);
      console.log('Notifikasi sinyal berhasil dikirim ke Telegram!');
    }

    console.log('Pemeriksaan bot selesai.');
  } catch (error) {
    console.error('Error pada bot:', error.message);
  }
}

// Jalankan fungsi
runBot();
