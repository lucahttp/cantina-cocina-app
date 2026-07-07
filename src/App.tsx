import { useEffect, useState } from 'react';
import { Cr3d3_comandasService } from './generated/services/Cr3d3_comandasService';
import { Cr3d3_ventasService } from './generated/services/Cr3d3_ventasService';
import type { Cr3d3_comandas } from './generated/models/Cr3d3_comandasModel';
import type { Cr3d3_ventas } from './generated/models/Cr3d3_ventasModel';
import './App.css';

function App() {
  const [comandas, setComandas] = useState<Cr3d3_comandas[]>([]);
  const [selectedComanda, setSelectedComanda] = useState<Cr3d3_comandas | null>(null);
  const [orderItems, setOrderItems] = useState<Cr3d3_ventas[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const fetchComandas = async () => {
    setRefreshing(true);
    try {
      const result = await Cr3d3_comandasService.getAll();
      if (result.success && result.data) {
        const active = result.data.filter(c => c.cr3d3_estadocomanda !== 100000004);
        setComandas(active.sort((a, b) => new Date(a.cr3d3_fechacomanda).getTime() - new Date(b.cr3d3_fechacomanda).getTime()));
      }
    } catch (e) {
      console.error("Error fetching comandas:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComandas();
    const interval = setInterval(fetchComandas, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectComanda = async (comanda: Cr3d3_comandas) => {
    setSelectedComanda(comanda);
    setLoadingItems(true);
    try {
      // Buscamos las ventas donde el Mediodeventa (lookup a comanda) sea el ID de la comanda
      const result = await Cr3d3_ventasService.getAll({
        // Simplificamos el filtro asumiendo que el service maneja OData o filtramos en cliente
        // Si el service soporta filter: `$filter=_cr3d3_mediodeventa_value eq ${comanda.cr3d3_comandaid}`
      });
      if (result.success && result.data) {
        const items = result.data.filter(v => v._cr3d3_mediodeventa_value === comanda.cr3d3_comandaid);
        setOrderItems(items);
      }
    } catch (e) {
      console.error("Error fetching items:", e);
    } finally {
      setLoadingItems(false);
    }
  };

  const markAsDelivered = async (id: string) => {
    try {
      await Cr3d3_comandasService.update(id, {
        cr3d3_estadocomanda: 100000004,
        peluca_entregado: true,
        peluca_fechaentregado: new Date().toISOString()
      });
      await fetchComandas();
      if (selectedComanda?.cr3d3_comandaid === id) setSelectedComanda(null);
    } catch (e) {
      alert("Error al marcar como entregado");
    }
  };

  if (loading) return <div className="center-screen">Cargando Pedidos...</div>;

  return (
    <div className="cocina-container">
      <header>
        <h1>🚚 Panel de Entregas</h1>
        <button className="btn-refresh" onClick={fetchComandas} disabled={refreshing}>
          {refreshing ? "Actualizando..." : "🔄 Refrescar"}
        </button>
      </header>

      <div className="main-layout">
        <div className="comanda-grid">
          {comandas.length === 0 ? (
            <div className="empty-state">No hay pedidos pendientes 🍻</div>
          ) : (
            comandas.map(comanda => (
              <div 
                key={comanda.cr3d3_comandaid} 
                className={`comanda-card state-${comanda.cr3d3_estadocomanda} ${selectedComanda?.cr3d3_comandaid === comanda.cr3d3_comandaid ? 'selected' : ''}`}
                onClick={() => handleSelectComanda(comanda)}
              >
                <div className="card-header">
                  <span className="pedido-num">{comanda.cr3d3_numerocomanda}</span>
                  <div className="badges">
                    <span className={`status-badge ${comanda.cr3d3_pagada ? 'paid' : 'unpaid'}`}>
                      {comanda.cr3d3_pagada ? '💰 PAGADO' : '⏳ PENDIENTE'}
                    </span>
                    <span className="status-badge">{comanda.cr3d3_estadocomandaname || 'S/E'}</span>
                  </div>
                </div>
                <div className="card-body">
                  <p className="alumno-name"><strong>👤 {comanda.cr3d3_nombrealumno || 'Anónimo'}</strong></p>
                  <p className="details">🕒 Inicio: {new Date(comanda.cr3d3_fechacomanda).toLocaleTimeString()}</p>
                  <p className="total">Total: ${comanda.cr3d3_total}</p>
                </div>
                <button 
                  className="btn-deliver" 
                  onClick={(e) => { e.stopPropagation(); markAsDelivered(comanda.cr3d3_comandaid); }}
                >
                  ✅ Marcar Entregado
                </button>
              </div>
            ))
          )}
        </div>

        {selectedComanda && (
          <div className="detail-panel">
            <div className="detail-header">
              <h2>Detalles Pedido {selectedComanda.cr3d3_numerocomanda}</h2>
              <button className="btn-close" onClick={() => setSelectedComanda(null)}>✕</button>
            </div>
            
            <div className="timeline">
              <div className="timeline-item">
                <span className="time">🕒 {new Date(selectedComanda.cr3d3_fechacomanda).toLocaleString()}</span>
                <span className="event">Pedido Recibido</span>
              </div>
              {selectedComanda.peluca_fechapago && (
                <div className="timeline-item">
                  <span className="time">🕒 {new Date(selectedComanda.peluca_fechapago).toLocaleString()}</span>
                  <span className="event">Pago Confirmado</span>
                </div>
              )}
            </div>

            <h3>🛒 Productos</h3>
            {loadingItems ? (
              <p>Cargando items...</p>
            ) : orderItems.length === 0 ? (
              <p>No se encontraron items para este pedido.</p>
            ) : (
              <ul className="items-list">
                {orderItems.map((item, idx) => (
                  <li key={idx} className="item-row">
                    <span>{item.cr3d3_venta1 || 'Producto'}</span>
                    <span><strong>${item.cr3d3_totaldeventa || 0}</strong></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
