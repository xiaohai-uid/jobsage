import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { JobSageApp } from './components/JobSageApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JobSageApp />
  </StrictMode>,
);