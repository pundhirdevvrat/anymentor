import { Link } from 'react-router-dom';

export default function AdminProducts() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Products</h1>
      </div>
      <div className="card">
        <p className="text-muted font-body">This module is fully implemented in the backend. Connect it to the API using the service layer in <code>src/services/api.js</code>.</p>
        <div className="mt-4 p-4 bg-cream rounded-lg border border-border">
          <p className="font-body text-sm text-navy font-semibold">API Endpoints available:</p>
          <p className="font-body text-xs text-muted mt-1">See <code>/api/docs</code> for full Swagger documentation</p>
        </div>
      </div>
    </div>
  );
}
