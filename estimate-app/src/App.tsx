import { useState } from 'react';
import Layout, { type Page } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import PriceMaster from './pages/PriceMaster';
import EstimateList from './pages/EstimateList';
import EstimateForm from './pages/EstimateForm';
import EstimateDetail from './pages/EstimateDetail';
import { useAppStore } from './store';
import type { Estimate } from './types';

type View =
  | { type: 'dashboard' }
  | { type: 'customers' }
  | { type: 'price-master' }
  | { type: 'estimate-list' }
  | { type: 'estimate-new' }
  | { type: 'estimate-edit'; estimate: Estimate }
  | { type: 'estimate-detail'; estimate: Estimate };

function viewToPage(view: View): Page {
  switch (view.type) {
    case 'dashboard': return 'dashboard';
    case 'customers': return 'customers';
    case 'price-master': return 'price-master';
    case 'estimate-list': return 'estimate-list';
    case 'estimate-new':
    case 'estimate-edit': return 'estimate-new';
    case 'estimate-detail': return 'estimate-list';
  }
}

export default function App() {
  const store = useAppStore();
  const [view, setView] = useState<View>({ type: 'dashboard' });

  function navigate(page: Page) {
    switch (page) {
      case 'dashboard': setView({ type: 'dashboard' }); break;
      case 'customers': setView({ type: 'customers' }); break;
      case 'price-master': setView({ type: 'price-master' }); break;
      case 'estimate-list': setView({ type: 'estimate-list' }); break;
      case 'estimate-new': setView({ type: 'estimate-new' }); break;
    }
  }

  function renderContent() {
    switch (view.type) {
      case 'dashboard':
        return (
          <Dashboard
            store={store}
            onNavigate={(page) => navigate(page)}
          />
        );
      case 'customers':
        return <Customers store={store} />;
      case 'price-master':
        return <PriceMaster store={store} />;
      case 'estimate-list':
        return (
          <EstimateList
            store={store}
            onEdit={(e) => setView({ type: 'estimate-edit', estimate: e })}
            onView={(e) => setView({ type: 'estimate-detail', estimate: e })}
          />
        );
      case 'estimate-new':
        return (
          <EstimateForm
            store={store}
            editEstimate={null}
            onSave={() => setView({ type: 'estimate-list' })}
            onCancel={() => setView({ type: 'estimate-list' })}
          />
        );
      case 'estimate-edit':
        return (
          <EstimateForm
            store={store}
            editEstimate={view.estimate}
            onSave={() => setView({ type: 'estimate-list' })}
            onCancel={() => setView({ type: 'estimate-list' })}
          />
        );
      case 'estimate-detail':
        return (
          <EstimateDetail
            store={store}
            estimate={
              store.estimates.find((e) => e.id === view.estimate.id) ?? view.estimate
            }
            onBack={() => setView({ type: 'estimate-list' })}
            onEdit={(e) => setView({ type: 'estimate-edit', estimate: e })}
          />
        );
    }
  }

  return (
    <Layout currentPage={viewToPage(view)} onNavigate={navigate}>
      {renderContent()}
    </Layout>
  );
}
