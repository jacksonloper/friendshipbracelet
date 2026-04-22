import { useEffect, useState } from 'react';
import BraceletDesigner from './BraceletDesigner';
import KumihimoPage from './KumihimoPage';

type AppRoute = 'bracelet' | 'kumihimo';

function getRouteFromHash(): AppRoute {
  const route = window.location.hash.replace(/^#\/?/, '');
  return route === 'kumihimo' ? 'kumihimo' : 'bracelet';
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(getRouteFromHash);

  useEffect(() => {
    const handleHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div>
      <nav className="app-nav" aria-label="App pages">
        <a href="#/" className={route === 'bracelet' ? 'active' : ''}>Bracelet designer</a>
        <a href="#/kumihimo" className={route === 'kumihimo' ? 'active' : ''}>Kumihimo modeler</a>
      </nav>
      {route === 'kumihimo' ? <KumihimoPage /> : <BraceletDesigner />}
    </div>
  );
}
