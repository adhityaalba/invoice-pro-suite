import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import InvoiceEditor from './pages/InvoiceEditor';
import PhoneEditor from './pages/PhoneEditor';
import Settings from './pages/Settings';
import Guests from './pages/Guests';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

// Force dark theme by default
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('dark');
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoice/new" element={<InvoiceEditor />} />
            <Route path="/invoice/:id" element={<InvoiceEditor />} />
            <Route path="/phone/new" element={<PhoneEditor />} />
            <Route path="/phone/:id" element={<PhoneEditor />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/guests" element={<Guests />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
