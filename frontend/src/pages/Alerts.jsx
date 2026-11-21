import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const REFRESH_INTERVAL = 30000;

function getAlert(item) {
  const { recommendation, stock } = item;
  if (recommendation.status === 'OUT_OF_STOCK') {
    return { severity: 'out', label: 'Out of stock', message: 'No units are currently available.' };
  }
  if (recommendation.status === 'LOW') {
    return { severity: 'low', label: 'Low stock', message: 'Stock is at or below the reorder point.' };
  }

  const coverage = stock.coverDays;
  const replenishmentWindow = stock.leadTimeDays + stock.safetyDays;
  if (Number.isFinite(coverage) && coverage <= replenishmentWindow) {
    return {
      severity: 'low',
      label: 'Stockout risk',
      message: `Projected to run out in ${coverage} days, within the ${replenishmentWindow}-day replenishment window.`,
    };
  }
  return null;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshAlerts = useCallback(async () => {
    try {
      const response = await api.get('/forecast/recommendations');
      setAlerts(response.data.map((item) => ({ ...item, alert: getAlert(item) })).filter((item) => item.alert));
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load inventory alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAlerts();
    const timer = window.setInterval(refreshAlerts, REFRESH_INTERVAL);
    return () => window.clearInterval(timer);
  }, [refreshAlerts]);

  const outOfStockCount = alerts.filter((item) => item.alert.severity === 'out').length;
  const lowStockCount = alerts.length - outOfStockCount;

  return (
    <div>
      <div className="toolbar">
        <span className="muted" aria-live="polite">
          {updatedAt ? `Live inventory check - updated ${updatedAt.toLocaleTimeString()}` : 'Checking inventory...'}
        </span>
        <span className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={refreshAlerts} disabled={loading}>
          Refresh alerts
        </button>
      </div>

      {error && <div className="card" role="alert">{error}</div>}

      <div className="card-row">
        <div className={`card stat ${outOfStockCount ? 'danger' : 'green'}`}>
          <div className="label">Out of stock</div>
          <div className="value">{outOfStockCount}</div>
          <div className="hint">Products with no available units</div>
        </div>
        <div className={`card stat ${lowStockCount ? 'amber' : 'green'}`}>
          <div className="label">Needs attention</div>
          <div className="value">{lowStockCount}</div>
          <div className="hint">Low stock or forecast to run out before replenishment</div>
        </div>
      </div>

      <div className="card">
        <h3>Inventory alerts</h3>
        {loading && !updatedAt ? (
          <p className="muted">Loading current stock and demand forecasts...</p>
        ) : alerts.length ? (
          <div className="alert-list" aria-live="polite">
            {alerts.map((item) => (
              <div className="alert-item" key={item.product._id}>
                <div>
                  <div className="alert-meta">
                    <span className={`badge ${item.alert.severity}`}>{item.alert.label}</span>
                    <strong>{item.product.name}</strong>
                    <span className="muted">{item.product.sku}</span>
                  </div>
                  <p className="muted">{item.alert.message}</p>
                  <div className="summary-chips">
                    <span className="chip">Stock: <strong>{item.stock.level}</strong> {item.product.unit}</span>
                    <span className="chip">Avg demand: <strong>{item.avgDailyDemand}</strong>/day</span>
                    <span className="chip">Suggested reorder: <strong>{item.recommendation.suggestedReorderQty}</strong></span>
                  </div>
                </div>
                <Link className="btn btn-ghost btn-sm" to={`/forecast?product=${item.product._id}`}>
                  View forecast
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No inventory risks detected. Stock levels are healthy against current demand.</p>
        )}
      </div>
    </div>
  );
}
