/**
 * Apex.AI — Bybit Market Data API
 * =================================
 * Fetches real MNT/USDT OHLC data from Bybit's public V5 API.
 * No API key required. CORS-friendly for browser use.
 * 
 * Bybit is the primary exchange for MNT (Mantle) trading,
 * and this project already uses Bybit for the trading bot backend.
 */

export interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

const BYBIT_REST = 'https://api.bybit.com/v5/market';
const BYBIT_WS = 'wss://stream.bybit.com/v5/public/spot';

/**
 * Fetch historical OHLC kline data from Bybit REST API.
 * @param symbol Trading pair (e.g., 'MNTUSDT')
 * @param interval Candle interval: '1' = 1min, '5' = 5min, '60' = 1hr, 'D' = daily
 * @param limit Number of candles to fetch (max 200)
 */
export async function fetchKlines(
  symbol: string = 'MNTUSDT',
  interval: string = '1',
  limit: number = 50
): Promise<OHLC[]> {
  const url = `${BYBIT_REST}/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Bybit API error: ${response.status}`);
  }

  const json = await response.json();

  if (json.retCode !== 0) {
    throw new Error(`Bybit API error: ${json.retMsg}`);
  }

  // Bybit returns data in reverse chronological order (newest first)
  // Format: [timestamp, open, high, low, close, volume, turnover]
  const klines: OHLC[] = json.result.list.map((k: string[]) => ({
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    timestamp: parseInt(k[0]),
  }));

  // Reverse to chronological order (oldest first)
  return klines.reverse();
}

/**
 * Create a WebSocket connection to Bybit for real-time kline updates.
 * Calls `onCandle` with each new/updated candle.
 * Returns a cleanup function to close the socket.
 *
 * @param symbol Trading pair (e.g., 'MNTUSDT')
 * @param interval Candle interval (e.g., '1' for 1 minute)
 * @param onCandle Callback for each candle update
 * @param onError Optional error callback
 */
export function createKlineWebSocket(
  symbol: string = 'MNTUSDT',
  interval: string = '1',
  onCandle: (candle: OHLC, isClosed: boolean) => void,
  onError?: (error: Event) => void
): () => void {
  const ws = new WebSocket(BYBIT_WS);

  ws.onopen = () => {
    // Subscribe to kline topic
    ws.send(JSON.stringify({
      op: 'subscribe',
      args: [`kline.${interval}.${symbol}`],
    }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // Skip non-kline messages (e.g., subscription confirmations, pongs)
      if (!data.topic || !data.topic.startsWith('kline.')) return;

      const klineData = data.data;
      if (!klineData || !Array.isArray(klineData) || klineData.length === 0) return;

      const k = klineData[0];

      const candle: OHLC = {
        open: parseFloat(k.open),
        high: parseFloat(k.high),
        low: parseFloat(k.low),
        close: parseFloat(k.close),
        volume: parseFloat(k.volume),
        timestamp: parseInt(k.start),
      };

      // k.confirm is true when the candle is closed (final)
      onCandle(candle, k.confirm === true);
    } catch {
      // Ignore parse errors on ping/pong frames
    }
  };

  ws.onerror = (event) => {
    onError?.(event);
  };

  // Bybit requires ping every 20 seconds to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ op: 'ping' }));
    }
  }, 20000);

  // Return cleanup function
  return () => {
    clearInterval(pingInterval);
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  };
}
