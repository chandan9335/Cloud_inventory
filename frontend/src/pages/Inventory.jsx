import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const EMPTY_PRODUCT = {
  sku: '', name: '', category: '', price: '', cost: '', unit: 'pcs',
  stockLevel: 0, reorderPoint: 5, leadTimeDays: 5, safetyDays: 3,
};

export default function Inventory() {
  const { can } = useAuth();
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [action, setAction] = useState(null); // { product, type }
  const [addProduct, setAddProduct] = useState(false);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const canWrite = can('admin', 'manager');

  const load = () => Promise.all([api.get('/inventory'), api.get('/inventory/movements?limit=50')]).then(([i, m]) => {
    setItems(i.data);
    setMovements(m.data);
  });

  useEffect(() => { load().catch((e) => alert(e.response?.data?.error || 'Load failed')); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const quantity = action.type === 'adjust' ? +qty : Math.abs(+qty);
    try {
      await api.post(`/inventory/${action.type === 'adjust' ? 'adjust' : 'restock'}`, { productId: action.product._id, quantity, note });
      setAction(null); setQty(''); setNote(''); setError('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed');
    }
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/products', {
        ...productForm,
        price: +productForm.price,
        cost: +productForm.cost,
        stockLevel: +productForm.stockLevel,
        reorderPoint: +productForm.reorderPoint,
        leadTimeDays: +productForm.leadTimeDays,
        safetyDays: +productForm.safetyDays,
      });
      setAddProduct(false);
      setProductForm(EMPTY_PRODUCT);
      load().catch((err) => alert(err.response?.data?.error || 'Inventory refresh failed'));
    } catch (err) {
      setError(err.response?.data?.error || 'Product creation failed');
    }
  };

  const setProductField = (field) => (e) => {
    setProductForm((current) => ({ ...current, [field]: e.target.value }));
  };

  const low = items.filter((p) => p.lowStock);
  const value = items.reduce((s, p) => s + p.stockValue, 0);

  return (
    <div>
      {canWrite && (
        <div className="toolbar">
          <div className="spacer" />
          <button className="btn btn-primary" onClick={() => { setProductForm(EMPTY_PRODUCT); setError(''); setAddProduct(true); }}>
            + Add Product
          </button>
        </div>
      )}
      <div className="card-row">
        <div className="card stat blue"><div className="label">Products Tracked</div><div className="value">{items.length}</div></div>
        <div className={`card stat ${low.length ? 'danger' : 'green'}`}><div className="label">Low / Out of Stock</div><div className="value">{low.length}</div><div className="hint">At or below reorder point</div></div>
        <div className="card stat green"><div className="label">Inventory Value</div><div className="value">₹{value.toLocaleString('en-IN')}</div><div className="hint">At cost</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div className="card">
          <h3>Stock levels · {low.length > 0 && <span className="badge low">⚠ {low.length} need attention</span>}</h3>
          <table>
            <thead>
              <tr><th>SKU</th><th>Product</th><th>Category</th><th>On Hand</th><th>Reorder Pt</th><th>Value</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p._id}>
                  <td className="muted">{p.sku}</td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.stockLevel} {p.unit}</td>
                  <td>{p.reorderPoint}</td>
                  <td>₹{p.stockValue}</td>
                  <td><span className={`badge ${p.lowStock ? 'low' : 'ok'}`}>{p.lowStock ? 'Low' : 'OK'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    {canWrite && (
                      <>
                        <button className="btn btn-sm btn-success" style={{ marginRight: 6 }} onClick={() => { setAction({ product: p, type: 'restock' }); setQty(''); setNote(''); setError(''); }}>Restock</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => { setAction({ product: p, type: 'adjust' }); setQty(''); setNote(''); setError(''); }}>Adjust</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ maxHeight: 560, overflowY: 'auto' }}>
          <h3>Stock movements</h3>
          {movements.map((m) => (
            <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 2px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <strong>{m.product?.name || '—'}</strong>
                <div className="muted">{m.note} · {new Date(m.date).toLocaleString()}</div>
              </div>
              <span className={`badge ${m.type === 'in' ? 'ok' : m.type === 'out' ? 'info' : 'low'}`}>
                {m.type === 'in' ? `+${m.quantity}` : m.type === 'out' ? m.quantity : (m.quantity > 0 ? `+${m.quantity}` : m.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {action && (
        <div className="modal-backdrop" onClick={() => setAction(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{action.type === 'restock' ? 'Restock' : 'Adjust'} · {action.product.name}</h3>
            <p className="muted">Current on hand: <strong>{action.product.stockLevel} {action.product.unit}</strong></p>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={submit}>
              <div className="field">
                <label>{action.type === 'restock' ? 'Quantity received' : 'Quantity (positive = add, negative = remove)'}</label>
                <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} required />
              </div>
              <div className="field">
                <label>Note</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={action.type === 'restock' ? 'e.g. PO #1042 from supplier' : 'e.g. damaged goods'} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setAction(null)}>Cancel</button>
                <button type="submit" className="btn btn-success">{action.type === 'restock' ? 'Receive stock' : 'Apply adjustment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addProduct && (
        <div className="modal-backdrop" onClick={() => setAddProduct(false)}>
          <div className="modal" style={{ width: 640, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3>Add product to inventory</h3>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={submitProduct}>
              <div className="form-grid">
                <div className="field"><label>SKU</label><input value={productForm.sku} onChange={setProductField('sku')} required /></div>
                <div className="field"><label>Name</label><input value={productForm.name} onChange={setProductField('name')} required /></div>
                <div className="field"><label>Category</label><input value={productForm.category} onChange={setProductField('category')} required /></div>
                <div className="field"><label>Unit</label><input value={productForm.unit} onChange={setProductField('unit')} required /></div>
                <div className="field"><label>Price (₹)</label><input type="number" min="0" step="0.01" value={productForm.price} onChange={setProductField('price')} required /></div>
                <div className="field"><label>Cost (₹)</label><input type="number" min="0" step="0.01" value={productForm.cost} onChange={setProductField('cost')} required /></div>
                <div className="field"><label>Opening stock</label><input type="number" min="0" step="1" value={productForm.stockLevel} onChange={setProductField('stockLevel')} required /></div>
                <div className="field"><label>Reorder point</label><input type="number" min="0" step="1" value={productForm.reorderPoint} onChange={setProductField('reorderPoint')} required /></div>
                <div className="field"><label>Lead time (days)</label><input type="number" min="0" step="1" value={productForm.leadTimeDays} onChange={setProductField('leadTimeDays')} required /></div>
                <div className="field"><label>Safety stock (days)</label><input type="number" min="0" step="1" value={productForm.safetyDays} onChange={setProductField('safetyDays')} required /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setAddProduct(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}