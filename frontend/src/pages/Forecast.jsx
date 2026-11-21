import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

const REFRESH_INTERVAL = 30000;

export default function Forecast() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productId, setProductId] = useState('');
  const [horizon, setHorizon] = useState(14);
  const [fc, setFc] = useState(null);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recsError, setRecsError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    api.get('/products')
      .then((response) => {
        setProducts(response.data);
        const requestedProduct = searchParams.get('product');
        setProductId(response.data.some((product) => product._id === requestedProduct)
          ? requestedProduct
          : response.data[0]?._id || '');
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load products'))
      .finally(() => setProductsLoading(false));
  }, [searchParams]);

  const loadRecs = useCallback(async () => {
    try {
      const response = await api.get('/forecast/recommendations');
      setRecs(response.data);
      setRecsError('');
    } catch (err) {
      setRecsError(err.response?.data?.error || 'Failed to load reorder recommendations');
    }
  }, []);

  const loadForecast = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/forecast/${productId}`, { params: { horizon } });
      setFc(response.data);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err.response?.data?.error || 'Forecast failed');
    } finally {
      setLoading(false);
    }
  }, [productId, horizon]);

  useEffect(() => {
    loadRecs();
    const timer = window.setInterval(loadRecs, REFRESH_INTERVAL);
    return () => window.clearInterval(timer);
  }, [loadRecs]);

  useEffect(() => {
    loadForecast();
    const timer = window.setInterval(loadForecast, REFRESH_INTERVAL);
    return () => window.clearInterval(timer);
  }, [loadForecast]);

  if (productsLoading) return <div className="card">Loading products…</div>;
  if (!products.length) return <div className="card" role={error ? 'alert' : undefined}>{error || 'No products. Add products first.'}</div>;

  const { product } = fc || {};
  const chartData = fc
    ? [...fc.history, ...fc.forecast].map((point) => ({
        date: point.date,
        actual: point.predicted ? null : point.units,
        forecast: point.predicted ? point.units : null,
      }))
    : [];
  const statusBadge = (status) => ({ OK: 'ok', LOW: 'low', OUT_OF_STOCK: 'out' })[status] || 'info';

  return (
    <div>
      <div className="toolbar">
        <select value={productId} onChange={(event) => setProductId(event.target.value)}>
          {products.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select>
        <select value={horizon} onChange={(event) => setHorizon(+event.target.value)}>
          {[7, 14, 30].map((days) => <option key={days} value={days}>{days} day forecast</option>)}
        </select>
        <span className="muted" aria-live="polite">
          {updatedAt ? `Auto-refreshing every 30s · updated ${updatedAt.toLocaleTimeString()}` : 'Preparing live forecast…'}
        </span>
        <span className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={() => { loadForecast(); loadRecs(); }} disabled={loading}>
          ↻ Refresh now
        </button>
      </div>

      {error && <div className="card" role="alert">{error}</div>}
      {recsError && <div className="card" role="alert">{recsError}</div>}

      {fc && (
        <>
          <div className="card-row">
            <div className="card stat blue">
              <div className="label">Algorithm</div>
              <div className="value" style={{ fontSize: 18 }}>{fc.algorithm}</div>
              <div className="hint">{fc.model}{fc.r2 != null && ` · R² = ${fc.r2}`}</div>
            </div>
            <div className="card stat green">
              <div className="label">Avg Daily Demand</div>
              <div className="value">{fc.avgDailyDemand}</div>
              <div className="hint">Trend {fc.trend.growthPercent >= 0 ? '+' : ''}{fc.trend.growthPercent}% over horizon</div>
            </div>
            <div className="card stat amber">
              <div className="label">Forecast {horizon}d Demand</div>
              <div className="value">{fc.horizonDemand}</div>
              <div className="hint">Units expected over next {horizon} days</div>
            </div>
            <div className={`card stat ${fc.recommendation.status === 'OK' ? 'green' : 'danger'}`}>
              <div className="label">Recommendation</div>
              <div className="value" style={{ fontSize: 18 }}>{fc.recommendation.status.replace('_', ' ')}</div>
              <div className="hint">Reorder {fc.recommendation.suggestedReorderQty} {product?.unit || 'units'}</div>
            </div>
          </div>

          {product && (
            <div className="card forecast-chart-wrap">
              <h3>Historical demand vs forecast · {product.name} ({product.sku})</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid stroke="#26314a" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: '#8b96ad', fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#8b96ad', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1d2639', border: '1px solid #26314a', borderRadius: 10 }} />
                  <Legend />
                  <Bar
                    dataKey="actual"
                    name="Actual demand"
                    fill="#60a5fa"
                    stroke="#bfdbfe"
                    strokeWidth={1}
                    radius={[3, 3, 0, 0]}
                    activeBar={{ fill: '#93c5fd' }}
                    opacity={0.9}
                  />
                  <Line type="monotone" dataKey="forecast" name="Forecast (predicted)" stroke="#38d39f" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="summary-chips" style={{ marginTop: 12 }}>
                <span className="chip">Stock on hand: <strong>{fc.stock.level}</strong> {product.unit}</span>
                <span className="chip">Coverage: <strong>{fc.stock.coverDays == null || !isFinite(fc.stock.coverDays) ? '∞' : fc.stock.coverDays}</strong> days</span>
                <span className="chip">Reorder point: <strong>{fc.stock.reorderPoint}</strong></span>
                {fc.recommendation.nextReorderBy && <span className="chip">Projected out of stock: <strong className="muted">{fc.recommendation.nextReorderBy}</strong></span>}
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: 16 }}>
            <h3>Reorder recommendations — full catalogue</h3>
            <table>
              <thead>
                <tr><th>SKU</th><th>Product</th><th>Category</th><th>Stock</th><th>Avg Daily</th><th>Coverage</th><th>Status</th><th>Suggested Reorder</th><th>Model</th></tr>
              </thead>
              <tbody>
                {recs.map((item) => (
                  <tr key={item.product._id}>
                    <td className="muted">{item.product.sku}</td>
                    <td>{item.product.name}</td>
                    <td>{item.product.category}</td>
                    <td>{item.stock.level}</td>
                    <td>{item.avgDailyDemand}</td>
                    <td>{item.stock.coverDays == null || !isFinite(item.stock.coverDays) ? '∞' : item.stock.coverDays}d</td>
                    <td><span className={`badge ${statusBadge(item.recommendation.status)}`}>{item.recommendation.status.replace('_', ' ')}</span></td>
                    <td><strong>{item.recommendation.suggestedReorderQty}</strong></td>
                    <td className="muted">{item.algorithm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {loading && <div className="card">Updating forecast…</div>}
    </div>
  );
}
